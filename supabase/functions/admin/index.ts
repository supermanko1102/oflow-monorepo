// Admin Backoffice API
// 只允許 admin_users 白名單的 JWT 操作（跨團隊資料）

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupabaseAdmin = ReturnType<typeof createClient>;

async function authenticateUser(req: Request, supabaseAdmin: SupabaseAdmin) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");

  return user;
}

async function assertAdmin(
  supabaseAdmin: SupabaseAdmin,
  authUserId: string
): Promise<void> {
  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("disabled", false)
    .maybeSingle();

  if (error) throw error;
  if (!admin) throw new Error("Forbidden: admin only");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const authUser = await authenticateUser(req, supabaseAdmin);

    // Admin gate
    await assertAdmin(supabaseAdmin, authUser.id);

    if (req.method === "GET") {
      // 全域列出團隊
      if (action === "teams") {
        const { data: teams, error } = await supabaseAdmin
          .from("teams")
          .select(
            "id, name, slug, subscription_status, member_count, total_orders, line_channel_id, line_channel_name, auto_mode, business_type, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            teams: (teams || []).map((t) => ({
              team_id: t.id,
              team_name: t.name,
              team_slug: t.slug,
              subscription_status: t.subscription_status,
              member_count: t.member_count,
              order_count: t.total_orders,
              line_channel_id: t.line_channel_id,
              line_channel_name: t.line_channel_name,
              auto_mode: t.auto_mode,
              business_type: t.business_type,
              created_at: t.created_at,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown GET action: ${action}`);
    }

    if (req.method === "POST") {
      if (action === "verify-line") {
        const body = await req.json();
        const {
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
        } = body || {};

        if (
          !line_channel_id ||
          !line_channel_secret ||
          !line_channel_access_token
        ) {
          throw new Error("Missing required LINE settings");
        }

        if (!/^\d+$/.test(String(line_channel_id).trim())) {
          throw new Error("Channel ID 格式不正確，應該是純數字");
        }

        // 取得 Bot User ID
        const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
          method: "GET",
          headers: { Authorization: `Bearer ${line_channel_access_token}` },
        });
        if (!botInfoResponse.ok) {
          const errorText = await botInfoResponse.text();
          throw new Error(
            `驗證 LINE Channel Access Token 失敗: ${botInfoResponse.status} ${errorText}`
          );
        }
        const botInfo = await botInfoResponse.json();
        const lineBotUserId = botInfo.userId;
        if (!lineBotUserId) throw new Error("無法取得 LINE Bot User ID");

        // 設定 webhook 並測試
        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;
        const setWebhookResponse = await fetch(
          "https://api.line.me/v2/bot/channel/webhook/endpoint",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${line_channel_access_token}`,
            },
            body: JSON.stringify({ endpoint: webhookUrl }),
          }
        );
        if (!setWebhookResponse.ok) {
          const errorData = await setWebhookResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to set webhook endpoint: ${setWebhookResponse.status}`
          );
        }

        let webhookTestSuccess = false;
        try {
          const testWebhookResponse = await fetch(
            "https://api.line.me/v2/bot/channel/webhook/test",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${line_channel_access_token}`,
              },
              body: JSON.stringify({ endpoint: webhookUrl }),
            }
          );
          if (testWebhookResponse.ok) {
            const testResult = await testWebhookResponse.json();
            webhookTestSuccess = testResult.success === true;
          }
        } catch (_err) {
          // 忍受測試失敗，交由前端決定是否允許
        }

        return new Response(
          JSON.stringify({
            success: true,
            line_bot_user_id: lineBotUserId,
            webhook_url: webhookUrl,
            webhook_test_success: webhookTestSuccess,
            bot_name: botInfo.displayName,
            bot_picture_url: botInfo.pictureUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "create-invite") {
        const body = await req.json();
        const { team_id, role = "owner", max_uses = 1 } = body || {};
        if (!team_id) throw new Error("Missing team_id");

        // 產生唯一邀請碼
        let inviteCode: string | null = null;
        for (let i = 0; i < 5; i++) {
          const code = `ADMIN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const { data: exists } = await supabaseAdmin
            .from("team_invites")
            .select("id")
            .eq("invite_code", code)
            .maybeSingle();
          if (!exists) {
            inviteCode = code;
            break;
          }
        }
        if (!inviteCode) {
          throw new Error("Failed to generate invite code");
        }

        const { data, error } = await supabaseAdmin
          .from("team_invites")
          .insert({
            team_id,
            invite_code: inviteCode,
            role,
            max_uses,
            is_active: true,
          })
          .select("invite_code")
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            invite_code: data?.invite_code,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "create-team") {
        const body = await req.json();
        const {
          team_name,
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
          line_channel_name,
          business_type,
          owner_user_id,
          slug,
        } = body || {};
        if (!team_name) throw new Error("Missing team_name");

        // 若提供 owner_user_id，走既有 RPC
        if (owner_user_id) {
          const { data: teamData, error } = await supabaseAdmin.rpc(
            "create_team_with_owner",
            {
              p_user_id: owner_user_id,
              p_team_name: team_name,
              p_line_channel_id: line_channel_id || null,
              p_business_type: business_type || "bakery",
            }
          );
          if (error) throw error;
          const team = teamData?.[0];

          return new Response(
            JSON.stringify({
              success: true,
              team: team
                ? {
                    id: team.team_id,
                    name: team.team_name,
                    slug: team.team_slug,
                    invite_code: team.invite_code,
                  }
                : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 否則：直接插入 teams（無成員），供後續邀請碼加入
        const generatedSlug =
          slug ||
          `${team_name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 32) || `team-${crypto.randomUUID().slice(0, 6)}`;

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("teams")
          .insert({
            name: team_name,
            slug: generatedSlug,
            line_channel_id: line_channel_id || null,
            line_channel_secret: line_channel_secret || null,
            line_channel_access_token: line_channel_access_token || null,
            line_channel_name: line_channel_name || null,
            business_type: business_type || "bakery",
            line_webhook_verified: false,
          })
          .select("id, name, slug")
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({
            success: true,
            team: inserted,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "update-line-settings") {
        const body = await req.json();
        const {
          team_id,
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
          line_channel_name,
        } = body || {};
        if (!team_id) throw new Error("Missing team_id");
        if (
          !line_channel_id ||
          !line_channel_secret ||
          !line_channel_access_token
        ) {
          throw new Error("Missing required LINE settings");
        }

        // 取得 Bot User ID
        let lineBotUserId: string | null = null;
        const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
          method: "GET",
          headers: { Authorization: `Bearer ${line_channel_access_token}` },
        });
        if (!botInfoResponse.ok) {
          const errorText = await botInfoResponse.text();
          throw new Error(
            `驗證 LINE Channel Access Token 失敗: ${botInfoResponse.status} ${errorText}`
          );
        }
        const botInfo = await botInfoResponse.json();
        lineBotUserId = botInfo.userId;
        if (!lineBotUserId) throw new Error("無法取得 LINE Bot User ID");

        const { error } = await supabaseAdmin
          .from("teams")
          .update({
            line_channel_id,
            line_channel_secret,
            line_channel_access_token,
            line_channel_name: line_channel_name || null,
            line_bot_user_id: lineBotUserId,
            line_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", team_id);
        if (error) throw error;

        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;
        return new Response(
          JSON.stringify({
            success: true,
            webhook_url: webhookUrl,
            message: "LINE settings updated (admin)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown POST action: ${action}`);
    }

    throw new Error(`Unsupported method: ${req.method}`);
  } catch (error) {
    console.error("[Admin] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
