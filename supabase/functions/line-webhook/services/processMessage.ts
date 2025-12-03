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
  findActiveConversation,
} from "./conversation.ts";
import {
  fetchLineProfile,
  saveIncomingMessage,
  updateMessageConversation,
} from "./message.ts";
import { callAIParser, mergeCollectedData } from "./ai.ts";
import {
  completeConversationSafe,
  createOrderFromAIResult,
  notifyNewOrder,
} from "./order.ts";
import type { Team } from "./team.ts";
import { replyLineMessage } from "../lib/line.ts";
import {
  checkAIQuota,
  recordAIUsage,
  calculateEstimatedCost,
} from "../../_shared/ai-rate-limit.ts";

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

  const existingConversation = await findActiveConversation(
    supabaseAdmin,
    team.id,
    lineUserId
  );

  const conversationHistory: ConversationMessage[] = existingConversation
    ? await fetchConversationHistory(supabaseAdmin, existingConversation.id, 15)
    : [];

  // ✅ 檢查 AI 配額（防止成本爆炸）
  const quotaCheck = await checkAIQuota(supabaseAdmin, team.id);

  if (!quotaCheck.allowed) {
    console.warn("[Webhook] AI 配額不足:", {
      teamId: team.id,
      reason: quotaCheck.reason,
      dailyUsed: quotaCheck.daily_used,
      dailyLimit: quotaCheck.daily_limit,
    });

    // ❌ 不回覆客戶（Silent Fallback）
    // ✅ App 端會通過查詢 team_ai_status 視圖來顯示警告
    return; // 提前返回，不調用 AI
  }

  console.log("[Webhook] AI 配額檢查通過:", {
    dailyUsed: quotaCheck.daily_used,
    dailyLimit: quotaCheck.daily_limit,
    monthlyUsed: quotaCheck.monthly_used,
    monthlyLimit: quotaCheck.monthly_limit,
  });

  const aiResult: AIParseResult = await callAIParser(
    messageText,
    team,
    conversationHistory,
    existingConversation?.collected_data
  );

  // ✅ 記錄 AI 使用量（估算 tokens 和成本）
  // GPT-5.1 平均：輸入 ~500 tokens，輸出 ~300 tokens
  const estimatedInputTokens = 500;
  const estimatedOutputTokens = 300;

  // 使用共用函數計算成本，確保定價一致
  const estimatedCost = calculateEstimatedCost(
    estimatedInputTokens,
    estimatedOutputTokens,
    "gpt-5.1"
  );

  await recordAIUsage(
    supabaseAdmin,
    team.id,
    lineUserId,
    "parse_message",
    estimatedInputTokens + estimatedOutputTokens,
    estimatedCost
  );

  const isOrderRelated =
    aiResult.intent === "order" ||
    aiResult.stage === "ordering" ||
    aiResult.stage === "delivery" ||
    aiResult.stage === "contact";

  if (!isOrderRelated) {
    if (team.auto_mode) {
      const replyText =
        aiResult.suggested_reply || "已收到您的訊息，感謝您的回覆！";

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
        conversation_id: existingConversation?.id || null,
      });
    }

    if (existingConversation) {
      await supabaseAdmin
        .from("conversations")
        .update({
          status: "abandoned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConversation.id);
    }
    return;
  }

  let conversation =
    existingConversation ||
    (await ensureConversation(supabaseAdmin, team.id, lineUserId));

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

    const { data: orderDetail } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, pickup_date, pickup_time, customer_name, delivery_method, total_amount"
      )
      .eq("id", orderId)
      .single();

    // 通知團隊：AI 建立新訂單
    if (orderDetail) {
      await notifyNewOrder(supabaseAdmin, team.id, orderDetail, modeLabel);
    }

    // 全自動模式：回覆客人
    // 半自動模式：不回覆客人
    if (team.auto_mode) {
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
