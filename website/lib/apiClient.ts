"use client";

import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";

enum ApiErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  OPERATION_FAILED = "OPERATION_FAILED",
  SERVER_ERROR = "SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  isNetworkError(): boolean {
    return (
      this.code === ApiErrorCode.NETWORK_ERROR ||
      this.code === ApiErrorCode.TIMEOUT
    );
  }

  isServerError(): boolean {
    return (
      this.statusCode >= 500 ||
      this.code === ApiErrorCode.SERVER_ERROR ||
      this.code === ApiErrorCode.SERVICE_UNAVAILABLE
    );
  }
}

function statusCodeToErrorCode(statusCode: number): ApiErrorCode {
  if (statusCode === 401) return ApiErrorCode.UNAUTHORIZED;
  if (statusCode === 403) return ApiErrorCode.FORBIDDEN;
  if (statusCode === 404) return ApiErrorCode.NOT_FOUND;
  if (statusCode === 409) return ApiErrorCode.ALREADY_EXISTS;
  if (statusCode === 422) return ApiErrorCode.VALIDATION_ERROR;
  if (statusCode >= 500) return ApiErrorCode.SERVER_ERROR;
  if (statusCode >= 400) return ApiErrorCode.INVALID_PARAMETERS;
  return ApiErrorCode.UNKNOWN_ERROR;
}

function createApiError(
  error: unknown,
  defaultMessage = "發生未知錯誤"
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (
    error instanceof TypeError &&
    error.message === "Network request failed"
  ) {
    return new ApiError(
      ApiErrorCode.NETWORK_ERROR,
      0,
      "無法連線到伺服器，請檢查網路連線"
    );
  }

  if (error instanceof Error && error.message.includes("timeout")) {
    return new ApiError(ApiErrorCode.TIMEOUT, 0, "請求逾時，請稍後再試");
  }

  if (error && typeof error === "object" && "status" in error) {
    const responseError = error as { status?: number; message?: string };
    const statusCode = responseError.status ?? 0;
    const errorCode = statusCodeToErrorCode(statusCode);
    const message = responseError.message || defaultMessage;
    return new ApiError(errorCode, statusCode, message);
  }

  if (error instanceof Error) {
    return new ApiError(
      ApiErrorCode.UNKNOWN_ERROR,
      0,
      error.message || defaultMessage
    );
  }

  return new ApiError(ApiErrorCode.UNKNOWN_ERROR, 0, defaultMessage);
}

/**
 * 與 mobile app 共用邏輯的 API Client
 * 透過 Supabase Edge Function + JWT 驗證
 */
export class ApiClient {
  constructor(private baseUrl: string) {}

  async call<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    action: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    try {
      const accessToken = await this.getAccessToken();
      const url = this.buildUrl(action, params);

      const response = await this.fetchWithTimeout(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // 部分 Edge Function 會回傳空 body（204），此時直接回傳 undefined
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      if ("success" in data && data.success === false) {
        throw new ApiError(
          ApiErrorCode.BUSINESS_LOGIC_ERROR,
          response.status,
          data.error || data.message || "API 呼叫失敗"
        );
      }

      return data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

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

  private buildUrl(action: string, params?: Record<string, string>): string {
    const url = new URL(this.baseUrl);
    url.searchParams.set("action", action);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(ApiErrorCode.TIMEOUT, 0, "請求逾時，請稍後再試");
      }

      throw error;
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    const errorCode = statusCodeToErrorCode(statusCode);

    let errorMessage = response.statusText;

    if (statusCode === 401) {
      await handleUnauthorizedOnce();
    }

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        // fallback to statusText
      }
    }

    throw new ApiError(errorCode, statusCode, errorMessage);
  }

  private handleError(error: unknown): never {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof TypeError &&
      error.message === "Network request failed"
    ) {
      throw new ApiError(
        ApiErrorCode.NETWORK_ERROR,
        0,
        "無法連線到伺服器，請檢查網路連線或聯絡管理員"
      );
    }

    throw createApiError(error, "API 請求失敗");
  }
}

let handlingUnauthorized = false;
async function handleUnauthorizedOnce() {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      queryClient.clear();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  } finally {
    handlingUnauthorized = false;
  }
}
