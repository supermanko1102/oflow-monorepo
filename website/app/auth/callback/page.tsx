"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * Universal Link Callback Handler
 *
 * 這個頁面會被 iOS Universal Links 開啟（在 App 內）
 * 負責接收 session tokens 並觸發 App 的 deep link listener
 *
 * 流程：
 * 1. LINE callback 重定向到這裡（Universal Link）
 * 2. 在 App 內開啟（因為 Universal Link）
 * 3. 立即 redirect 到 custom URL scheme，觸發 App 的 listener
 */

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 取得所有 URL 參數
    const params = new URLSearchParams();

    // 複製所有參數到新的 URL
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // 構建 custom URL scheme deep link
    const deepLink = `oflow://auth?${params.toString()}`;

    console.log("[Universal Link] 重定向到:", deepLink);

    // 使用 window.location.href 在 App 內觸發 deep link
    // 因為這個頁面是在 App WebView 內執行，所以可以正常工作
    window.location.href = deepLink;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
        <p className="text-gray-600">正在跳轉...</p>
      </div>
    </div>
  );
}

export default function UniversalLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
