/**
 * API 相關類型定義
 *
 * 統一的 API 回應格式、錯誤類型和錯誤代碼
 */

/**
 * 統一的 API 回應格式
 * 所有 Edge Function 都應該返回這個格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * API 錯誤代碼列舉
 */
export enum ApiErrorCode {
  // 網路相關錯誤
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // 認證相關錯誤
  UNAUTHORIZED = "UNAUTHORIZED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // 權限相關錯誤
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // 資源相關錯誤
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // 驗證相關錯誤
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",

  // 業務邏輯錯誤
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  OPERATION_FAILED = "OPERATION_FAILED",

  // 伺服器錯誤
  SERVER_ERROR = "SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // 未知錯誤
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * API 錯誤類別
 * 自訂錯誤類別，包含更多上下文資訊
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";

    // 確保 stack trace 正確
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * 判斷是否為網路錯誤
   */
  isNetworkError(): boolean {
    return (
      this.code === ApiErrorCode.NETWORK_ERROR ||
      this.code === ApiErrorCode.TIMEOUT
    );
  }

  /**
   * 判斷是否為認證錯誤
   */
  isAuthError(): boolean {
    return (
      this.code === ApiErrorCode.UNAUTHORIZED ||
      this.code === ApiErrorCode.SESSION_EXPIRED ||
      this.code === ApiErrorCode.INVALID_TOKEN
    );
  }

  /**
   * 判斷是否為權限錯誤
   */
  isPermissionError(): boolean {
    return (
      this.code === ApiErrorCode.FORBIDDEN ||
      this.code === ApiErrorCode.INSUFFICIENT_PERMISSIONS
    );
  }

  /**
   * 判斷是否為伺服器錯誤
   */
  isServerError(): boolean {
    return (
      this.statusCode >= 500 ||
      this.code === ApiErrorCode.SERVER_ERROR ||
      this.code === ApiErrorCode.SERVICE_UNAVAILABLE
    );
  }

  /**
   * 轉換為使用者友善的錯誤訊息
   */
  toUserMessage(): string {
    if (this.isNetworkError()) {
      return "網路連線有問題，請檢查您的網路狀態";
    }

    if (this.isAuthError()) {
      return "登入已過期，請重新登入";
    }

    if (this.isPermissionError()) {
      return "您沒有權限執行此操作";
    }

    if (this.isServerError()) {
      return "伺服器暫時無法回應，請稍後再試";
    }

    // 返回原始錯誤訊息
    return this.message || "發生未知錯誤，請稍後再試";
  }
}

/**
 * HTTP 狀態碼轉換為錯誤代碼
 */
export function statusCodeToErrorCode(statusCode: number): ApiErrorCode {
  if (statusCode === 401) return ApiErrorCode.UNAUTHORIZED;
  if (statusCode === 403) return ApiErrorCode.FORBIDDEN;
  if (statusCode === 404) return ApiErrorCode.NOT_FOUND;
  if (statusCode === 409) return ApiErrorCode.ALREADY_EXISTS;
  if (statusCode === 422) return ApiErrorCode.VALIDATION_ERROR;
  if (statusCode >= 500) return ApiErrorCode.SERVER_ERROR;
  if (statusCode >= 400) return ApiErrorCode.INVALID_PARAMETERS;
  return ApiErrorCode.UNKNOWN_ERROR;
}

/**
 * 從錯誤物件建立 ApiError
 */
export function createApiError(
  error: unknown,
  defaultMessage = "發生未知錯誤"
): ApiError {
  // 如果已經是 ApiError，直接返回
  if (error instanceof ApiError) {
    return error;
  }

  // Network request failed
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

  // Fetch timeout
  if (error instanceof Error && error.message.includes("timeout")) {
    return new ApiError(ApiErrorCode.TIMEOUT, 0, "請求逾時，請稍後再試");
  }

  // Response error
  if (error && typeof error === "object" && "status" in error) {
    const statusCode = (error as any).status as number;
    const errorCode = statusCodeToErrorCode(statusCode);
    const message = (error as any).message || defaultMessage;

    return new ApiError(errorCode, statusCode, message);
  }

  // Generic Error
  if (error instanceof Error) {
    return new ApiError(
      ApiErrorCode.UNKNOWN_ERROR,
      0,
      error.message || defaultMessage
    );
  }

  // Unknown error type
  return new ApiError(ApiErrorCode.UNKNOWN_ERROR, 0, defaultMessage);
}
