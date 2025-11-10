// OFlow Order Operations API
// 處理所有訂單相關操作（查詢列表、查詢詳情、更新狀態、更新資料）

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

// 將資料庫訂單格式轉換為前端格式
function transformOrderToClient(order: any, conversation?: any[]) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerId: order.customer_id,
    items: order.items,
    totalAmount: parseFloat(order.total_amount),

    // 新欄位（通用化）
    appointmentDate: order.pickup_date,
    appointmentTime: order.pickup_time,
    deliveryMethod: order.delivery_method || "pickup",

    // 商品型專屬
    requiresFrozen: order.requires_frozen || false,
    storeInfo: order.store_info,
    shippingAddress: order.shipping_address,

    // 服務型專屬
    serviceDuration: order.service_duration,
    serviceNotes: order.service_notes,

    status: order.status,
    source: order.source,
    notes: order.notes,
    customerNotes: order.customer_notes,
    conversationId: order.conversation_id,
    paymentMethod: order.payment_method || "cash", // 付款方式，預設為現金
    // 如果有對話記錄，使用新格式；否則回退到舊格式
    lineConversation:
      conversation || (order.original_message ? [order.original_message] : []),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    confirmedAt: order.confirmed_at,
    completedAt: order.completed_at,

    // 向後兼容（deprecated）
    pickupDate: order.pickup_date,
    pickupTime: order.pickup_time,
  };
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
    console.log("[Order Operations] User:", user.id, user.line_display_name);

    // 解析請求
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // GET 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      // 查詢訂單列表
      if (action === "list") {
        const teamId = url.searchParams.get("team_id");
        const status = url.searchParams.get("status");
        const dateFrom = url.searchParams.get("date_from");
        const dateTo = url.searchParams.get("date_to");
        const search = url.searchParams.get("search");

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Order Operations] 查詢訂單列表:", teamId, {
          status,
          dateFrom,
          dateTo,
          search,
        });

        // 建立查詢
        let query = supabaseAdmin
          .from("orders")
          .select("*")
          .eq("team_id", teamId)
          .order("pickup_date", { ascending: true })
          .order("pickup_time", { ascending: true });

        // 狀態篩選
        if (status && status !== "all") {
          query = query.eq("status", status);
        }

        // 日期範圍篩選
        if (dateFrom) {
          query = query.gte("pickup_date", dateFrom);
        }
        if (dateTo) {
          query = query.lte("pickup_date", dateTo);
        }

        // 搜尋篩選（客戶名稱或電話）
        if (search) {
          query = query.or(
            `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
          );
        }

        const { data: orders, error } = await query;

        if (error) {
          throw error;
        }

        // 轉換為前端格式
        const transformedOrders = (orders || []).map(transformOrderToClient);

        return new Response(
          JSON.stringify({
            success: true,
            orders: transformedOrders,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢 Dashboard 摘要（今日 + 未來訂單）
      if (action === "dashboard-summary") {
        const teamId = url.searchParams.get("team_id");

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Order Operations] 查詢 Dashboard 摘要:", teamId);

        // 取得今天的日期（格式：YYYY-MM-DD）
        const today = new Date().toISOString().split("T")[0];

        // 查詢今日待處理訂單
        const { data: todayPending, error: error1 } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "pending")
          .eq("pickup_date", today)
          .order("pickup_time", { ascending: true });

        if (error1) {
          throw error1;
        }

        // 查詢今日已完成訂單
        const { data: todayCompleted, error: error2 } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "completed")
          .eq("pickup_date", today)
          .order("pickup_time", { ascending: true });

        if (error2) {
          throw error2;
        }

        // 查詢未來訂單（限制 50 筆）
        const { data: future, error: error3 } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "pending")
          .gt("pickup_date", today)
          .order("pickup_date", { ascending: true })
          .order("pickup_time", { ascending: true })
          .limit(50);

        if (error3) {
          throw error3;
        }

        console.log("[Order Operations] Dashboard 摘要查詢完成:", {
          todayPending: todayPending?.length || 0,
          todayCompleted: todayCompleted?.length || 0,
          future: future?.length || 0,
        });

        // 轉換為前端格式
        return new Response(
          JSON.stringify({
            success: true,
            todayPending: (todayPending || []).map(transformOrderToClient),
            todayCompleted: (todayCompleted || []).map(transformOrderToClient),
            future: (future || []).map(transformOrderToClient),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢單一訂單詳情
      if (action === "detail") {
        const orderId = url.searchParams.get("order_id");

        if (!orderId) {
          throw new Error("Missing order_id parameter");
        }

        console.log("[Order Operations] 查詢訂單詳情:", orderId);

        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) {
          throw error;
        }

        if (!order) {
          throw new Error("Order not found");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, order.team_id);

        // 取得對話記錄（如果有 conversation_id）
        let conversationMessages = null;
        if (order.conversation_id) {
          console.log(
            "[Order Operations] 查詢對話記錄:",
            order.conversation_id
          );

          const { data: conversation, error: convError } =
            await supabaseAdmin.rpc("get_order_conversation", {
              p_order_id: orderId,
            });

          if (convError) {
            console.error("[Order Operations] 對話記錄查詢失敗:", convError);
            // 不中斷流程，只是沒有對話記錄
          } else if (conversation && conversation.length > 0) {
            conversationMessages = conversation.map((msg: any) => ({
              role: msg.role,
              message: msg.message,
              timestamp: msg.message_timestamp,
            }));
            console.log(
              "[Order Operations] 對話記錄數量:",
              conversationMessages
            );
          }
        }

        // 轉換為前端格式
        const transformedOrder = transformOrderToClient(
          order,
          conversationMessages || []
        );

        return new Response(
          JSON.stringify({
            success: true,
            order: transformedOrder,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢營收統計
      if (action === "revenue-stats") {
        const teamId = url.searchParams.get("team_id");
        const timeRange = url.searchParams.get("time_range") || "day";

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Order Operations] 查詢營收統計:", teamId, timeRange);

        // 計算日期範圍
        const now = new Date();
        let startDate: string;
        let endDate: string;

        switch (timeRange) {
          case "day":
            // 今天
            startDate = now.toISOString().split("T")[0];
            endDate = startDate;
            break;
          case "week":
            // 本週（週一到週日）
            const dayOfWeek = now.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 週日=0，調整為週一
            const monday = new Date(now);
            monday.setDate(now.getDate() + diff);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            startDate = monday.toISOString().split("T")[0];
            endDate = sunday.toISOString().split("T")[0];
            break;
          case "month":
            // 本月
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            startDate = firstDay.toISOString().split("T")[0];
            endDate = lastDay.toISOString().split("T")[0];
            break;
          case "year":
            // 本年
            startDate = `${now.getFullYear()}-01-01`;
            endDate = `${now.getFullYear()}-12-31`;
            break;
          default:
            throw new Error("Invalid time_range parameter");
        }

        console.log("[Order Operations] 日期範圍:", startDate, "到", endDate);

        // 查詢該時間範圍內已完成的訂單
        const { data: orders, error } = await supabaseAdmin
          .from("orders")
          .select("total_amount, payment_method")
          .eq("team_id", teamId)
          .eq("status", "completed")
          .gte("pickup_date", startDate)
          .lte("pickup_date", endDate);

        if (error) {
          throw error;
        }

        // 統計營收
        let totalRevenue = 0;
        const paymentStats = {
          cash: 0,
          transfer: 0,
          other: 0,
        };
        let orderCount = 0;

        (orders || []).forEach((order) => {
          const amount = parseFloat(order.total_amount);
          totalRevenue += amount;
          orderCount += 1;

          // 按付款方式分類（NULL 視為 cash）
          const method = order.payment_method || "cash";
          if (method in paymentStats) {
            paymentStats[method as keyof typeof paymentStats] += amount;
          }
        });

        console.log("[Order Operations] 營收統計完成:", {
          totalRevenue,
          orderCount,
          paymentStats,
        });

        return new Response(
          JSON.stringify({
            success: true,
            timeRange,
            startDate,
            endDate,
            totalRevenue,
            orderCount,
            paymentStats,
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

      // 更新訂單狀態
      if (action === "update-status") {
        const { order_id, status, payment_method } = body;

        if (!order_id || !status) {
          throw new Error("Missing order_id or status");
        }

        console.log("[Order Operations] 更新訂單狀態:", order_id, status, payment_method);

        // 先取得訂單資訊以驗證權限
        const { data: order, error: fetchError } = await supabaseAdmin
          .from("orders")
          .select("team_id")
          .eq("id", order_id)
          .single();

        if (fetchError || !order) {
          throw new Error("Order not found");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          order.team_id
        );

        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to manage orders");
        }

        // 更新訂單狀態
        const updateData: any = {
          status,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        };

        // 如果狀態變更為 completed，記錄完成時間和付款方式
        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
          // 如果提供了付款方式，則更新；否則預設為 cash
          updateData.payment_method = payment_method || "cash";
        }

        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("id", order_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Order status updated successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 更新訂單資料
      if (action === "update") {
        const { order_id, ...updates } = body;

        if (!order_id) {
          throw new Error("Missing order_id");
        }

        console.log("[Order Operations] 更新訂單:", order_id);

        // 先取得訂單資訊以驗證權限
        const { data: order, error: fetchError } = await supabaseAdmin
          .from("orders")
          .select("team_id")
          .eq("id", order_id)
          .single();

        if (fetchError || !order) {
          throw new Error("Order not found");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          order.team_id
        );

        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to manage orders");
        }

        // 準備更新資料（轉換欄位命名）
        const updateData: any = {
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        };

        // 允許更新的欄位
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.customer_notes !== undefined)
          updateData.customer_notes = updates.customer_notes;

        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("id", order_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Order updated successfully",
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
    console.error("[Order Operations] 錯誤:", error);

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
