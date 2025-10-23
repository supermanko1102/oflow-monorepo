// OFlow LINE Login Backend Handler
// 處理 LINE OAuth callback、建立 Supabase Auth user、同步資料

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. 解析請求參數
    const { code, state, code_verifier, redirect_uri } = await req.json();

    if (!code) {
      throw new Error("Missing authorization code");
    }

    console.log("[Auth] 收到 LINE callback 請求");

    // 2. 取得環境變數
    const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID");
    const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
      throw new Error("LINE credentials not configured");
    }

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

    // 4. 用授權碼交換 LINE Access Token
    console.log("[Auth] 交換 LINE access token...");

    // 構建完整的 redirect_uri（必須與授權請求時完全一致）
    const baseRedirectUri =
      redirect_uri || "https://oflow-website.vercel.app/auth/line-callback";
    const fullRedirectUri = code_verifier
      ? `${baseRedirectUri}?code_verifier=${encodeURIComponent(code_verifier)}`
      : baseRedirectUri;

    console.log("[Auth] Redirect URI:", fullRedirectUri);

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: fullRedirectUri,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
    });

    // 如果有 code_verifier，加入 PKCE 驗證
    if (code_verifier) {
      tokenParams.append("code_verifier", code_verifier);
    }

    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Auth] LINE token 交換失敗:", errorData);
      throw new Error(`LINE token exchange failed: ${errorData}`);
    }

    const tokenData: LineTokenResponse = await tokenResponse.json();
    console.log("[Auth] LINE token 交換成功");

    // 5. 取得 LINE 使用者資料
    console.log("[Auth] 取得 LINE 使用者資料...");
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LINE user profile");
    }

    const lineProfile: LineUserProfile = await profileResponse.json();
    console.log("[Auth] 取得使用者:", lineProfile.displayName);

    // 6. 檢查 Supabase Auth 中是否已有此使用者
    const email = `${lineProfile.userId}@line.oflow.app`;

    // 先從 public.users 表查詢（更可靠，有 line_user_id 索引）
    const { data: existingPublicUser } = await supabaseAdmin
      .from("users")
      .select("auth_user_id")
      .eq("line_user_id", lineProfile.userId)
      .maybeSingle();

    let authUser;

    if (existingPublicUser?.auth_user_id) {
      // 7a. 使用者已存在，更新 metadata
      console.log(
        "[Auth] 使用者已存在，更新資料...",
        existingPublicUser.auth_user_id
      );
      const { data: updateData, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          existingPublicUser.auth_user_id,
          {
            user_metadata: {
              line_user_id: lineProfile.userId,
              display_name: lineProfile.displayName,
              picture_url: lineProfile.pictureUrl || null,
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
      console.log("[Auth] 建立新使用者...");
      const { data: createData, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            line_user_id: lineProfile.userId,
            display_name: lineProfile.displayName,
            picture_url: lineProfile.pictureUrl || null,
            last_login_at: new Date().toISOString(),
          },
        });

      if (createError) {
        // 如果是使用者已存在的錯誤，嘗試查詢該使用者
        if (
          createError.message?.includes("already been registered") ||
          createError.message?.includes("already exists")
        ) {
          console.log("[Auth] 使用者已存在（透過錯誤檢測），嘗試查詢...");
          // 使用 listUsers 並過濾
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          const foundUser = allUsers?.users?.find((u) => u.email === email);

          if (foundUser) {
            console.log("[Auth] 找到現有使用者，更新資料...");
            const { data: updateData, error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
                user_metadata: {
                  line_user_id: lineProfile.userId,
                  display_name: lineProfile.displayName,
                  picture_url: lineProfile.pictureUrl || null,
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

    console.log("[Auth] Supabase Auth user ID:", authUser.id);

    // 8. 為用戶設定臨時密碼（用於產生 session）
    const tempPassword = crypto.randomUUID();
    console.log("[Auth] 更新用戶密碼...");

    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
      });

    if (passwordError) {
      console.error("[Auth] 密碼更新失敗:", passwordError);
      throw passwordError;
    }

    // 9. 同步至 public.users 表
    console.log("[Auth] 同步至 public.users 表...");
    const { data: publicUser, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          auth_user_id: authUser.id,
          line_user_id: lineProfile.userId,
          line_display_name: lineProfile.displayName,
          line_picture_url: lineProfile.pictureUrl || null,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "line_user_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[Auth] public.users 同步失敗:", upsertError);
      throw upsertError;
    }

    console.log("[Auth] public.users 同步成功:", publicUser.id);

    // 10. 產生 Supabase Session Token
    // 使用密碼登入來產生真實的 session tokens
    console.log("[Auth] 產生 session token...");
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: tempPassword,
      });

    if (signInError || !signInData.session) {
      console.error("[Auth] Session 產生失敗:", signInError);
      throw new Error("Failed to generate session: " + signInError?.message);
    }

    const session = signInData.session;
    console.log("[Auth] Session tokens 產生成功");

    // 11. 回傳結果
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
          line_user_id: lineProfile.userId,
          display_name: lineProfile.displayName,
          picture_url: lineProfile.pictureUrl || null,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Auth] 錯誤:", error);

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
