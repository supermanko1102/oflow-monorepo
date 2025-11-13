import * as AppleAuthentication from "expo-apple-authentication";

// Supabase Session 介面（從 backend 回傳）
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
}

/**
 * 啟動 Apple Sign In 流程
 * 使用 expo-apple-authentication 進行身份驗證
 *
 * @returns SupabaseSession - 包含 access_token 和 refresh_token
 * @throws Error - 當登入失敗或取消時
 */
export const initiateAppleLogin = async (): Promise<SupabaseSession> => {
  try {
    console.log("[Apple Login] 開始 Apple Sign In 流程...");

    // 1. 檢查 Apple Authentication 是否可用（iOS 13+）
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Apple Sign In 在此裝置上不可用");
    }

    // 2. 啟動 Apple Sign In
    console.log("[Apple Login] 啟動 Apple 身份驗證...");
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log("[Apple Login] Apple 身份驗證成功，取得 credential");

    // 3. 呼叫 backend Edge Function
    console.log("[Apple Login] 呼叫 backend 進行 Token 驗證...");
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-apple-callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: credential.user, // Apple User ID
          fullName: credential.fullName, // 只在第一次登入時提供
          email: credential.email, // 只在第一次登入時提供
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Apple Login] Backend 回應錯誤:", errorText);
      throw new Error(`Backend 錯誤: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 4. 檢查回應
    if (!data.success) {
      throw new Error(data.error || "Apple 登入失敗");
    }

    console.log("[Apple Login] Session tokens 取得成功");

    return data.session;
  } catch (error: any) {
    console.error("[Apple Login] 錯誤:", error);

    // 處理特定錯誤
    if (error.code === "ERR_CANCELED") {
      throw new Error("使用者取消登入");
    } else if (error.code === "ERR_INVALID_RESPONSE") {
      throw new Error("Apple 回應無效");
    } else if (error.code === "ERR_REQUEST_FAILED") {
      throw new Error("無法連接到 Apple 服務");
    }

    throw error;
  }
};

/**
 * 檢查 Apple Authentication 是否可用
 *
 * @returns boolean - 是否支援 Apple Sign In
 */
export const isAppleAuthAvailable = async (): Promise<boolean> => {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error("[Apple Login] 檢查可用性失敗:", error);
    return false;
  }
};
