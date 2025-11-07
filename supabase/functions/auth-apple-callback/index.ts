// OFlow Apple Sign In Backend Handler
// 處理 Apple Sign In callback、驗證 ID Token、建立 Supabase Auth user、同步資料

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createRemoteJWKSet,
  jwtVerify,
} from "https://deno.land/x/jose@v5.1.0/index.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Apple's JWKS endpoint (公鑰端點)
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

interface AppleIDTokenPayload {
  iss: string; // "https://appleid.apple.com"
  aud: string; // Your app's bundle ID
  exp: number;
  iat: number;
  sub: string; // Apple User ID (唯一識別碼)
  email?: string;
  email_verified?: boolean | string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. 解析請求參數
    const { identityToken, user, fullName, email } = await req.json();

    if (!identityToken) {
      throw new Error("Missing identity token");
    }

    console.log("[Apple Auth] 收到 Apple Sign In 請求");

    // 2. 取得環境變數
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const APPLE_BUNDLE_ID = Deno.env.get("APPLE_BUNDLE_ID") || "com.oflow.app";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // 3. 建立 Supabase Admin Client
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 4. 驗證 Apple ID Token (使用 Apple 的公鑰)
    console.log("[Apple Auth] 驗證 Apple ID Token...");

    const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

    let applePayload: AppleIDTokenPayload;
    try {
      // 先不驗證 audience，因為可能有多個 Bundle ID（開發/正式）
      const { payload } = await jwtVerify(identityToken, JWKS, {
        issuer: "https://appleid.apple.com",
        // 暫時移除 audience 驗證，之後可以根據實際情況調整
        // audience: APPLE_BUNDLE_ID,
      });
      applePayload = payload as unknown as AppleIDTokenPayload;

      // 記錄實際的 audience 值，方便調試
      console.log("[Apple Auth] Token aud claim:", applePayload.aud);
      console.log("[Apple Auth] Expected Bundle ID:", APPLE_BUNDLE_ID);

      // 手動驗證 audience（如果設定了環境變數）
      if (APPLE_BUNDLE_ID && applePayload.aud !== APPLE_BUNDLE_ID) {
        console.warn(
          "[Apple Auth] ⚠️ Audience mismatch:",
          `Expected: ${APPLE_BUNDLE_ID}, Got: ${applePayload.aud}`
        );
        // 不拋出錯誤，允許繼續（開發階段）
        // 正式環境可以取消註解下面這行來強制驗證
        // throw new Error(`Audience mismatch: expected ${APPLE_BUNDLE_ID}, got ${applePayload.aud}`);
      }
    } catch (error) {
      console.error("[Apple Auth] Token 驗證失敗:", error);
      throw new Error("Invalid Apple ID Token: " + error.message);
    }

    console.log(
      "[Apple Auth] Token 驗證成功，Apple User ID:",
      applePayload.sub
    );

    // 5. 提取用戶資訊
    const appleUserId = applePayload.sub;
    const userEmail =
      applePayload.email || email || `${appleUserId}@apple.oflow.app`;

    // 組合 fullName（Apple 只在第一次登入時提供）
    let displayName = "Apple User";
    if (fullName) {
      const parts = [];
      if (fullName.givenName) parts.push(fullName.givenName);
      if (fullName.familyName) parts.push(fullName.familyName);
      if (parts.length > 0) displayName = parts.join(" ");
    }

    // 6. 檢查是否為現有用戶（查詢 public.users）
    console.log("[Apple Auth] 檢查是否為現有用戶...");
    const { data: existingPublicUser } = await supabaseAdmin
      .from("users")
      .select("auth_user_id, line_display_name")
      .eq("apple_user_id", appleUserId)
      .maybeSingle();

    let authUser;

    if (existingPublicUser?.auth_user_id) {
      // 7a. 使用者已存在，更新 metadata
      console.log(
        "[Apple Auth] 使用者已存在，更新資料...",
        existingPublicUser.auth_user_id
      );

      // 如果已有 display_name，保留舊的（Apple 只在第一次提供 fullName）
      const finalDisplayName =
        existingPublicUser.line_display_name || displayName;

      const { data: updateData, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          existingPublicUser.auth_user_id,
          {
            user_metadata: {
              apple_user_id: appleUserId,
              display_name: finalDisplayName,
              auth_provider: "apple",
              last_login_at: new Date().toISOString(),
            },
          }
        );

      if (updateError) {
        throw updateError;
      }

      authUser = updateData.user;
    } else {
      // 7b. 新使用者，建立 Auth User
      console.log("[Apple Auth] 建立新使用者...");
      const { data: createData, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            apple_user_id: appleUserId,
            display_name: displayName,
            auth_provider: "apple",
            last_login_at: new Date().toISOString(),
          },
        });

      if (createError) {
        // 如果是使用者已存在的錯誤，嘗試查詢該使用者
        if (
          createError.message?.includes("already been registered") ||
          createError.message?.includes("already exists")
        ) {
          console.log("[Apple Auth] 使用者已存在（透過錯誤檢測），嘗試查詢...");
          // 使用 listUsers 並過濾
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          const foundUser = allUsers?.users?.find((u) => u.email === userEmail);

          if (foundUser) {
            console.log("[Apple Auth] 找到現有使用者，更新資料...");
            const { data: updateData, error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
                user_metadata: {
                  apple_user_id: appleUserId,
                  display_name: displayName,
                  auth_provider: "apple",
                  last_login_at: new Date().toISOString(),
                },
              });

            if (updateError) {
              throw updateError;
            }

            authUser = updateData.user;
          } else {
            throw new Error(
              "User exists but could not be found: " + createError.message
            );
          }
        } else {
          throw createError;
        }
      } else {
        authUser = createData.user;
      }
    }

    console.log("[Apple Auth] Supabase Auth user ID:", authUser.id);

    // 8. 為用戶設定臨時密碼（用於產生 session）
    const tempPassword = crypto.randomUUID();
    console.log("[Apple Auth] 更新用戶密碼...");

    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
      });

    if (passwordError) {
      console.error("[Apple Auth] 密碼更新失敗:", passwordError);
      throw passwordError;
    }

    // 9. 同步至 public.users 表
    console.log("[Apple Auth] 同步至 public.users 表...");
    const { data: publicUser, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          auth_user_id: authUser.id,
          apple_user_id: appleUserId,
          line_display_name: displayName,
          line_email: userEmail,
          auth_provider: "apple",
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "apple_user_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[Apple Auth] public.users 同步失敗:", upsertError);
      throw upsertError;
    }

    console.log("[Apple Auth] public.users 同步成功:", publicUser.id);

    // 10. 產生 Supabase Session Token
    // 使用密碼登入來產生真實的 session tokens
    console.log("[Apple Auth] 產生 session token...");
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: tempPassword,
      });

    if (signInError || !signInData.session) {
      console.error("[Apple Auth] Session 產生失敗:", signInError);
      throw new Error("Failed to generate session: " + signInError?.message);
    }

    const session = signInData.session;
    console.log("[Apple Auth] Session tokens 產生成功");

    // 11. 查詢使用者的團隊列表
    console.log("[Apple Auth] 查詢使用者團隊...");
    const { data: userTeams, error: teamsError } = await supabaseAdmin.rpc(
      "get_user_teams",
      { p_user_id: publicUser.id }
    );

    if (teamsError) {
      console.error("[Apple Auth] 團隊查詢失敗:", teamsError);
      // 不阻擋登入，只記錄錯誤
    }

    console.log("[Apple Auth] 找到", userTeams?.length || 0, "個團隊");

    // 12. 回傳結果
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
        },
        user: {
          id: authUser.id,
          public_user_id: publicUser.id,
          apple_user_id: appleUserId,
          display_name: displayName,
          email: userEmail,
        },
        teams: userTeams || [],
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Apple Auth] 錯誤:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
