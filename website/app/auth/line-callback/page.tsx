import { redirect } from "next/navigation";

/**
 * LINE Login Callback Handler (Server-Side Redirect)
 *
 * 新流程：
 * 1. 接收 LINE OAuth callback (code, state, code_verifier)
 * 2. 呼叫 Supabase Edge Function 交換 token 並建立 user
 * 3. 取得 Supabase session token
 * 4. Server-side HTTP 302 redirect 回 app (讓 openAuthSessionAsync 正確關閉)
 */
export default async function LineCallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  try {
    // 取得 URL 參數
    const code = searchParams.code as string | undefined;
    const state = searchParams.state as string | undefined;
    const codeVerifier = searchParams.code_verifier as string | undefined;
    const error = searchParams.error as string | undefined;

    console.log("[LINE Callback] 收到參數:", {
      code: !!code,
      state: !!state,
      codeVerifier: !!codeVerifier,
      error,
    });

    // 檢查是否有錯誤
    if (error) {
      console.error("[LINE Callback] 授權錯誤:", error);
      redirect(`oflow://auth?error=${encodeURIComponent(error)}`);
    }

    // 檢查必要參數
    if (!code || !state) {
      console.error("[LINE Callback] 缺少必要參數");
      redirect("oflow://auth?error=missing_parameters");
    }

    // 檢查必要的環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[LINE Callback] Supabase 環境變數未設定");
      redirect("oflow://auth?error=Configuration%20error");
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
        redirect_uri: `https://${
          process.env.NEXT_PUBLIC_VERCEL_URL || "oflow-website.vercel.app"
        }/auth/line-callback`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[LINE Callback] Edge Function 失敗:", errorData);
      redirect(
        `oflow://auth?error=${encodeURIComponent(
          errorData.error || "Edge Function 失敗"
        )}`
      );
    }

    const result = await response.json();

    if (!result.success || !result.session) {
      console.error("[LINE Callback] 未收到有效的 session");
      redirect("oflow://auth?error=Invalid%20session");
    }

    console.log("[LINE Callback] 取得 session 成功");
    console.log("[LINE Callback] 團隊數:", result.teams?.length || 0);

    // 建立 deep link 並使用 server-side redirect
    const teamsJson = JSON.stringify(result.teams || []);
    const deepLink = `oflow://auth?access_token=${encodeURIComponent(
      result.session.access_token
    )}&refresh_token=${encodeURIComponent(
      result.session.refresh_token
    )}&teams=${encodeURIComponent(teamsJson)}`;

    console.log("[LINE Callback] Server-side redirect 回 app");

    // 使用 HTTP 302 redirect - 這會讓 openAuthSessionAsync 正確關閉瀏覽器
    redirect(deepLink);
  } catch (error) {
    console.error("[LINE Callback] 處理失敗:", error);

    // 錯誤也要回傳給 app
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    redirect(`oflow://auth?error=${encodeURIComponent(errorMessage)}`);
  }
}
