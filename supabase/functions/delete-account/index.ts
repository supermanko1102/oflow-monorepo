// OFlow Delete Account API
// 處理用戶帳號刪除（符合 Apple App Store Guidelines 5.1.1v）

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
    .select("id, line_user_id, apple_user_id, line_display_name, auth_user_id, auth_provider")
    .eq("auth_user_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return { authUser: user, publicUser };
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

    // 只接受 POST 方法
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // 驗證使用者
    const { authUser, publicUser } = await authenticateUser(req, supabaseAdmin);
    console.log(
      "[Delete Account] User:",
      publicUser.id,
      publicUser.line_display_name || "Apple User",
      `(${publicUser.auth_provider})`
    );

    // 1. 呼叫 database function 刪除 public.users 和相關資料
    console.log("[Delete Account] 執行 delete_user_account function...");
    const { error: functionError } = await supabaseAdmin.rpc(
      "delete_user_account",
      {
        p_user_id: publicUser.id,
      }
    );

    if (functionError) {
      console.error("[Delete Account] Database function 失敗:", functionError);
      throw functionError;
    }

    console.log("[Delete Account] Database 資料已刪除");

    // 2. 刪除 auth.users 記錄（需要 service_role 權限）
    console.log("[Delete Account] 刪除 auth.users 記錄...");
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      authUser.id
    );

    if (authDeleteError) {
      console.error("[Delete Account] auth.users 刪除失敗:", authDeleteError);
      // 不拋出錯誤，因為主要資料已經刪除
      console.warn("[Delete Account] 繼續執行，但需手動清理 auth.users");
    } else {
      console.log("[Delete Account] auth.users 記錄已刪除");
    }

    console.log("[Delete Account] ✅ 帳號刪除完成");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Delete Account] 錯誤:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: error.message === "Invalid token" ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

