import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  AIParseResult,
  ConversationMessage,
  TeamContext,
} from "../../_shared/types.ts";
import { MERCHANT_CONFIRM_KEYWORDS, ORDER_CONFIRMATION_KEYWORDS } from "../types.ts";
import {
  ensureConversation,
  ensureConversationDisplayName,
  fetchConversationHistory,
  updateConversationData,
} from "./conversation.ts";
import { fetchLineProfile, saveIncomingMessage, updateMessageConversation } from "./message.ts";
import { callAIParser, mergeCollectedData } from "./ai.ts";
import { completeConversationSafe, createOrderFromAIResult } from "./order.ts";
import type { Team } from "./team.ts";
import { replyLineMessage } from "../lib/line.ts";

function hasMerchantConfirmKeyword(message: string): boolean {
  const trimmed = message.trim();
  return MERCHANT_CONFIRM_KEYWORDS.some((kw) => trimmed.includes(kw));
}

export async function processMessageEvent({
  supabaseAdmin,
  team,
  event,
}: {
  supabaseAdmin: SupabaseClient;
  team: Team;
  event: any;
}) {
  const messageText = event.message.text || "";
  const lineUserId = event.source.userId;
  const lineMessageId = event.message.id;
  const lineProfile = await fetchLineProfile(
    lineUserId,
    team.line_channel_access_token
  );

  const savedMessage = await saveIncomingMessage(
    supabaseAdmin,
    team.id,
    lineMessageId,
    lineUserId,
    messageText,
    lineProfile
  );

  let conversation = await ensureConversation(
    supabaseAdmin,
    team.id,
    lineUserId
  );
  conversation = (await ensureConversationDisplayName(
    supabaseAdmin,
    conversation,
    lineProfile?.displayName
  )) as any;

  await updateMessageConversation(
    supabaseAdmin,
    savedMessage.id,
    conversation.id,
    lineProfile,
    savedMessage.message_data
  );

  const conversationHistory: ConversationMessage[] =
    await fetchConversationHistory(supabaseAdmin, conversation.id, 15);

  const aiResult: AIParseResult = await callAIParser(
    messageText,
    team,
    conversationHistory,
    conversation.collected_data
  );

  const { collected, missing } = mergeCollectedData(
    conversation.collected_data,
    aiResult
  );
  await updateConversationData(
    supabaseAdmin,
    conversation.id,
    collected,
    missing
  );

  const hasOrder = aiResult.intent === "order" && aiResult.order;
  const isCompleteOrder =
    hasOrder &&
    aiResult.order &&
    (!aiResult.missing_fields || aiResult.missing_fields.length === 0);

  // 半自動模式：僅商家關鍵字 + 完整資料才建單；不回覆客戶
  const merchantLineUserIds = await fetchMerchantLineUserIds(supabaseAdmin, team.id);
  const isMerchant = merchantLineUserIds.has(lineUserId);
  const merchantTriggered =
    !team.auto_mode && isMerchant && hasMerchantConfirmKeyword(messageText);

  if (!team.auto_mode) {
    if (merchantTriggered && isCompleteOrder && aiResult.order) {
      const orderId = await createOrderFromAIResult(
        supabaseAdmin,
        team.id,
        conversation.id,
        lineUserId,
        savedMessage.id,
        aiResult.order,
        messageText
      );

      console.log("[Webhook][semi-auto] create_order_from_ai success", {
        conversationId: conversation.id,
        orderId,
      });

      await completeConversationSafe(
        supabaseAdmin,
        conversation.id,
        orderId,
        "semi"
      );

      // 記錄一筆系統訊息（不回覆客戶）
      await supabaseAdmin.from("line_messages").insert({
        team_id: team.id,
        line_user_id: lineUserId,
        message_type: "text",
        message_text: "系統已依商家確認建單",
        role: "ai",
        conversation_id: conversation.id,
        order_id: orderId,
      });
    }
    // 半自動模式不回覆客戶
    return;
  }

  // 全自動模式：完整訂單即建單並回覆
  if (isCompleteOrder && aiResult.order) {
    const orderId = await createOrderFromAIResult(
      supabaseAdmin,
      team.id,
      conversation.id,
      lineUserId,
      savedMessage.id,
      aiResult.order,
      messageText
    );

    console.log("[Webhook][auto] create_order_from_ai success", {
      conversationId: conversation.id,
      orderId,
    });

    await completeConversationSafe(
      supabaseAdmin,
      conversation.id,
      orderId,
      "auto"
    );

    const { data: orderDetail } = await supabaseAdmin
      .from("orders")
      .select("order_number, pickup_date, pickup_time")
      .eq("id", orderId)
      .single();

    const confirmMsg =
      `✅ 訂單已確認！\n\n` +
      `訂單編號：${orderDetail?.order_number || "處理中"}\n` +
      `交付日期：${aiResult.order.delivery_date || aiResult.order.pickup_date || ""}` +
      `${aiResult.order.delivery_time || aiResult.order.pickup_time ? ` ${aiResult.order.delivery_time || aiResult.order.pickup_time}` : ""}\n` +
      (aiResult.order.total_amount
        ? `金額：NT$ ${aiResult.order.total_amount}`
        : "");

    await replyLineMessage(
      event.replyToken,
      [{ type: "text", text: confirmMsg }],
      team.line_channel_access_token
    );

    await supabaseAdmin.from("line_messages").insert({
      team_id: team.id,
      line_user_id: lineUserId,
      message_type: "text",
      message_text: confirmMsg,
      role: "ai",
      conversation_id: conversation.id,
      order_id: orderId,
    });

    return;
  }

  // 非完整訂單：回覆 AI 建議或暫存
  const replyText =
    aiResult.suggested_reply ||
    (hasOrder
      ? "已收到您的訂單資訊，請再補充缺少的資料。"
      : "已收到您的訊息，謝謝！");

  await replyLineMessage(
    event.replyToken,
    [{ type: "text", text: replyText }],
    team.line_channel_access_token
  );

  await supabaseAdmin.from("line_messages").insert({
    team_id: team.id,
    line_user_id: lineUserId,
    message_type: "text",
    message_text: replyText,
    role: "ai",
    conversation_id: conversation.id,
  });
}

async function fetchMerchantLineUserIds(
  supabase: SupabaseClient,
  teamId: string
): Promise<Set<string>> {
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, can_manage_orders")
    .eq("team_id", teamId);

  const allowedUserIds =
    members
      ?.filter(
        (m) =>
          m.can_manage_orders || m.role === "owner" || m.role === "admin"
      )
      .map((m) => m.user_id) || [];

  if (allowedUserIds.length === 0) return new Set<string>();

  const { data: users } = await supabase
    .from("users")
    .select("id, line_user_id")
    .in("id", allowedUserIds);

  return new Set(
    (users || [])
      .map((u) => u.line_user_id)
      .filter((id): id is string => Boolean(id))
  );
}
