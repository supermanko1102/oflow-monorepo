import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "客戶支援 | OFlow",
  description: "OFlow 客戶支援中心 - 常見問題、使用指南與聯絡我們",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">客戶支援</h1>
          <p className="text-lg text-gray-600">我們隨時為您提供協助</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <a
            href="#faq"
            className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">常見問題</h3>
              <p className="text-sm text-gray-500">快速找到解答</p>
            </div>
          </a>

          <a
            href="#contact"
            className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">聯絡我們</h3>
              <p className="text-sm text-gray-500">直接與我們對話</p>
            </div>
          </a>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="mb-10 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">常見問題</h2>

          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                如何開始使用 OFlow？
              </h3>
              <div className="ml-8 text-gray-700">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>下載並安裝 OFlow App</li>
                  <li>使用 LINE 帳號登入</li>
                  <li>建立或加入團隊</li>
                  <li>連結您的 LINE Bot</li>
                  <li>開始接收並管理訂單</li>
                </ol>
              </div>
            </div>

            {/* FAQ Item 2 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                AI 如何自動識別訂單？
              </h3>
              <div className="ml-8 space-y-2 text-gray-700">
                <p>
                  當客戶在 LINE 中傳送訂單訊息時，我們的 AI
                  會自動分析訊息內容，識別以下資訊：
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>商品名稱與數量</li>
                  <li>取貨日期與時間</li>
                  <li>客戶聯絡資訊</li>
                  <li>其他備註事項</li>
                </ul>
                <p className="mt-2">
                  系統會自動建立訂單草稿，您可以在 App
                  中確認並調整後再正式建立。
                </p>
              </div>
            </div>

            {/* FAQ Item 3 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                全自動與半自動模式有什麼差別？
              </h3>
              <div className="ml-8 space-y-3 text-gray-700">
                <div>
                  <p className="mb-1 font-medium text-gray-900">
                    🤖 全自動模式
                  </p>
                  <p>
                    AI
                    識別後直接建立訂單並回覆客戶，適合熟悉系統且商品固定的商家。
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-gray-900">
                    ✋ 半自動模式
                  </p>
                  <p>
                    AI
                    識別後會通知您確認，您可以檢查並修改後再回覆客戶，更加彈性安全。
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Item 4 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                如何設定商品資料？
              </h3>
              <div className="ml-8 text-gray-700">
                <p className="mb-2">在 App 中進入「商品管理」頁面，您可以：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>新增商品名稱、價格、說明</li>
                  <li>設定商品類別與標籤</li>
                  <li>上傳商品照片</li>
                  <li>設定庫存提醒</li>
                </ul>
                <p className="mt-2">
                  完善的商品資料可以幫助 AI 更準確地識別訂單內容。
                </p>
              </div>
            </div>

            {/* FAQ Item 5 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                提醒功能如何運作？
              </h3>
              <div className="ml-8 space-y-2 text-gray-700">
                <p>OFlow 提供智慧提醒功能，包括：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>訂單即將到期提醒（可自訂提前時間）</li>
                  <li>今日待處理訂單總覽</li>
                  <li>新訂單即時通知</li>
                </ul>
                <p className="mt-2">
                  您可以在設定中調整通知偏好，確保不漏接任何重要訂單。
                </p>
              </div>
            </div>

            {/* FAQ Item 6 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                如何管理團隊成員？
              </h3>
              <div className="ml-8 space-y-2 text-gray-700">
                <p>團隊管理員可以：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>邀請新成員加入團隊</li>
                  <li>設定成員權限（管理員/成員）</li>
                  <li>查看成員操作紀錄</li>
                  <li>移除不再需要的成員</li>
                </ul>
                <p className="mt-2">
                  所有團隊成員都可以查看和管理訂單，實現協作管理。
                </p>
              </div>
            </div>

            {/* FAQ Item 7 */}
            <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="mb-3 flex items-start gap-2 text-lg font-semibold text-gray-900">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                  Q
                </span>
                資料安全嗎？
              </h3>
              <div className="ml-8 text-gray-700">
                <p className="mb-2">我們非常重視您的資料安全：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>所有資料傳輸都經過 HTTPS 加密</li>
                  <li>使用 LINE 官方登入機制</li>
                  <li>資料儲存在安全的 Supabase 雲端</li>
                  <li>不會將資料提供給第三方</li>
                </ul>
                <p className="mt-3">
                  詳細資訊請參考我們的{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    隱私權政策
                  </Link>
                  。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Guide Section */}
        <div className="mb-10 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            快速開始指南
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  下載並登入
                </h3>
                <p className="text-gray-700">
                  從 App Store 下載 OFlow，使用您的 LINE 帳號登入。
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                2
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  建立團隊
                </h3>
                <p className="text-gray-700">
                  建立您的商家團隊，或使用邀請碼加入現有團隊。
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                3
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  連結 LINE Bot
                </h3>
                <p className="text-gray-700">
                  依照指示連結您的 LINE Bot，讓 OFlow 可以接收訂單訊息。
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                4
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  設定商品
                </h3>
                <p className="text-gray-700">
                  在商品管理中新增您的商品資料，幫助 AI 更準確識別。
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                5
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  開始使用
                </h3>
                <p className="text-gray-700">
                  完成設定後，就可以開始接收並管理訂單了！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div
          id="contact"
          className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-8 text-white shadow-lg"
        >
          <div className="mb-6 text-center">
            <h2 className="mb-3 text-3xl font-bold">需要更多協助？</h2>
            <p className="text-green-50">
              找不到您需要的答案？歡迎直接與我們聯繫
            </p>
          </div>

          <div className="mx-auto max-w-xl space-y-4">
            {/* Email */}
            <a
              href="mailto:caowenjieko@gmail.com"
              className="flex items-center gap-4 rounded-xl bg-white/10 p-5 backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-sm text-green-100">Email 聯絡</p>
                <p className="font-medium">caowenjieko@gmail.com</p>
              </div>
              <svg
                className="h-5 w-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>

            {/* Support Hours */}
            <div className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="mb-1 text-sm text-green-100">客服時間</p>
                  <p className="font-medium">週一至週五 09:00 - 18:00</p>
                </div>
              </div>
              <p className="text-sm text-green-100">
                我們會在 24 小時內回覆您的訊息
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              返回首頁
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/download"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              下載 App
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/privacy"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              隱私權政策
            </Link>
          </div>
          <p className="text-sm text-gray-500">© 2025 OFlow Studio</p>
        </div>
      </div>
    </div>
  );
}
