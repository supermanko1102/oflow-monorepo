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
      if (action === "create-team") {
        const body = await req.json();
        const { team_name, line_channel_id, business_type, owner_user_id } =
          body || {};
        if (!team_name) throw new Error("Missing team_name");
        if (!owner_user_id) throw new Error("Missing owner_user_id");

        // 直接呼叫 create_team_with_owner，但用 admin 指定 owner
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
