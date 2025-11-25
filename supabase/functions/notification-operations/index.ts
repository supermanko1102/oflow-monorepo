// OFlow Notification Operations API
// 功能：註冊/註銷裝置的 Expo Push Token，供後續事件觸發推播使用。
// 備註：需建立 public.user_push_tokens 資料表（見下方註解）。

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

type Platform = "ios" | "android" | "web" | "unknown";

type RegisterPayload = {
  expo_push_token: string;
  team_id?: string | null;
  platform?: Platform;
  device_id?: string;
  app_version?: string;
  project_id?: string;
};

// 需要的資料表結構（供參考）
// CREATE TABLE public.user_push_tokens (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid REFERENCES public.users(id),
//   team_id uuid REFERENCES public.teams(id),
//   expo_push_token text NOT NULL UNIQUE,
//   platform text,
//   device_id text,
//   app_version text,
//   project_id text,
//   status text DEFAULT 'active', -- active | revoked
//   last_seen_at timestamptz DEFAULT now(),
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );

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

  const { data: publicUser, error: publicUserError } = await supabaseAdmin
    .from("users")
    .select("id, line_display_name")
    .eq("auth_user_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return publicUser;
}

function createSupabaseAdmin() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createSupabaseAdmin();
    const user = await authenticateUser(req, supabaseAdmin);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // 註冊或更新 token
    if (req.method === "POST" && action === "register") {
      const body = (await req.json()) as RegisterPayload;
      if (!body.expo_push_token) {
        throw new Error("Missing expo_push_token");
      }

      const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from("user_push_tokens").upsert(
        {
          user_id: user.id,
          team_id: body.team_id ?? null,
          expo_push_token: body.expo_push_token,
          platform: body.platform ?? "unknown",
          device_id: body.device_id ?? null,
          app_version: body.app_version ?? null,
          project_id: body.project_id ?? null,
          status: "active",
          last_seen_at: now,
          updated_at: now,
        },
        {
          onConflict: "expo_push_token",
        }
      );

      if (error) {
        console.error("[Notification Operations] register error", error);
        throw new Error("Failed to register push token");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 註銷 token
    if (req.method === "POST" && action === "unregister") {
      const body = (await req.json()) as { expo_push_token?: string };
      if (!body.expo_push_token) {
        throw new Error("Missing expo_push_token");
      }

      const { error } = await supabaseAdmin
        .from("user_push_tokens")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("expo_push_token", body.expo_push_token)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Notification Operations] unregister error", error);
        throw new Error("Failed to unregister push token");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 取得使用者的 tokens（除錯用）
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabaseAdmin
        .from("user_push_tokens")
        .select(
          "id, team_id, expo_push_token, platform, device_id, app_version, status, last_seen_at, created_at, updated_at",
        )
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false });

      if (error) {
        console.error("[Notification Operations] list error", error);
        throw new Error("Failed to fetch push tokens");
      }

      return new Response(
        JSON.stringify({ success: true, tokens: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Unsupported action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Notification Operations] error", error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
