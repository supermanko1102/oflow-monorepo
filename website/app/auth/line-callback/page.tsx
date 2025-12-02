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
          // 使用 Universal Link 而非 URL Scheme
          window.location.replace(
            `https://oflow-website.vercel.app/auth/callback?error=${encodeURIComponent(error)}`
          );
          return;
        }

        // 檢查必要參數
        if (!code || !state) {
          console.error("[LINE Callback] 缺少必要參數");
          // 使用 Universal Link 而非 URL Scheme
          window.location.replace(
            "https://oflow-website.vercel.app/auth/callback?error=missing_parameters"
          );
          return;
        }

        // 檢查必要的環境變數
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseUrl) {
          console.error("[LINE Callback] NEXT_PUBLIC_SUPABASE_URL 未設定");
          setStatus("設定錯誤");
          // 使用 Universal Link 而非 URL Scheme
          window.location.replace(
            "https://oflow-website.vercel.app/auth/callback?error=Configuration%20error%20-%20SUPABASE_URL%20not%20set"
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
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
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
        console.log("[LINE Callback] 團隊數:", result.teams?.length || 0);

        // 建立 Universal Link 並傳遞 session tokens 和團隊資料
        // 先嘗試直接以 URL Scheme 打開 App，若失敗再 fallback 到 https
        setStatus("登入成功！正在跳轉...");
        const teamsJson = JSON.stringify(result.teams || []);
        const fragmentParams = new URLSearchParams({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
          teams: teamsJson,
          state: state || "",
        }).toString();

        const schemeLink = `oflow://auth?${fragmentParams}`;
        const fallbackUniversalLink = `https://oflow-website.vercel.app/auth/callback#${fragmentParams}`;

        console.log("[LINE Callback] 優先透過 URL Scheme 回到 app");
        window.location.href = schemeLink;

        // 無論有無開啟 app，都在 1 秒後跳到 https fallback，以便關閉授權 session/tab
        setTimeout(() => {
          console.log("[LINE Callback] 強制導向 https fallback 以關閉授權視窗");
          window.location.replace(fallbackUniversalLink);
        }, 1000);
      } catch (error) {
        console.error("[LINE Callback] 處理失敗:", error);
        setStatus("登入失敗");

        // 錯誤也要回傳給 app (使用 Universal Link)
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        window.location.replace(
          `https://oflow-website.vercel.app/auth/callback?error=${encodeURIComponent(errorMessage)}`
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
