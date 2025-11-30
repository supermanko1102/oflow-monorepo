import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { AIParseResult } from "../../_shared/types.ts";
import { sendExpoPushNotifications } from "../../_shared/expoPush.ts";

type OrderDetail = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  delivery_method: string | null;
  total_amount: number | null;
};

export async function createOrderFromAIResult(
  supabase: SupabaseClient,
  teamId: string,
  conversationId: string,
  lineUserId: string,
  lineMessageId: string,
  aiOrder: NonNullable<AIParseResult["order"]>,
  sourceNote: string
): Promise<string> {
  const appointmentDate = aiOrder.delivery_date || aiOrder.pickup_date || null;
  const appointmentTime =
    aiOrder.delivery_time || aiOrder.pickup_time || "00:00";
  const orderStatus = appointmentDate ? "pending" : "draft";
  const totalAmount = aiOrder.total_amount || 0;

  const { data: orderId, error } = await supabase.rpc(
    "create_order_from_ai",
    {
      p_team_id: teamId,
      p_customer_name: aiOrder.customer_name || "LINE 顧客",
      p_customer_phone: aiOrder.customer_phone || null,
      p_items: aiOrder.items,
      p_total_amount: totalAmount,
      p_line_message_id: lineMessageId,
      p_original_message: sourceNote,
      p_appointment_date: appointmentDate,
      p_appointment_time: appointmentTime,
      p_status: orderStatus,
      p_delivery_method: aiOrder.delivery_method || "pickup",
      p_pickup_type: aiOrder.pickup_type || null,
      p_pickup_location: aiOrder.pickup_location || null,
      p_requires_frozen: aiOrder.requires_frozen || false,
      p_store_info: aiOrder.store_info || null,
      p_shipping_address: aiOrder.shipping_address || null,
      p_service_duration: aiOrder.service_duration || null,
      p_service_notes: aiOrder.service_notes || null,
      p_customer_notes: aiOrder.customer_notes || null,
      p_conversation_id: conversationId,
    }
  );

  if (error || !orderId) {
    throw error || new Error("create_order_from_ai failed");
  }
  return orderId as string;
}

async function fetchEligibleMemberIds(
  supabase: SupabaseClient,
  teamId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("user_id, role, can_manage_orders")
    .eq("team_id", teamId);

  if (error) {
    console.error("[Webhook] fetch team members for push failed", error);
    return [];
  }

  return (
    data
      ?.filter(
        (m) =>
          m.role === "owner" ||
          m.role === "admin" ||
          m.can_manage_orders === true
      )
      .map((m) => m.user_id)
      .filter(Boolean) || []
  );
}

async function fetchPushTokens(
  supabase: SupabaseClient,
  teamId: string,
  userIds: string[]
): Promise<string[]> {
  if (!userIds.length) return [];

  const { data, error } = await supabase
    .from("user_push_tokens")
    .select("expo_push_token, status, team_id, user_id")
    .in("user_id", userIds)
    .eq("status", "active")
    .or(`team_id.eq.${teamId},team_id.is.null`);

  if (error) {
    console.error("[Webhook] fetch push tokens failed", error);
    return [];
  }

  const tokens = new Set<string>();
  data?.forEach((row) => {
    if (row.expo_push_token) tokens.add(row.expo_push_token);
  });
  return Array.from(tokens);
}

async function sendNewOrderNotification(
  supabase: SupabaseClient,
  teamId: string,
  order: OrderDetail,
  modeLabel: "auto" | "semi"
) {
  const memberIds = await fetchEligibleMemberIds(supabase, teamId);
  const tokens = await fetchPushTokens(supabase, teamId, memberIds);
  if (!tokens.length) {
    return;
  }

  const date =
    order.pickup_date ||
    "";
  const time = order.pickup_time ? ` ${order.pickup_time}` : "";
  const amount =
    typeof order.total_amount === "number"
      ? `，金額 NT$ ${Math.round(order.total_amount)}`
      : "";

  const bodyParts = [
    order.customer_name || "新客人",
    date ? `${date}${time}` : null,
    amount || null,
  ].filter(Boolean);

  const messages = tokens.map((to) => ({
    to,
    title: "AI 建立新訂單",
    body: `${order.order_number || ""} ${bodyParts.join(" / ")}`.trim(),
    data: {
      type: "new_order",
      order_id: order.id,
      team_id: teamId,
      mode: modeLabel,
    },
    sound: "default",
    priority: "high" as const,
  }));

  try {
    await sendExpoPushNotifications(messages);
  } catch (err) {
    console.error("[Webhook] send push failed", err);
  }
}

export async function completeConversationSafe(
  supabase: SupabaseClient,
  conversationId: string,
  orderId: string,
  modeLabel: "auto" | "semi"
) {
  const { error: completeErr } = await supabase.rpc(
    "complete_conversation",
    {
      p_conversation_id: conversationId,
      p_order_id: orderId,
    }
  );
  if (completeErr) {
    console.error(`[Webhook][${modeLabel}] complete_conversation failed`, {
      conversationId,
      orderId,
      error: completeErr,
    });
  }

  const { error: enforceError } = await supabase
    .from("conversations")
    .update({
      status: "completed",
      order_id: orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  if (enforceError) {
    console.error(`[Webhook][${modeLabel}] enforce completed failed`, {
      conversationId,
      orderId,
      error: enforceError,
    });
  }
}

export async function notifyNewOrder(
  supabase: SupabaseClient,
  teamId: string,
  order: OrderDetail,
  modeLabel: "auto" | "semi"
) {
  await sendNewOrderNotification(supabase, teamId, order, modeLabel);
}
