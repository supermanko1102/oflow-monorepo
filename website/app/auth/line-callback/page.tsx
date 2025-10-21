"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LineCallbackPage() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 取得 URL 參數
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // 檢查是否有錯誤
    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    // 檢查必要參數
    if (!code || !state) {
      setError("缺少必要參數（code 或 state）");
      return;
    }

    // 構建 deep link URL
    const deepLink = `oflow://auth/callback?code=${encodeURIComponent(
      code
    )}&state=${encodeURIComponent(state)}`;

    console.log("[LINE Callback] Deep link:", deepLink);

    // 倒數計時器
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 自動嘗試跳轉
          window.location.href = deepLink;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  // 手動跳轉
  const handleManualRedirect = () => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && state) {
      const deepLink = `oflow://auth/callback?code=${encodeURIComponent(
        code
      )}&state=${encodeURIComponent(state)}`;
      window.location.href = deepLink;
    }
  };

  // 錯誤狀態
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
            授權失敗
          </h1>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <button
            onClick={() => window.close()}
            className="w-full rounded-lg bg-gray-600 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700"
          >
            關閉視窗
          </button>
        </div>
      </div>
    );
  }

  // 成功狀態
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {/* LINE Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
            <svg
              className="h-10 w-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.37 4.75 3.5 6.34v4.66l4.22-2.32C10.44 18.89 11.21 19 12 19c5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
            </svg>
          </div>
        </div>

        {/* 標題 */}
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          LINE 登入成功！
        </h1>
        <p className="mb-6 text-center text-gray-600">
          正在跳轉回 OFlow App...
        </p>

        {/* 倒數計時 */}
        {countdown > 0 && (
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl font-bold text-green-600">
              {countdown}
            </div>
            <div className="text-sm text-gray-500">秒後自動跳轉</div>
          </div>
        )}

        {/* 載入動畫 */}
        <div className="mb-6 flex justify-center">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all duration-1000"
              style={{
                width: `${((3 - countdown) / 3) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 手動跳轉按鈕 */}
        <button
          onClick={handleManualRedirect}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700"
        >
          點擊這裡立即跳轉
        </button>

        {/* 提示文字 */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-gray-700">
            <strong>提示：</strong>
            如果沒有自動跳轉，請點擊上方按鈕，或確認已安裝 OFlow App。
          </p>
        </div>
      </div>
    </div>
  );
}
