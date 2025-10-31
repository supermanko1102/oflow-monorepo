import { Metadata } from "next";

export const metadata: Metadata = {
  title: "下載 OFlow App",
  description: "下載 OFlow 智慧訂單中心，讓 AI 幫你自動處理訂單",
};

/**
 * App 下載頁面
 *
 * 當用戶透過 Universal Link 訪問但 app 未安裝時，
 * 會被重定向到此頁面
 */
export default function DownloadPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-6 py-12">
      <div className="w-full max-w-md text-center">
        {/* Logo / Icon */}
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
            <svg
              className="h-12 w-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-4xl font-black text-gray-900">OFlow</h1>
          <p className="text-lg font-semibold text-gray-600">智慧訂單中心</p>
        </div>

        {/* Description */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            下載 OFlow App
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            讓 AI 幫你自動處理訂單，提升工作效率
          </p>

          {/* Features */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-3 w-3 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  自動讀取 LINE 對話
                </p>
                <p className="text-xs text-gray-500">
                  AI 自動識別訂單資訊並建立訂單
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-3 w-3 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  智慧提醒功能
                </p>
                <p className="text-xs text-gray-500">提前提醒，讓你不漏單</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-3 w-3 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  全自動/半自動模式
                </p>
                <p className="text-xs text-gray-500">
                  彈性選擇適合你的接單方式
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mb-6">
          <a
            href="https://apps.apple.com/app/oflow"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            前往 App Store 下載
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500">
          目前僅支援 iOS 平台（需要 iOS 14.0 或以上版本）
        </p>
      </div>
    </div>
  );
}

