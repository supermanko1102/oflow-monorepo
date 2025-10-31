import { NextRequest, NextResponse } from "next/server";

/**
 * LINE Login Callback Handler (API Route with Real HTTP 302)
 *
 * 關鍵：使用 API Route + NextResponse.redirect() 產生真正的 HTTP 302 redirect
 * 讓 openAuthSessionAsync 能正確捕獲 oflow:// URL 並關閉瀏覽器
 *
 * 流程：
 * 1. 接收 LINE OAuth callback (code, state, code_verifier)
 * 2. 呼叫 Supabase Edge Function 交換 token 並建立 user
 * 3. 取得 Supabase session token
 * 4. HTTP 302 redirect 到 oflow://auth?access_token=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

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
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/auth/mobile-redirect?error=${encodeURIComponent(error)}`
      );
    }

    // 檢查必要參數
    if (!code || !state) {
      console.error("[LINE Callback] 缺少必要參數");
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/auth/mobile-redirect?error=missing_parameters`
      );
    }

    // 檢查必要的環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[LINE Callback] Supabase 環境變數未設定");
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/auth/mobile-redirect?error=Configuration%20error`
      );
    }

    // 呼叫 Edge Function
    console.log("[LINE Callback] 呼叫 Edge Function...");
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auth-line-callback`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        code,
        state,
        code_verifier: codeVerifier,
        redirect_uri: `${request.nextUrl.origin}/auth/line-callback`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[LINE Callback] Edge Function 失敗:", errorData);
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/auth/mobile-redirect?error=${encodeURIComponent(
          errorData.error || "Edge Function 失敗"
        )}`
      );
    }

    const result = await response.json();

    if (!result.success || !result.session) {
      console.error("[LINE Callback] 未收到有效的 session");
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/auth/mobile-redirect?error=Invalid%20session`
      );
    }

    console.log("[LINE Callback] 取得 session 成功");
    console.log("[LINE Callback] 團隊數:", result.teams?.length || 0);

    // 建立 redirect URL（使用 Universal Link for production）
    const teamsJson = JSON.stringify(result.teams || []);
    const baseUrl = request.nextUrl.origin;

    // 使用 Universal Link（iOS production build 需要）
    const universalLink = `${baseUrl}/auth/mobile-redirect?access_token=${encodeURIComponent(
      result.session.access_token
    )}&refresh_token=${encodeURIComponent(
      result.session.refresh_token
    )}&teams=${encodeURIComponent(teamsJson)}`;

    console.log("[LINE Callback] HTTP 302 redirect 到 Universal Link");

    // 使用 NextResponse.redirect() 產生真正的 HTTP 302 redirect
    // iOS 會透過 Universal Link 自動開啟 App
    // Expo Go 開發環境也能正常運作（會顯示網頁，然後手動觸發 custom scheme）
    return NextResponse.redirect(universalLink);
  } catch (error) {
    console.error("[LINE Callback] 處理失敗:", error);

    // 錯誤也要回傳給 app（使用 Universal Link）
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/auth/mobile-redirect?error=${encodeURIComponent(
        errorMessage
      )}`
    );
  }
}
