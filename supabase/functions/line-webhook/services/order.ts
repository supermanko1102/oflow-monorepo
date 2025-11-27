import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { AIParseResult } from "../../_shared/types.ts";

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
