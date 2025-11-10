// OFlow Team Operations API
// 處理所有團隊相關操作（建立、加入、離開、查詢成員等）

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 驗證 JWT token 並取得使用者資訊
async function authenticateUser(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid token");
  }

  // 從 public.users 取得完整使用者資訊
  // 改用 auth_user_id 查詢，支援 LINE 和 Apple 用戶
  const { data: publicUser, error: publicUserError } = await supabaseAdmin
    .from("users")
    .select("id, line_user_id, apple_user_id, line_display_name, auth_provider")
    .eq("auth_user_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return publicUser;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 初始化 Supabase Admin Client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

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

    // 驗證使用者
    const user = await authenticateUser(req, supabaseAdmin);
    console.log("[Team Operations] User:", user.id, user.line_display_name);

    // 解析請求
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // GET 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      // 查詢使用者團隊列表
      if (action === "list") {
        console.log("[Team Operations] 查詢使用者團隊...");
        const { data: teams, error } = await supabaseAdmin.rpc(
          "get_user_teams",
          {
            p_user_id: user.id,
          }
        );

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            teams: teams || [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢團隊成員
      if (action === "members") {
        const teamId = url.searchParams.get("team_id");
        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        console.log("[Team Operations] 查詢團隊成員:", teamId);
        const { data: members, error } = await supabaseAdmin.rpc(
          "get_team_members",
          {
            p_team_id: teamId,
          }
        );

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            members: members || [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 取得或建立邀請碼
      if (action === "invite") {
        const teamId = url.searchParams.get("team_id");
        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        console.log("[Team Operations] 取得邀請碼:", teamId);
        const { data: inviteCode, error } = await supabaseAdmin.rpc(
          "get_or_create_invite_code",
          {
            p_team_id: teamId,
            p_user_id: user.id,
          }
        );

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            invite_code: inviteCode,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢配送設定
      if (action === "delivery-settings") {
        const teamId = url.searchParams.get("team_id");
        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        console.log("[Team Operations] 查詢配送設定:", teamId);

        // 驗證用戶是否為該團隊成員
        const { data: member, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("role")
          .eq("team_id", teamId)
          .eq("user_id", user.id)
          .single();

        if (memberError || !member) {
          throw new Error("You are not a member of this team");
        }

        // 查詢配送設定
        const { data: settings, error } = await supabaseAdmin
          .from("team_settings")
          .select("pickup_settings, enable_convenience_store, enable_black_cat")
          .eq("team_id", teamId)
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            settings: settings || {
              pickup_settings: {
                store_pickup: { enabled: false, address: null, business_hours: null },
                meetup: { enabled: false, available_areas: [], note: null },
              },
              enable_convenience_store: true,
              enable_black_cat: true,
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown GET action: ${action}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "POST") {
      const body = await req.json();

      // 建立團隊
      if (action === "create") {
        const { team_name, line_channel_id, business_type } = body;

        if (!team_name) {
          throw new Error("Missing team_name");
        }

        console.log("[Team Operations] 建立團隊:", team_name);
        const { data: teamData, error } = await supabaseAdmin.rpc(
          "create_team_with_owner",
          {
            p_user_id: user.id,
            p_team_name: team_name,
            p_line_channel_id: line_channel_id || null,
            p_business_type: business_type || "bakery",
          }
        );

        if (error) {
          throw error;
        }

        // teamData 是陣列，取第一筆
        const team = teamData[0];

        return new Response(
          JSON.stringify({
            success: true,
            team: {
              id: team.team_id,
              name: team.team_name,
              slug: team.team_slug,
              invite_code: team.invite_code,
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 加入團隊
      if (action === "join") {
        const { invite_code } = body;

        if (!invite_code) {
          throw new Error("Missing invite_code");
        }

        console.log("[Team Operations] 加入團隊:", invite_code);
        const { data: teamId, error } = await supabaseAdmin.rpc(
          "accept_team_invite",
          {
            p_invite_code: invite_code,
            p_user_id: user.id,
          }
        );

        if (error) {
          throw error;
        }

        // 查詢完整的團隊資訊
        const { data: teams, error: teamsError } = await supabaseAdmin.rpc(
          "get_user_teams",
          {
            p_user_id: user.id,
          }
        );

        if (teamsError) {
          throw teamsError;
        }

        const joinedTeam = teams?.find((t: any) => t.team_id === teamId);

        return new Response(
          JSON.stringify({
            success: true,
            team: joinedTeam || { id: teamId },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 離開團隊
      if (action === "leave") {
        const { team_id } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        console.log("[Team Operations] 離開團隊:", team_id);
        const { data, error } = await supabaseAdmin.rpc("leave_team", {
          p_team_id: team_id,
          p_user_id: user.id,
        });

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 刪除團隊（硬刪除）
      if (action === "delete") {
        const { team_id } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        console.log("[Team Operations] 刪除團隊 (硬刪除):", team_id);

        // 呼叫 delete_team 函數
        const { data, error } = await supabaseAdmin.rpc("delete_team", {
          p_team_id: team_id,
          p_user_id: user.id,
        });

        if (error) {
          console.error("[Team Operations] 刪除失敗:", error);
          throw error;
        }

        console.log("[Team Operations] 團隊已永久刪除");

        return new Response(
          JSON.stringify({
            success: true,
            message: "Team deleted permanently",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 更新團隊 LINE 官方帳號設定
      if (action === "update-line-settings") {
        const {
          team_id,
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
          line_channel_name,
        } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        console.log("[Team Operations] 更新 LINE 設定:", team_id);

        // 檢查用戶是否為該團隊的 owner 或 admin
        const { data: member, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("role, can_manage_settings")
          .eq("team_id", team_id)
          .eq("user_id", user.id)
          .single();

        if (memberError || !member) {
          throw new Error("You are not a member of this team");
        }

        if (
          member.role !== "owner" &&
          member.role !== "admin" &&
          !member.can_manage_settings
        ) {
          throw new Error("You don't have permission to update team settings");
        }

        // 驗證必要欄位
        if (
          !line_channel_id ||
          !line_channel_secret ||
          !line_channel_access_token
        ) {
          throw new Error(
            "Missing required LINE settings: channel_id, channel_secret, and access_token are required"
          );
        }

        // 🚀 呼叫 LINE Bot Info API 取得 Bot User ID
        console.log("[Team Operations] 呼叫 LINE Bot Info API...");
        let lineBotUserId: string | null = null;

        try {
          const botInfoResponse = await fetch(
            "https://api.line.me/v2/bot/info",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${line_channel_access_token}`,
              },
            }
          );

          if (!botInfoResponse.ok) {
            const errorText = await botInfoResponse.text();
            console.error(
              "[Team Operations] LINE Bot Info API 錯誤:",
              errorText
            );
            throw new Error(
              `無法驗證 LINE Channel Access Token: ${botInfoResponse.status} ${errorText}`
            );
          }

          const botInfo = await botInfoResponse.json();
          lineBotUserId = botInfo.userId;
          console.log("[Team Operations] 取得 Bot User ID:", lineBotUserId);

          if (!lineBotUserId) {
            throw new Error("無法從 LINE API 取得 Bot User ID");
          }
        } catch (error) {
          console.error("[Team Operations] 取得 Bot User ID 失敗:", error);
          throw new Error(
            `驗證 LINE 設定失敗: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }

        // 更新團隊的 LINE 設定（包含 Bot User ID）
        const { error: updateError } = await supabaseAdmin
          .from("teams")
          .update({
            line_channel_id,
            line_channel_secret,
            line_channel_access_token,
            line_channel_name: line_channel_name || null,
            line_bot_user_id: lineBotUserId, // ✅ 儲存 Bot User ID
            line_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", team_id);

        if (updateError) {
          throw updateError;
        }

        // 回傳 Webhook URL
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;

        return new Response(
          JSON.stringify({
            success: true,
            webhook_url: webhookUrl,
            message: "LINE settings updated successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 測試並自動設定 Webhook（用戶點擊測試按鈕時呼叫）
      if (action === "test-webhook") {
        const { team_id } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        console.log("[Team Operations] 測試 Webhook:", team_id);

        // 檢查用戶是否為該團隊成員
        const { data: member, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("role, can_manage_settings")
          .eq("team_id", team_id)
          .eq("user_id", user.id)
          .single();

        if (memberError || !member) {
          throw new Error("You are not a member of this team");
        }

        // 從資料庫取得團隊的 LINE 設定
        const { data: team, error: teamError } = await supabaseAdmin
          .from("teams")
          .select(
            "line_channel_id, line_channel_secret, line_channel_access_token"
          )
          .eq("id", team_id)
          .single();

        if (teamError || !team) {
          throw new Error("Team not found");
        }

        if (
          !team.line_channel_access_token ||
          !team.line_channel_id ||
          !team.line_channel_secret
        ) {
          throw new Error(
            "LINE settings not configured. Please configure LINE settings first."
          );
        }

        // 生成 Webhook URL
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;

        let webhookConfigured = false;
        let webhookTestSuccess = false;
        let errorMessage: string | undefined;

        try {
          // 步驟 1: 設定 Webhook URL 到 LINE
          console.log("[Team Operations] 設定 Webhook URL 到 LINE...");
          const setWebhookResponse = await fetch(
            "https://api.line.me/v2/bot/channel/webhook/endpoint",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${team.line_channel_access_token}`,
              },
              body: JSON.stringify({
                endpoint: webhookUrl,
              }),
            }
          );

          if (!setWebhookResponse.ok) {
            const errorData = await setWebhookResponse.json().catch(() => ({}));
            throw new Error(
              errorData.message ||
                `Failed to set webhook endpoint: ${setWebhookResponse.status}`
            );
          }

          webhookConfigured = true;
          console.log("[Team Operations] ✅ Webhook URL 已成功設定到 LINE");

          // 步驟 2: 測試 Webhook 連線
          console.log("[Team Operations] 測試 Webhook 連線...");
          const testWebhookResponse = await fetch(
            "https://api.line.me/v2/bot/channel/webhook/test",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${team.line_channel_access_token}`,
              },
              body: JSON.stringify({
                endpoint: webhookUrl,
              }),
            }
          );

          if (testWebhookResponse.ok) {
            const testResult = await testWebhookResponse.json();
            webhookTestSuccess = testResult.success === true;
            console.log(
              "[Team Operations] Webhook 測試結果:",
              webhookTestSuccess ? "成功" : "失敗"
            );
          } else {
            console.warn(
              "[Team Operations] Webhook 測試請求失敗:",
              testWebhookResponse.status
            );
          }
        } catch (error) {
          console.error("[Team Operations] Webhook 設定或測試失敗:", error);
          errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error during webhook configuration";
        }

        // 回傳結果（即使部分失敗也回傳）
        return new Response(
          JSON.stringify({
            success: webhookConfigured,
            webhook_configured: webhookConfigured,
            webhook_test_success: webhookTestSuccess,
            webhook_url: webhookUrl,
            error: errorMessage,
            message: webhookConfigured
              ? webhookTestSuccess
                ? "Webhook configured and tested successfully"
                : "Webhook configured but test failed"
              : "Failed to configure webhook",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: webhookConfigured ? 200 : 400,
          }
        );
      }

      // 更新團隊自動模式設定
      if (action === "update-auto-mode") {
        const { team_id, auto_mode } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        if (typeof auto_mode !== "boolean") {
          throw new Error("auto_mode must be a boolean");
        }

        console.log("[Team Operations] 更新自動模式:", team_id, auto_mode);

        // 檢查用戶是否為該團隊的 owner 或 admin
        const { data: member, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("role, can_manage_settings")
          .eq("team_id", team_id)
          .eq("user_id", user.id)
          .single();

        if (memberError || !member) {
          throw new Error("You are not a member of this team");
        }

        if (
          member.role !== "owner" &&
          member.role !== "admin" &&
          !member.can_manage_settings
        ) {
          throw new Error("You don't have permission to update team settings");
        }

        // 更新團隊的自動模式設定
        const { error: updateError } = await supabaseAdmin
          .from("teams")
          .update({ auto_mode: auto_mode })
          .eq("id", team_id);

        if (updateError) {
          console.error("[Team Operations] 更新失敗:", updateError);
          throw updateError;
        }

        console.log("[Team Operations] ✅ 自動模式更新成功");

        return new Response(
          JSON.stringify({
            success: true,
            message: "Auto mode updated successfully",
            auto_mode: auto_mode,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 更新配送設定
      if (action === "delivery-settings/update") {
        const { team_id, ...settings } = body;

        if (!team_id) {
          throw new Error("Missing team_id");
        }

        console.log("[Team Operations] 更新配送設定:", team_id);

        // 檢查用戶是否為該團隊的 owner 或 admin
        const { data: member, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("role, can_manage_settings")
          .eq("team_id", team_id)
          .eq("user_id", user.id)
          .single();

        if (memberError || !member) {
          throw new Error("You are not a member of this team");
        }

        if (
          member.role !== "owner" &&
          member.role !== "admin" &&
          !member.can_manage_settings
        ) {
          throw new Error("You don't have permission to update team settings");
        }

        // 更新配送設定
        const { error: updateError } = await supabaseAdmin
          .from("team_settings")
          .update(settings)
          .eq("team_id", team_id);

        if (updateError) {
          console.error("[Team Operations] 更新配送設定失敗:", updateError);
          throw updateError;
        }

        console.log("[Team Operations] ✅ 配送設定更新成功");

        return new Response(
          JSON.stringify({
            success: true,
            message: "Delivery settings updated successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown POST action: ${action}`);
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    console.error("[Team Operations] 錯誤:", error);

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
