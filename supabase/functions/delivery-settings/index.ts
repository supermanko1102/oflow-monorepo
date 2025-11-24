// OFlow Delivery Settings API
// 專職處理團隊配送設定的查詢與更新（店取/面交/超商/宅配）

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
    .select("id, auth_user_id, line_display_name")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return publicUser;
}

// 驗證是否為團隊成員
async function verifyTeamMember(
  supabaseAdmin: any,
  userId: string,
  teamId: string
) {
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("role, can_manage_settings")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw error;
  }

  const member = data?.[0];

  if (!member) {
    throw new Error("You are not a member of this team");
  }

  return member;
}

// 允許更新設定的角色
function canUpdateSettings(member: any): boolean {
  return (
    member.role === "owner" ||
    member.role === "admin" ||
    member.can_manage_settings === true
  );
}

// 預設配送設定
const defaultSettings = {
  pickup_settings: {
    store_pickup: { enabled: false, address: null, business_hours: null },
    meetup: { enabled: false, available_areas: [] as string[], note: null },
  },
  enable_convenience_store: true,
  enable_black_cat: true,
};

serve(async (req) => {
  // Handle CORS preflight
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

    const user = await authenticateUser(req, supabaseAdmin);
    console.log("[Delivery Settings] User:", user.id, user.line_display_name);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: 查詢設定
    if (req.method === "GET" && action === "delivery-settings") {
      const teamId = url.searchParams.get("team_id");
      if (!teamId) {
        throw new Error("Missing team_id parameter");
      }

      await verifyTeamMember(supabaseAdmin, user.id, teamId);
      console.log("[Delivery Settings] 查詢設定:", teamId);

      const { data: settings, error } = await supabaseAdmin
        .from("team_settings")
        .select("pickup_settings, enable_convenience_store, enable_black_cat")
        .eq("team_id", teamId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[Delivery Settings] 查詢設定失敗:", error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          settings: settings || defaultSettings,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST: 更新設定
    if (req.method === "POST" && action === "delivery-settings/update") {
      const body = await req.json();
      const { team_id, ...settings } = body;

      if (!team_id) {
        throw new Error("Missing team_id");
      }

      const member = await verifyTeamMember(supabaseAdmin, user.id, team_id);
      if (!canUpdateSettings(member)) {
        throw new Error("You don't have permission to update team settings");
      }

      console.log("[Delivery Settings] 更新設定:", team_id);

      const { error: upsertError } = await supabaseAdmin
        .from("team_settings")
        .upsert(
          {
            team_id,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "team_id",
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        console.error("[Delivery Settings] 更新失敗:", upsertError);
        throw upsertError;
      }

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

    throw new Error(`Unknown route: ${req.method} ${action}`);
  } catch (error) {
    console.error("[Delivery Settings] 錯誤:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
