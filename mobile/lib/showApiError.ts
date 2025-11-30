import { Alert } from "react-native";
import { ApiError, createApiError } from "@/types/api";

/**
 * 將 API 錯誤轉為使用者友善的 Alert
 */
export function showApiError(error: unknown, fallbackMessage?: string) {
  const apiError = error instanceof ApiError ? error : createApiError(error);
  const message = apiError.toUserMessage() || fallbackMessage || "操作失敗，請稍後再試";
  Alert.alert("發生錯誤", message);
}
