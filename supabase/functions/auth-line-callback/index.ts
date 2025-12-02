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
    const { access_token, expires_in, id_token } = await req.json();

    if (!access_token) {
      throw new Error("Missing access token");
    }

    console.log("[Auth] 收到 LINE callback 請求");

    // 2. 取得環境變數
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // 4. 取得 LINE Access Token
    console.log("[Auth] 取得 LINE access token...");
    const tokenData: LineTokenResponse = {
      access_token,
      token_type: "Bearer",
      refresh_token: "",
      expires_in: Number(expires_in || 0),
      scope: "",
      id_token,
    };

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
              auth_provider: "line",
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
            auth_provider: "line",
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
          // 使用 listUsers 並過濾 (增加每頁數量以確保找到用戶)
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

          console.log(`[Auth Debug] 搜尋目標 Email: ${email}`);
          console.log(`[Auth Debug] listUsers 回傳數量: ${allUsers?.users?.length || 0}`);

          // 1. 嘗試用 Email 找
          let foundUser = allUsers?.users?.find((u) => u.email === email);

          // 2. 如果 Email 找不到，嘗試用 metadata 中的 line_user_id 找 (防止 Email 格式不一致)
          if (!foundUser) {
            console.log(`[Auth Debug] Email 未匹配，嘗試使用 metadata.line_user_id 搜尋: ${lineProfile.userId}`);
            foundUser = allUsers?.users?.find((u) => u.user_metadata?.line_user_id === lineProfile.userId);
          }

          if (foundUser) {
            console.log(`[Auth] 找到現有使用者 (ID: ${foundUser.id})，更新資料...`);
            const { data: updateData, error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
                user_metadata: {
                  line_user_id: lineProfile.userId,
                  display_name: lineProfile.displayName,
                  picture_url: lineProfile.pictureUrl || null,
                  auth_provider: "line",
                  last_login_at: new Date().toISOString(),
                },
              });

            if (updateError) {
              throw updateError;
            }

            authUser = updateData.user;
          } else {
            // 若真的找不到，列出前幾個 email 幫助除錯
            const firstFewEmails = allUsers?.users?.slice(0, 5).map(u => `${u.email} (meta: ${u.user_metadata?.line_user_id})`).join(", ");
            console.log(`[Auth Debug] 前 5 筆用戶資料: ${firstFewEmails}`);

            throw new Error(
              `User exists (according to create error) but could not be found in list (total: ${allUsers?.users?.length}). Target: ${email}`
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
          auth_provider: "line",
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

    // 11. 查詢使用者的團隊列表
    console.log("[Auth] 查詢使用者團隊...");
    const { data: userTeams, error: teamsError } = await supabaseAdmin.rpc(
      "get_user_teams",
      { p_user_id: publicUser.id }
    );

    if (teamsError) {
      console.error("[Auth] 團隊查詢失敗:", teamsError);
      // 不阻擋登入，只記錄錯誤
    }

    console.log("[Auth] 找到", userTeams?.length || 0, "個團隊");

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
          line_user_id: lineProfile.userId,
          display_name: lineProfile.displayName,
          picture_url: lineProfile.pictureUrl || null,
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
