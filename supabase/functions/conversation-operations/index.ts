// OFlow Conversation Operations API
// 處理所有對話相關操作（Inbox）

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
    .select("id, line_user_id, apple_user_id, line_display_name, auth_provider")
    .eq("auth_user_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return publicUser;
}

// 驗證使用者是否為團隊成員
async function verifyTeamMembership(
  supabaseAdmin: any,
  userId: string,
  teamId: string
) {
  const { data: member, error } = await supabaseAdmin
    .from("team_members")
    .select("role, can_manage_orders")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (error || !member) {
    throw new Error("You are not a member of this team");
  }

  return member;
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
    console.log(
      "[Conversation Operations] User:",
      user.id,
      user.line_display_name
    );

    // 解析請求
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // GET 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      // 查詢對話列表
      if (action === "list") {
        const teamId = url.searchParams.get("team_id");
        const status = url.searchParams.get("status") || "collecting_info"; // collecting_info, completed, abandoned
        const limit = parseInt(url.searchParams.get("limit") || "20");

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Conversation Operations] 查詢對話列表:", teamId, status);

        const { data: conversations, error } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", status)
          .order("last_message_at", { ascending: false })
          .limit(limit);

        if (error) {
          throw error;
        }

        // 補充每個對話的最後一條訊息
        const enrichedConversations = await Promise.all(
          (conversations || []).map(async (conv: any) => {
            const { data: history } = await supabaseAdmin.rpc(
              "get_conversation_history",
              {
                p_conversation_id: conv.id,
                p_limit: 1,
              }
            );
            return {
              ...conv,
              lastMessage: history && history.length > 0 ? history[0] : null,
            };
          })
        );

        return new Response(
          JSON.stringify({
            success: true,
            conversations: enrichedConversations,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢對話詳情（含歷史訊息）
      if (action === "detail") {
        const conversationId = url.searchParams.get("conversation_id");

        if (!conversationId) {
          throw new Error("Missing conversation_id parameter");
        }

        console.log("[Conversation Operations] 查詢對話詳情:", conversationId);

        const { data: conversation, error } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (error) {
          throw error;
        }

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          conversation.team_id
        );

        // 取得歷史訊息
        const { data: history, error: historyError } = await supabaseAdmin.rpc(
          "get_conversation_history",
          {
            p_conversation_id: conversationId,
            p_limit: 50, // 限制 50 條
          }
        );

        if (historyError) {
          throw historyError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            conversation,
            history: history || [],
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

      // 忽略對話
      if (action === "ignore") {
        const { conversation_id } = body;

        if (!conversation_id) {
          throw new Error("Missing conversation_id");
        }

        // 先取得對話資訊
        const { data: conversation, error: fetchError } = await supabaseAdmin
          .from("conversations")
          .select("team_id")
          .eq("id", conversation_id)
          .single();

        if (fetchError || !conversation) {
          throw new Error("Conversation not found");
        }

        // 驗證權限
        await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          conversation.team_id
        );

        // 更新狀態為 abandoned
        const { error: updateError } = await supabaseAdmin
          .from("conversations")
          .update({
            status: "abandoned",
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Conversation ignored",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 確認建單（從對話建立訂單）
      if (action === "confirm") {
        const { conversation_id, order_data } = body;

        if (!conversation_id || !order_data) {
          throw new Error("Missing conversation_id or order_data");
        }

        // 先取得對話資訊
        const { data: conversation, error: fetchError } = await supabaseAdmin
          .from("conversations")
          .select("team_id, line_user_id")
          .eq("id", conversation_id)
          .single();

        if (fetchError || !conversation) {
          throw new Error("Conversation not found");
        }

        // 驗證權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          conversation.team_id
        );
        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to create orders");
        }

        // 呼叫 create_order_from_ai
        // 注意：這裡我們模擬一個 LINE Message ID，或者需要從歷史訊息中找到最後一條
        // 為了簡化，我們可能需要一個 dummy message ID 或者修改 create_order_from_ai 允許 null
        // 但目前 create_order_from_ai 需要 p_line_message_id

        // 解決方案：先查詢最後一條訊息的 ID
        const { data: lastMessage } = await supabaseAdmin
          .from("line_messages")
          .select("id, message_text")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastMessage) {
          throw new Error("No messages found in conversation");
        }

        const { data: orderId, error: createError } = await supabaseAdmin.rpc(
          "create_order_from_ai",
          {
            p_team_id: conversation.team_id,
            p_customer_name: order_data.customerName,
            p_customer_phone: order_data.customerPhone,
            p_items: order_data.items,
            p_total_amount: order_data.totalAmount,
            p_pickup_date: order_data.pickupDate,
            p_pickup_time: order_data.pickupTime || "00:00",
            p_status: "pending",
            p_line_message_id: lastMessage.id,
            p_original_message: lastMessage.message_text,
            p_customer_notes: order_data.customerNotes,
            p_conversation_id: conversation_id,
          }
        );

        if (createError) {
          throw createError;
        }

        // 標記對話完成 (create_order_from_ai 內部可能沒有做這一步，或者只做了部分)
        // 檢查 create_order_from_ai 實作：它只做了 INSERT orders 和 UPDATE line_messages
        // 它沒有呼叫 complete_conversation

        // 所以我們需要手動呼叫 complete_conversation
        await supabaseAdmin.rpc("complete_conversation", {
          p_conversation_id: conversation_id,
          p_order_id: orderId,
        });

        return new Response(
          JSON.stringify({
            success: true,
            orderId,
            message: "Order created successfully",
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
    console.error("[Conversation Operations] 錯誤:", error);

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
