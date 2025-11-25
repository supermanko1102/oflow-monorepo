import { supabase } from "@/lib/supabase";
import { ApiError, ApiErrorCode } from "@/types/api";

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`;

export async function deleteAccount(): Promise<void> {
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

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || (data && data.success === false)) {
    throw new ApiError(
      ApiErrorCode.UNKNOWN_ERROR,
      response.status,
      data?.error || data?.message || "刪除帳號失敗"
    );
  }
}
