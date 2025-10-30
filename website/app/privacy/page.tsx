import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | OFlow",
  description:
    "Privacy Policy for OFlow - Learn how we protect user data and handle LINE login information responsibly.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">隱私權政策</h1>
          <p className="text-lg text-gray-600">
            最後更新日期：
            {new Date().toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white shadow-sm rounded-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">簡介</h2>
            <p className="text-gray-700 leading-relaxed">
              歡迎使用 OFlow。我們重視您的隱私，並致力於保護您的個人資料。
              本隱私權政策說明我們如何處理登入資訊及您在使用應用程式時的資料。
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              我們收集的資訊
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              OFlow 僅使用 LINE 官方登入進行身份驗證。
              我們不會主動收集、儲存或分享任何個人資料。 登入過程由 LINE
              官方平台提供並受其隱私權政策約束。
            </p>
            <div className="text-gray-700 leading-relaxed mt-4 text-sm bg-blue-50 p-4 rounded">
              <p className="font-medium mb-2">關於 LINE 登入</p>
              <p>
                登入過程由 LINE 官方提供並受其隱私政策約束。 您可以前往{" "}
                <a
                  href="https://line.me/zh-hant/terms/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  LINE 隱私權政策
                </a>{" "}
                了解更多。
              </p>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              資訊使用方式
            </h2>
            <p className="text-gray-700 leading-relaxed">
              登入授權資訊僅用於識別使用者並提供應用內功能。
              我們不會將資料用於廣告、追蹤或其他商業用途。
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              資料安全與保存
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              為確保服務穩定運作，OFlow 使用 Supabase 作為雲端資料庫。
              僅儲存必要的服務資料（例如團隊設定、訂單資料），
              不包含任何個人識別資訊。 我們採用 HTTPS
              加密與最小權限原則保護所有傳輸資料。
            </p>
            <p className="text-gray-700 leading-relaxed">
              我們不會將任何資料提供給第三方作為行銷、廣告或分析用途。
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              第三方服務
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              為提供登入與資料儲存功能，我們使用以下第三方服務。
              所有資料處理皆符合各服務的隱私權政策，OFlow 本身不會收集額外資訊。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-3 ml-4">
              <li>
                <strong>LINE Login</strong>：用於使用者身份驗證
                <br />
                <a
                  href="https://line.me/zh-hant/terms/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  查看 LINE 隱私權政策
                </a>
              </li>
              <li>
                <strong>Supabase</strong>：用於資料儲存與後端服務
                <br />
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  查看 Supabase 隱私權政策
                </a>
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              兒童隱私
            </h2>
            <p className="text-gray-700 leading-relaxed">
              我們的服務不針對 13 歲以下的兒童。 我們不會有意識地收集 13
              歲以下兒童的個人資訊。
              若您是家長或監護人，並發現您的孩子向我們提供了個人資料，
              請立即與我們聯繫，我們將採取刪除措施。
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              隱私權政策的變更
            </h2>
            <p className="text-gray-700 leading-relaxed">
              我們可能會不時更新本政策。若有重大變更，將於應用程式或網站中公告。
              建議您定期查看以了解最新版本。
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              聯絡我們
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              若您對本隱私權政策有任何疑問，請透過以下方式聯絡我們：
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:caowenjieko@gmail.com"
                  className="text-blue-600 hover:text-blue-800"
                >
                  caowenjieko@gmail.com
                </a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>公司名稱:</strong> OFlow Studio
              </p>
            </div>
          </section>

          {/* Consent */}
          <section className="border-t pt-8">
            <p className="text-gray-600 leading-relaxed text-sm">
              使用我們的服務即表示您同意本隱私權政策的條款。
              若您不同意本政策，請勿使用本應用程式或相關服務。
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
