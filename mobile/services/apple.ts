// services/apple.ts
// Apple 登入服務（使用 Native SDK）

import * as AppleAuthentication from "expo-apple-authentication";

export interface AppleSession {
  access_token: string;
  refresh_token: string;
}

/**
 * Apple 登入
 * 使用 expo-apple-authentication (Native)
 */
export const initiateAppleLogin = async (): Promise<AppleSession> => {
  try {
    console.log("[Apple Auth] 開始 Apple Sign In...");

    // 使用 Native Apple Authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log("[Apple Auth] Apple credential obtained");

    // 調用後端 Edge Function 驗證並創建 session
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

    // Supabase 可能在錯誤時回傳純文字（例如 Invalid API key），避免 JSON 解析失敗
    const rawBody = await response.text();
    let data: any = null;

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch (parseError) {
        console.warn(
          "[Apple Auth] 無法將回應解析為 JSON，回傳原始文字:",
          rawBody
        );
      }
    }

    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.message ||
        rawBody ||
        `Apple 登入失敗 (${response.status})`;
      throw new Error(errorMessage);
    }

    if (!data || !data.session) {
      throw new Error(
        "Invalid response from auth-apple-callback: missing session data"
      );
    }

    // 後端返回的格式是 { session: { access_token, refresh_token }, user, teams }
    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error(
        "Invalid response from auth-apple-callback: missing session tokens"
      );
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      console.log("[Apple Auth] 使用者取消登入");
      throw new Error("使用者取消登入");
    }
    console.error("[Apple Auth] 登入失敗:", error);
    throw error;
  }
};

/**
 * 檢查 Apple 登入是否可用
 */
export const isAppleAuthenticationAvailable = async (): Promise<boolean> => {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};
