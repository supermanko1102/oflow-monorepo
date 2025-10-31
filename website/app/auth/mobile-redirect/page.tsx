"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * Universal Link Fallback 頁面內部組件
 * 使用 Suspense 包裹以符合 Next.js 要求
 */
function MobileRedirectContent() {
  const searchParams = useSearchParams();
  const [customSchemeUrl, setCustomSchemeUrl] = useState<string>("");

  useEffect(() => {
    // 建立 custom scheme URL 作為 fallback
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const fallbackUrl = `oflow://auth?${params.toString()}`;
    setCustomSchemeUrl(fallbackUrl);

    // 嘗試自動跳轉（可能在 Expo Go 或某些情況下有效）
    const timer = setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleOpenApp = () => {
    if (customSchemeUrl) {
      window.location.href = customSchemeUrl;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        {/* Logo/Icon */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl text-white font-bold">O</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            正在跳轉到 OFlow App...
          </h1>
          <p className="text-sm text-gray-600">
            如果沒有自動跳轉，請點擊下方按鈕
          </p>
        </div>

        {/* 自動跳轉提示 */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>

        {/* 手動開啟按鈕 */}
        <button
          onClick={handleOpenApp}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          手動開啟 OFlow App
        </button>

        {/* 說明文字 */}
        <div className="mt-6 space-y-4 text-sm text-gray-600">
          <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">
              💡 看到這個頁面？
            </h3>
            <p className="text-yellow-700">
              這表示 Universal Links
              可能尚未完全生效。這是正常的，通常需要等待：
            </p>
            <ul className="mt-2 ml-4 list-disc text-yellow-700 space-y-1">
              <li>首次安裝 App 後 iOS 下載配置（可能需要幾分鐘）</li>
              <li>或需要刪除並重新安裝 App</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">
              📱 還沒有安裝 OFlow App？
            </h3>
            <p className="text-blue-700">
              請先從 TestFlight 或 App Store 安裝 OFlow App。
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">🔧 疑難排解</h3>
            <ol className="ml-4 list-decimal text-gray-700 space-y-1">
              <li>確認已安裝最新版本的 OFlow App</li>
              <li>嘗試刪除並重新安裝 App</li>
              <li>重新啟動裝置</li>
              <li>如果問題持續，請聯絡客服</li>
            </ol>
          </div>
        </div>

        {/* 返回首頁連結 */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Universal Link Fallback 頁面
 *
 * 當 Universal Link 尚未生效或配置未完成時，iOS 會在瀏覽器中開啟此頁面。
 * 此頁面提供手動開啟 App 的選項和故障排除資訊。
 */
export default function MobileRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      }
    >
      <MobileRedirectContent />
    </Suspense>
  );
}
