"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * LINE Login Callback Handler (Backend-Powered)
 *
 * 新流程：
 * 1. 接收 LINE OAuth callback (code, state, code_verifier)
 * 2. 呼叫 Supabase Edge Function 交換 token 並建立 user
 * 3. 取得 Supabase session token
 * 4. 重定向回 app 並傳遞 session token
 */
export default function LineCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("處理中...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 取得 URL 參數
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const codeVerifier = searchParams.get("code_verifier");
        const error = searchParams.get("error");

        console.log("[LINE Callback] 收到參數:", {
          code: !!code,
          state: !!state,
          codeVerifier: !!codeVerifier,
          error,
        });

        // 檢查是否有錯誤
        if (error) {
          console.error("[LINE Callback] 授權錯誤:", error);
          window.location.replace(
            `oflow://auth?error=${encodeURIComponent(error)}`
          );
          return;
        }

        // 檢查必要參數
        if (!code || !state) {
          console.error("[LINE Callback] 缺少必要參數");
          window.location.replace("oflow://auth?error=missing_parameters");
          return;
        }

        // 檢查必要的環境變數
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseUrl) {
          console.error("[LINE Callback] NEXT_PUBLIC_SUPABASE_URL 未設定");
          setStatus("設定錯誤");
          window.location.replace(
            "oflow://auth?error=Configuration%20error%20-%20SUPABASE_URL%20not%20set"
          );
          return;
        }

        // 呼叫 Edge Function
        setStatus("正在驗證身份...");
        console.log("[LINE Callback] 呼叫 Edge Function...");
        console.log("[LINE Callback] Supabase URL:", supabaseUrl);

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auth-line-callback`;

        const response = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            state,
            code_verifier: codeVerifier,
            redirect_uri: window.location.origin + "/auth/line-callback",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Edge Function 呼叫失敗");
        }

        const result = await response.json();

        if (!result.success || !result.session) {
          throw new Error("未收到有效的 session");
        }

        console.log("[LINE Callback] 取得 session 成功");

        // 建立 deep link 並傳遞 session tokens
        setStatus("登入成功！正在跳轉...");
        const deepLink = `oflow://auth?access_token=${encodeURIComponent(
          result.session.access_token
        )}&refresh_token=${encodeURIComponent(result.session.refresh_token)}`;

        console.log("[LINE Callback] 重定向回 app");
        window.location.replace(deepLink);
      } catch (error) {
        console.error("[LINE Callback] 處理失敗:", error);
        setStatus("登入失敗");

        // 錯誤也要回傳給 app
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        window.location.replace(
          `oflow://auth?error=${encodeURIComponent(errorMessage)}`
        );
      }
    };

    handleCallback();
  }, [searchParams]);

  // 顯示載入畫面
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
