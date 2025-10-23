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
  const { data: publicUser, error: publicUserError } = await supabaseAdmin
    .from("users")
    .select("id, line_user_id, line_display_name")
    .eq("line_user_id", user.user_metadata.line_user_id)
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
