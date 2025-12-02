import { NextRequest, NextResponse } from "next/server";

/**
 * Universal Link Callback Handler
 *
 * 處理從 LINE 登入回來的 Universal Link：
 * - 如果 app 已安裝：iOS 會直接打開 app 並傳遞完整 URL
 * - 如果 app 未安裝：會在 Safari 中打開，顯示下載頁
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // 取得 User-Agent
  const userAgent = request.headers.get("user-agent") || "";
  const isInApp = /OFlow/i.test(userAgent);

  console.log("[Universal Link] User-Agent:", userAgent);
  console.log("[Universal Link] 是否在 app 內:", isInApp);

  // 返回 HTML 並通過 JavaScript 嘗試打開 app
  // 如果 Universal Link 失效，使用 URL Scheme 作為 fallback
  // 資料使用 hash 傳遞，避免出現在伺服器 log / 瀏覽器歷史

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
    <p style="color: #6b7280; margin: 0;" id="status">正在跳轉回 app...</p>
    <button 
      id="openAppBtn" 
      style="display: none; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #00B900; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;"
      onclick="openApp()"
    >
      點擊打開 OFlow
    </button>
  </div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script>
    // Universal Link 的 fallback 機制
    // 1. 優先從 hash 取得參數（避免出現在伺服器 log）
    // 2. 若 hash 無資料，再從 query 取（向後相容）
    function getParams() {
      const hash = window.location.hash ? window.location.hash.slice(1) : "";
      const search = window.location.search
        ? window.location.search.slice(1)
        : "";
      const raw = hash || search;
      return new URLSearchParams(raw);
    }

    const params = getParams();
    const urlScheme = \`oflow://auth?\${params.toString()}\`;
    let appOpened = false;
    
    function openApp() {
      console.log('[Callback] 嘗試打開 app:', urlScheme);
      window.location.href = urlScheme;
      appOpened = true;
    }
    
    // 立即嘗試使用 URL Scheme 打開 app
    openApp();
    
    // 2 秒後如果還在頁面上，顯示手動打開按鈕
    setTimeout(function() {
      if (!document.hidden) {
        console.log('[Callback] Universal Link 似乎未生效，顯示手動按鈕');
        document.getElementById('status').textContent = '需要手動打開 app';
        document.getElementById('openAppBtn').style.display = 'inline-block';
      }
    }, 2000);
    
    // 監聽頁面可見性變化（如果 app 打開了，頁面會進入後台）
    document.addEventListener('visibilitychange', function() {
      if (document.hidden && !appOpened) {
        console.log('[Callback] 頁面進入後台，app 可能已打開');
        appOpened = true;
      }
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
