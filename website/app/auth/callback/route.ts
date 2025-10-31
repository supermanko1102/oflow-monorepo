import { NextRequest, NextResponse } from "next/server";

/**
 * Universal Link Callback Handler
 *
 * 處理從 LINE 登入回來的 Universal Link：
 * - 如果 app 已安裝：iOS 會直接打開 app 並傳遞完整 URL
 * - 如果 app 未安裝：會在 Safari 中打開，顯示下載頁
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 取得所有參數
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const teams = searchParams.get("teams");
  const error = searchParams.get("error");

  console.log("[Universal Link] 收到請求:", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasTeams: !!teams,
    error,
  });

  // 檢測 User-Agent，判斷是否來自 mobile app
  const userAgent = request.headers.get("user-agent") || "";
  const isInApp = /OFlow/i.test(userAgent);

  console.log("[Universal Link] User-Agent:", userAgent);
  console.log("[Universal Link] 是否在 app 內:", isInApp);

  // 如果在瀏覽器中打開（app 未安裝），顯示下載頁
  if (!isInApp) {
    console.log("[Universal Link] 重定向到下載頁");
    return NextResponse.redirect(new URL("/download", request.url));
  }

  // 如果在 app 內，返回 HTML 並通過 JavaScript 觸發 deep link
  // 這個頁面會被 iOS 的 Universal Link 機制攔截，參數會傳遞給 app
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OFlow 登入中...</title>
</head>
<body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; font-family: system-ui, -apple-system, sans-serif;">
  <div style="text-align: center;">
    <div style="margin-bottom: 1rem; display: inline-block; width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #00B900; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    <p style="color: #6b7280; margin: 0;">正在跳轉回 app...</p>
  </div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

