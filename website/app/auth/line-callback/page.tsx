"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * LINE Login Callback Handler
 * 
 * 此頁面的唯一職責：接收 LINE OAuth callback 並立即重定向回 app
 * 不顯示任何 UI，讓 WebBrowser.openAuthSessionAsync() 自動捕獲返回值
 */
export default function LineCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 取得 URL 參數
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[LINE Callback] 收到參數:", { code: !!code, state: !!state, error });

    // 檢查是否有錯誤
    if (error) {
      console.error("[LINE Callback] 授權錯誤:", error);
      // 即使有錯誤也要跳回 app，讓 app 處理錯誤
      window.location.replace(`oflow://?error=${encodeURIComponent(error)}`);
      return;
    }

    // 檢查必要參數
    if (!code || !state) {
      console.error("[LINE Callback] 缺少必要參數");
      window.location.replace("oflow://?error=missing_parameters");
      return;
    }

    // 立即重定向回 app（使用 replace 避免留下歷史記錄）
    const deepLink = `oflow://?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    console.log("[LINE Callback] 立即重定向:", deepLink);
    window.location.replace(deepLink);
  }, [searchParams]);

  // 顯示極簡載入畫面（通常用戶不會看到，因為會立即跳轉）
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
        <p className="text-gray-600">正在跳轉回 App...</p>
      </div>
    </div>
  );
}
