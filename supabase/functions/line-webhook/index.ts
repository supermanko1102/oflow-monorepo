// OFlow LINE Webhook Handler (refactored)
// 支援：簽章驗證、訊息儲存、對話維護、AI 解析、建單、回覆

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  AIParseResult,
  ConversationMessage,
  TeamContext,
} from "../_shared/types.ts";

type Team = TeamContext & {
  id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
  line_bot_user_id: string;
  auto_mode: boolean;
};

function isServiceBasedBusiness(businessType: string): boolean {
  return ["beauty", "massage", "nail", "pet"].includes(businessType);
}

type Conversation = {
  id: string;
  team_id: string;
  line_user_id: string;
  status: string;
  collected_data: Record<string, any> | null;
  missing_fields: string[] | null;
  order_id: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LineProfile = { displayName?: string; pictureUrl?: string } | null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-line-signature",
};

const ORDER_CONFIRMATION_KEYWORDS = ["/訂單確認", "/建單", "/order"];

interface LineWebhookEvent {
  type: string;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  timestamp: number;
  source: {
    type: string;
    userId: string;
  };
  replyToken: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// Helpers ------------------------------------------------------------
async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const signatureBase64 = btoa(
      String.fromCharCode(...new Uint8Array(signed))
    );
    return signatureBase64 === signature;
  } catch (error) {
    console.error("[LINE Webhook] 簽章驗證錯誤:", error);
    return false;
  }
}

async function replyLineMessage(
  replyToken: string,
  messages: any[],
  accessToken: string
): Promise<void> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LINE Webhook] 回覆訊息失敗:", errorText);
    throw new Error(`LINE API error: ${response.status}`);
  }
}

function isOrderConfirmationTrigger(messageText: string) {
  const trimmed = messageText.trim();
  for (const keyword of ORDER_CONFIRMATION_KEYWORDS) {
    if (trimmed === keyword) return { isTrigger: true, keyword };
  }
  return { isTrigger: false };
}

function createSupabaseAdmin(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchTeamByDestination(
  supabase: SupabaseClient,
  destination: string
): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, business_type, line_channel_secret, line_channel_access_token, line_bot_user_id, auto_mode"
    )
    .eq("line_bot_user_id", destination)
    .single();
  if (error || !data) {
    console.error("[LINE Webhook] 找不到團隊:", destination, error);
    return null;
  }
  return {
    ...(data as any),
    team_id: (data as any).team_id || (data as any).id,
  } as Team;
}

async function fetchLineProfile(
  userId: string,
  accessToken: string
): Promise<LineProfile> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn("[LINE Webhook] 取得 LINE Profile 失敗:", res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("[LINE Webhook] 取得 LINE Profile 例外:", err);
    return null;
  }
}

async function ensureConversationDisplayName(
  supabase: SupabaseClient,
  conversation: Conversation,
  displayName?: string
): Promise<Conversation> {
  if (!conversation || !displayName) return conversation;
  const existing =
    conversation.collected_data?.line_display_name ||
    (conversation as any).line_display_name;
  if (existing === displayName) return conversation;

  const newCollected = {
    ...(conversation.collected_data || {}),
    line_display_name: displayName,
  };

  await supabase
    .from("conversations")
    .update({
      collected_data: newCollected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return { ...conversation, collected_data: newCollected };
}

async function saveIncomingMessage(
  supabase: SupabaseClient,
  teamId: string,
  lineMessageId: string,
  lineUserId: string,
  messageText: string,
  lineProfile: LineProfile
) {
  const { data, error } = await supabase
    .from("line_messages")
    .insert({
      team_id: teamId,
      line_message_id: lineMessageId,
      line_user_id: lineUserId,
      message_type: "text",
      message_text: messageText,
      role: "customer",
      ai_parsed: false,
      message_data: lineProfile ? { line_profile: lineProfile } : null,
    })
    .select()
    .single();
  if (error || !data) {
    throw error || new Error("Failed to save message");
  }
  return data as { id: string; message_data?: any };
}

async function ensureConversation(
  supabase: SupabaseClient,
  teamId: string,
  lineUserId: string
): Promise<Conversation> {
  const { data, error } = await supabase
    .rpc("get_or_create_conversation", {
      p_team_id: teamId,
      p_line_user_id: lineUserId,
    })
    .single();
  if (error || !data) {
    throw error || new Error("Failed to get or create conversation");
  }
  return data as Conversation;
}

async function updateMessageConversation(
  supabase: SupabaseClient,
  messageId: string,
  conversationId: string,
  lineProfile: LineProfile,
  existingMessageData?: any
) {
  await supabase
    .from("line_messages")
    .update({
      conversation_id: conversationId,
      message_data: lineProfile
        ? { ...(existingMessageData || {}), line_profile: lineProfile }
        : existingMessageData || null,
    })
    .eq("id", messageId);
}

async function fetchConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase.rpc("get_conversation_history", {
    p_conversation_id: conversationId,
    p_limit: limit,
  });
  if (error) {
    console.error("[LINE Webhook] 對話歷史查詢失敗:", error);
    return [];
  }
  return data || [];
}

async function callAIParser(
  message: string,
  team: Team,
  history: ConversationMessage[],
  collectedData: any
): Promise<AIParseResult> {
  const functionName = isServiceBasedBusiness(team.business_type)
    ? "ai-parse-message-services"
    : "ai-parse-message-goods";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL/Anon key not configured");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message,
      team_context: team,
      conversation_history: history,
      collected_data: collectedData,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Parse API error: ${res.status}`);
  }

  const data = await res.json();
  return data.result as AIParseResult;
}

function mergeCollectedData(
  current: any,
  aiResult: AIParseResult
): { collected: any; missing: string[] } {
  const merged = {
    ...(current || {}),
    ...(aiResult.order || {}),
  };
  return { collected: merged, missing: aiResult.missing_fields || [] };
}

async function updateConversationData(
  supabase: SupabaseClient,
  conversationId: string,
  collectedData: any,
  missingFields: string[]
) {
  await supabase.rpc("update_conversation_data", {
    p_conversation_id: conversationId,
    p_collected_data: collectedData,
    p_missing_fields: missingFields,
  });
}

async function createOrderFromAIResult(
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

// Main handler -------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Only POST method is allowed");
    }

    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature");
    if (!signature) {
      throw new Error("Missing x-line-signature header");
    }

    const webhookBody = JSON.parse(bodyText) as LineWebhookBody;
    const { destination, events } = webhookBody;

    const supabaseAdmin = createSupabaseAdmin();
    const team = await fetchTeamByDestination(supabaseAdmin, destination);
    if (!team) {
      return new Response(JSON.stringify({ message: "Team not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSignature = await verifyLineSignature(
      bodyText,
      signature,
      team.line_channel_secret
    );
    if (!validSignature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const event of events) {
      try {
        if (event.type !== "message" || event.message?.type !== "text") {
          continue;
        }

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
        )) as Conversation;

        await updateMessageConversation(
          supabaseAdmin,
          savedMessage.id,
          conversation.id,
          lineProfile,
          savedMessage.message_data
        );

        const conversationHistory = await fetchConversationHistory(
          supabaseAdmin,
          conversation.id,
          15
        );

        const aiResult = await callAIParser(
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
        if (hasOrder && aiResult.is_complete && aiResult.order) {
          const orderId = await createOrderFromAIResult(
            supabaseAdmin,
            team.id,
            conversation.id,
            lineUserId,
            savedMessage.id,
            aiResult.order,
            messageText
          );

          await supabaseAdmin.rpc("complete_conversation", {
            p_conversation_id: conversation.id,
            p_order_id: orderId,
          });

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

          continue;
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
      } catch (eventError) {
        console.error("[LINE Webhook] 事件處理錯誤:", eventError);
        // 繼續處理下一個事件
      }
    }

    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LINE Webhook] 錯誤:", error);
    return new Response(
      JSON.stringify({
        message: "Error processed",
        error: (error as Error).message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
