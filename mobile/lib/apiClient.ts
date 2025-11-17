/**
 * 統一的 API Client
 *
 * 封裝所有 HTTP 請求邏輯，提供統一的錯誤處理和認證管理
 * 消除 service 層的重複程式碼
 */

import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import {
  ApiError,
  ApiErrorCode,
  createApiError,
  statusCodeToErrorCode,
} from "@/types/api";

/**
 * API Client 類別
 *
 * 使用方式：
 * ```typescript
 * const teamApi = new ApiClient('https://api.example.com/teams');
 * const data = await teamApi.call<ResponseType>('GET', 'list');
 * ```
 */
export class ApiClient {
  /**
   * @param baseUrl - Edge Function 的基礎 URL
   */
  constructor(private baseUrl: string) {}

  /**
   * 執行 API 請求
   *
   * @param method - HTTP 方法
   * @param action - API action（會作為 query parameter）
   * @param params - Query parameters
   * @param body - Request body（用於 POST/PUT）
   * @returns API 回應資料
   * @throws {ApiError} 當請求失敗時
   */
  async call<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    action: string,
    params?: Record<string, string>,
    body?: any
  ): Promise<T> {
    try {
      // 1. 取得 access token
      const accessToken = await this.getAccessToken();

      // 2. 建立 URL 並加入 query parameters
      const url = this.buildUrl(action, params);

      // 3. 發送請求
      const response = await this.fetchWithTimeout(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // 4. 檢查 HTTP 狀態
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // 5. 解析回應
      const data = await response.json();

      // 6. 檢查業務邏輯錯誤
      if ("success" in data && !data.success) {
        throw new ApiError(
          ApiErrorCode.BUSINESS_LOGIC_ERROR,
          response.status,
          data.error || data.message || "API 呼叫失敗"
        );
      }

      return data as T;
    } catch (error) {
      // 統一錯誤處理
      throw this.handleError(error);
    }
  }

  /**
   * 取得當前使用者的 access token
   * @private
   */
  private async getAccessToken(): Promise<string> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new ApiError(
        ApiErrorCode.UNAUTHORIZED,
        401,
        "未登入或 session 已過期"
      );
    }

    return session.access_token;
  }

  /**
   * 建立完整的 API URL
   * @private
   */
  private buildUrl(action: string, params?: Record<string, string>): string {
    const url = new URL(this.baseUrl);

    // 加入 action
    url.searchParams.set("action", action);

    // 加入其他 parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    return url.toString();
  }

  /**
   * Fetch with timeout
   * 預設 30 秒逾時
   * @private
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // 檢查是否為 timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(ApiErrorCode.TIMEOUT, 0, "請求逾時，請稍後再試");
      }

      throw error;
    }
  }

  /**
   * 處理 HTTP 錯誤回應
   * @private
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    const errorCode = statusCodeToErrorCode(statusCode);

    let errorMessage = response.statusText;

    // 當 401（未授權）時，執行一次性的登出與狀態重置
    if (statusCode === 401) {
      await handleUnauthorizedOnce();
    }

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // 無法解析 JSON，使用預設錯誤訊息
      try {
        errorMessage = await response.text();
      } catch {
        // 無法讀取回應，使用 statusText
      }
    }

    throw new ApiError(errorCode, statusCode, errorMessage);
  }

  /**
   * 統一錯誤處理
   * @private
   */
  private handleError(error: unknown): never {
    // 如果已經是 ApiError，直接 throw
    if (error instanceof ApiError) {
      console.error("[API Client] ApiError:", {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      throw error;
    }

    // Network request failed
    if (
      error instanceof TypeError &&
      error.message === "Network request failed"
    ) {
      const apiError = new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        "無法連線到伺服器，請檢查網路連線或聯絡管理員"
      );

      console.error("[API Client] Network Error:", {
        message: apiError.message,
        possibleReasons: [
          "1. Edge Function 尚未部署",
          "2. Supabase URL 設定錯誤",
          "3. 網路連線問題",
          "4. CORS 設定問題",
        ],
      });

      throw apiError;
    }

    // 其他錯誤轉換為 ApiError
    const apiError = createApiError(error, "API 請求失敗");
    console.error("[API Client] Unknown Error:", {
      code: apiError.code,
      message: apiError.message,
      originalError: error,
    });

    throw apiError;
  }
}

// 確保在 401 風暴時只處理一次，避免重複 signOut/清 cache
let handlingUnauthorized = false;
async function handleUnauthorizedOnce() {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    // 重置本地認證狀態，讓版面導回登入頁
    useAuthStore.setState({
      status: AuthStatus.Unauthenticated,
      currentTeamId: null,
    });
    // 撤銷目前 session（也會讓 refresh token 失效）
    try {
      await supabase.auth.signOut();
    } catch {}
    // 清除快取避免殘留舊資料
    try {
      queryClient.clear();
    } catch {}
  } finally {
    handlingUnauthorized = false;
  }
}

/**
 * 建立一個帶有 retry 機制的 API Client
 *
 * @param baseUrl - Edge Function URL
 * @param maxRetries - 最大重試次數
 * @param retryDelay - 重試延遲（毫秒）
 */
export class RetryableApiClient extends ApiClient {
  constructor(
    baseUrl: string,
    private maxRetries: number = 2,
    private retryDelay: number = 1000
  ) {
    super(baseUrl);
  }

  async call<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    action: string,
    params?: Record<string, string>,
    body?: any
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await super.call<T>(method, action, params, body);
      } catch (error) {
        lastError = error as Error;

        // 如果是 ApiError 且為網路錯誤或伺服器錯誤，進行重試
        if (error instanceof ApiError) {
          const shouldRetry = error.isNetworkError() || error.isServerError();

          if (shouldRetry && attempt < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt); // 指數退避
            console.warn(
              `[Retryable API Client] Retry ${attempt + 1}/${
                this.maxRetries
              } after ${delay}ms`,
              { error: error.message }
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // 不應重試或已達最大重試次數
        throw error;
      }
    }

    throw lastError;
  }
}
