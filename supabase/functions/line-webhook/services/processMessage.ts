import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  AIParseResult,
  ConversationMessage,
  TeamContext,
} from "../../_shared/types.ts";
import {
  ensureConversation,
  ensureConversationDisplayName,
  fetchConversationHistory,
  updateConversationData,
} from "./conversation.ts";
import {
  fetchLineProfile,
  saveIncomingMessage,
  updateMessageConversation,
} from "./message.ts";
import { callAIParser, mergeCollectedData } from "./ai.ts";
import { completeConversationSafe, createOrderFromAIResult } from "./order.ts";
import type { Team } from "./team.ts";
import { replyLineMessage } from "../lib/line.ts";

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

  const isOrderRelated =
    aiResult.intent === "order" ||
    aiResult.stage === "ordering" ||
    aiResult.stage === "delivery" ||
    aiResult.stage === "contact";

  if (!isOrderRelated && conversation.status === "collecting_info") {
    await supabaseAdmin
      .from("conversations")
      .update({
        status: "abandoned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
    return;
  }

  const hasOrder = aiResult.intent === "order" && aiResult.order;
  const isCompleteOrder =
    hasOrder &&
    aiResult.order &&
    (!aiResult.missing_fields || aiResult.missing_fields.length === 0);

  // 完整訂單：自動建單（全自動和半自動都建單）
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

    const modeLabel = team.auto_mode ? "auto" : "semi";
    console.log(`[Webhook][${modeLabel}] create_order_from_ai success`, {
      conversationId: conversation.id,
      orderId,
    });

    await completeConversationSafe(
      supabaseAdmin,
      conversation.id,
      orderId,
      modeLabel
    );

    // 全自動模式：回覆客人
    // 半自動模式：不回覆客人
    if (team.auto_mode) {
      const { data: orderDetail } = await supabaseAdmin
        .from("orders")
        .select("order_number, pickup_date, pickup_time")
        .eq("id", orderId)
        .single();

      const confirmMsg =
        `✅ 訂單已確認！\n\n` +
        `訂單編號：${orderDetail?.order_number || "處理中"}\n` +
        `交付日期：${
          aiResult.order.delivery_date || aiResult.order.pickup_date || ""
        }` +
        `${
          aiResult.order.delivery_time || aiResult.order.pickup_time
            ? ` ${aiResult.order.delivery_time || aiResult.order.pickup_time}`
            : ""
        }\n` +
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
    }

    return;
  }

  // 非完整訂單：只有全自動模式才回覆 AI 建議
  if (team.auto_mode) {
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
  // 半自動模式：不回覆任何訊息（靜默處理）
}
