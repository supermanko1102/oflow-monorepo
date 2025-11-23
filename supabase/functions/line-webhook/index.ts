// OFlow LINE Webhook Handler (Multi-turn Conversation)
// 接收 LINE Messaging API Webhook 事件，支援多輪對話建立訂單

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-line-signature",
};

// LINE Webhook 事件介面
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
  destination: string; // LINE Channel ID
  events: LineWebhookEvent[];
}

// 驗證 LINE 簽章
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

// 透過 LINE Messaging API 回覆訊息
async function replyLineMessage(
  replyToken: string,
  messages: any[],
  accessToken: string
): Promise<void> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LINE Webhook] 回覆訊息失敗:", errorText);
      throw new Error(`LINE API error: ${response.status}`);
    }

    console.log("[LINE Webhook] 回覆訊息成功");
  } catch (error) {
    console.error("[LINE Webhook] 回覆訊息錯誤:", error);
    throw error;
  }
}

// 訂單確認關鍵字配置
const ORDER_CONFIRMATION_KEYWORDS = ["/訂單確認", "/建單", "/order"];

/**
 * 偵測是否為訂單確認關鍵字
 * 必須完全匹配且獨立一行（防止誤觸發）
 */
function isOrderConfirmationTrigger(messageText: string): {
  isTrigger: boolean;
  keyword?: string;
} {
  const trimmedText = messageText.trim();

  for (const keyword of ORDER_CONFIRMATION_KEYWORDS) {
    // 完全匹配（大小寫敏感）
    if (trimmedText === keyword) {
      return {
        isTrigger: true,
        keyword: keyword,
      };
    }
  }

  return { isTrigger: false };
}

/**
 * 判斷訊息是否來自商家（團隊成員）
 * 簡化版：檢查該 LINE User ID 是否為團隊成員
 */
async function isMessageFromMerchant(
  lineUserId: string,
  teamId: string,
  supabase: any
): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select(
      `
      id,
      team_members!inner(team_id)
    `
    )
    .eq("line_user_id", lineUserId)
    .eq("team_members.team_id", teamId)
    .single();

  return !!data;
}

async function fetchLineProfile(
  userId: string,
  channelAccessToken: string
): Promise<{ displayName?: string; pictureUrl?: string } | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
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
  supabaseAdmin: any,
  conversation: any,
  displayName?: string
) {
  if (!conversation || !displayName) return conversation;
  const existing =
    conversation.collected_data?.line_display_name ||
    conversation.line_display_name;
  if (existing === displayName) return conversation;

  const newCollected = {
    ...(conversation.collected_data || {}),
    line_display_name: displayName,
  };

  await supabaseAdmin
    .from("conversations")
    .update({
      collected_data: newCollected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return { ...conversation, collected_data: newCollected };
}

// 判斷業務類型（商品型 vs 服務型）
function isProductBasedBusiness(businessType: string): boolean {
  return ["bakery", "flower", "craft", "other"].includes(businessType);
}

function isServiceBasedBusiness(businessType: string): boolean {
  return ["beauty", "massage", "nail", "pet"].includes(businessType);
}

// 呼叫 AI 解析服務（支援對話歷史，根據業務類型路由）
async function parseMessageWithAI(
  message: string,
  teamContext: any,
  conversationHistory: any[],
  collectedData: any
): Promise<any> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    // 根據業務類型選擇對應的 AI function
    const businessType = teamContext?.business_type || "other";
    let aiFunctionName = "ai-parse-message-goods"; // 預設為商品型

    if (isProductBasedBusiness(businessType)) {
      aiFunctionName = "ai-parse-message-goods";
      console.log("[LINE Webhook] 使用商品型 AI 解析");
    } else if (isServiceBasedBusiness(businessType)) {
      aiFunctionName = "ai-parse-message-services";
      console.log("[LINE Webhook] 使用服務型 AI 解析");
    } else {
      console.log("[LINE Webhook] 未知業務類型，使用商品型 AI 解析");
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${aiFunctionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message,
          team_context: teamContext,
          conversation_history: conversationHistory,
          collected_data: collectedData,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI Parse API error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("[LINE Webhook] AI 解析失敗:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Only POST method is allowed");
    }

    // 取得請求內容
    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature) {
      throw new Error("Missing x-line-signature header");
    }

    console.log("[LINE Webhook] 收到 Webhook 請求");

    // 解析 Webhook body
    const webhookBody: LineWebhookBody = JSON.parse(bodyText);
    const { destination, events } = webhookBody;

    console.log("[LINE Webhook] Channel ID:", destination);
    console.log("[LINE Webhook] 事件數量:", events.length);

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

    // 根據 Bot User ID (destination) 查找對應的團隊
    console.log("[LINE Webhook] 查找團隊，Bot User ID:", destination);
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select(
        "id, name, business_type, line_channel_secret, line_channel_access_token, auto_mode"
      )
      .eq("line_bot_user_id", destination)
      .single();

    if (teamError || !team) {
      console.error(
        "[LINE Webhook] 找不到對應團隊 (Bot User ID):",
        destination
      );
      console.error("[LINE Webhook] 錯誤詳情:", teamError);
      return new Response(JSON.stringify({ message: "Team not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[LINE Webhook] 找到團隊:", team.name);

    // 驗證 LINE 簽章
    console.log("[LINE Webhook] 開始驗證簽章...");
    const isValidSignature = await verifyLineSignature(
      bodyText,
      signature,
      team.line_channel_secret
    );

    if (!isValidSignature) {
      console.error("[LINE Webhook] ❌ 簽章驗證失敗");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid signature",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[LINE Webhook] ✅ 簽章驗證通過");

    // 處理每個事件
    for (const event of events) {
      try {
        console.log("[LINE Webhook] 處理事件:", event.type);

        // 只處理文字訊息
        if (event.type !== "message" || event.message?.type !== "text") {
          console.log("[LINE Webhook] 跳過非文字訊息");
          continue;
        }

    const messageText = event.message.text || "";
    const lineUserId = event.source.userId;
    const lineMessageId = event.message.id;
    const lineProfile = await fetchLineProfile(
      lineUserId,
      team.line_channel_access_token
    );

    console.log("[LINE Webhook] 訊息內容:", messageText);
    console.log("[LINE Webhook] 使用者 ID:", lineUserId);

        // 先解析 intent，非訂單 intent 就不建立/更新 conversation，僅保留訊息紀錄（避免塞爆收件匣）
        let conversation: any = null;
        let savedMessage: any = null;

        // ═══════════════════════════════════════════════════════
        // Step 1: 儲存訊息（不綁 conversation，先取得 message id）
        // ═══════════════════════════════════════════════════════
        const { data: tempMessage, error: tempSaveError } = await supabaseAdmin
          .from("line_messages")
          .insert({
            team_id: team.id,
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

        if (tempSaveError) {
          console.error("[LINE Webhook] 訊息儲存失敗:", tempSaveError);
          throw tempSaveError;
        }

        savedMessage = tempMessage;
        console.log("[LINE Webhook] 客人訊息已儲存（未綁對話）");

        // ═══════════════════════════════════════════════════════
        // Step 1.5: 檢查是否為半自動模式 + 商家觸發關鍵字
        // （半自動需要強制建對話）
        // ═══════════════════════════════════════════════════════
        const triggerCheck = isOrderConfirmationTrigger(messageText);
        const isMerchant = await isMessageFromMerchant(
          lineUserId,
          team.id,
          supabaseAdmin
        );

        if (team.auto_mode === false && triggerCheck.isTrigger && isMerchant) {
          console.log(
            "[LINE Webhook] 偵測到商家觸發關鍵字:",
            triggerCheck.keyword
          );
          console.log("[LINE Webhook] 半自動模式：商家明確同意建單");

          // 1. 取得或建立對話（半自動強制建）
        const { data: convHalf, error: convErrorHalf } =
          await supabaseAdmin
            .rpc("get_or_create_conversation", {
              p_team_id: team.id,
              p_line_user_id: lineUserId,
            })
            .single();

          if (convErrorHalf || !convHalf) {
            console.error("[LINE Webhook] 對話取得/建立失敗:", convErrorHalf);
            throw new Error("Failed to get or create conversation");
          }

        conversation = convHalf;
        conversation = await ensureConversationDisplayName(
          supabaseAdmin,
          conversation,
          lineProfile?.displayName
        );

          // 2. 更新訊息的 conversation_id
          await supabaseAdmin
            .from("line_messages")
            .update({
              conversation_id: conversation.id,
              message_data: lineProfile
                ? { ...(savedMessage?.message_data || {}), line_profile: lineProfile }
                : savedMessage?.message_data || null,
            })
            .eq("id", savedMessage.id);

          // 3. AI 解析整段對話歷史（取得最近 10 條訊息）
          const { data: historyData } = await supabaseAdmin.rpc(
            "get_conversation_history",
            {
              p_conversation_id: conversation.id,
              p_limit: 10,
            }
          );

          const conversationHistory = historyData || [];

          // 4. 呼叫 AI 解析對話
          const aiResult = await parseMessageWithAI(
            messageText,
            {
              team_id: team.id,
              name: team.name,
              business_type: team.business_type,
            },
            conversationHistory,
            conversation.collected_data
          );

          console.log("[LINE Webhook] AI 解析結果:", {
            intent: aiResult.intent,
            confidence: aiResult.confidence,
            hasOrder: !!aiResult.order,
          });

          // 3. AI 解析結果處理（商家已明確同意）
          if (aiResult.intent === "order" && aiResult.order) {
            await supabaseAdmin.rpc("update_conversation_data", {
              p_conversation_id: conversation.id,
              p_collected_data: aiResult.order,
              p_missing_fields: aiResult.missing_fields || [],
            });

            if (aiResult.is_complete) {
              // 直接建單
              try {
                const order = aiResult.order;
                const totalAmount = order.total_amount || 0;

                const appointmentDate =
                  order.delivery_date || order.pickup_date || null;
                const appointmentTime =
                  order.delivery_time || order.pickup_time || "00:00";
                const stage = aiResult.stage || (aiResult.is_complete ? "done" : undefined);
                const orderStatus =
                  stage === "done" && (order.delivery_date || order.pickup_date)
                    ? "pending"
                    : "draft";

                const { data: orderId, error: orderError } =
                  await supabaseAdmin.rpc("create_order_from_ai", {
                    p_team_id: team.id,
                    p_customer_name: order.customer_name || "LINE 顧客",
                    p_customer_phone: order.customer_phone || null,
                    p_items: order.items,
                    p_total_amount: totalAmount,
                    p_line_message_id: savedMessage.id,
                    p_original_message: `[半自動模式建單] 觸發關鍵字: ${triggerCheck.keyword}`,
                    p_appointment_date: appointmentDate,
                    p_appointment_time: appointmentTime,
                    p_status: orderStatus,
                    p_delivery_method: order.delivery_method || "pickup",
                    p_requires_frozen: order.requires_frozen || false,
                    p_store_info: order.store_info || null,
                    p_shipping_address: order.shipping_address || null,
                    p_service_duration: order.service_duration || null,
                    p_service_notes: order.service_notes || null,
                    p_customer_notes: order.customer_notes || null,
                    p_conversation_id: conversation.id,
                  });

                if (orderError) {
                  throw orderError;
                }

                await supabaseAdmin.rpc("complete_conversation", {
                  p_conversation_id: conversation.id,
                  p_order_id: orderId,
                });

                const { data: orderDetail } = await supabaseAdmin
                  .from("orders")
                  .select("order_number, pickup_date, pickup_time")
                  .eq("id", orderId)
                  .single();

                const customerConfirmMessage =
                  `✅ 訂單已確認！\n\n` +
                  `訂單編號：${orderDetail?.order_number || "處理中"}\n` +
                  `交付日期：${order.pickup_date || order.delivery_date || ""}${
                    order.pickup_time || order.delivery_time
                      ? ` ${order.pickup_time || order.delivery_time}`
                      : ""
                  }\n` +
                  (totalAmount > 0 ? `金額：NT$ ${totalAmount}\n\n` : "\n") +
                  `感謝您的訂購！`;

                await fetch("https://api.line.me/v2/bot/message/push", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${team.line_channel_access_token}`,
                  },
                  body: JSON.stringify({
                    to: lineUserId,
                    messages: [{ type: "text", text: customerConfirmMessage }],
                  }),
                });

                await supabaseAdmin.from("line_messages").insert({
                  team_id: team.id,
                  line_user_id: lineUserId,
                  message_type: "text",
                  message_text: customerConfirmMessage,
                  role: "ai",
                  conversation_id: conversation.id,
                  order_id: orderId,
                });
              } catch (err) {
                console.error("[LINE Webhook] 半自動建單失敗:", err);
                await supabaseAdmin
                  .from("conversations")
                  .update({
                    status: "requires_manual_handling",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", conversation.id);
              }
            } else {
              // 資訊不完整，交給商家後台
              await supabaseAdmin
                .from("conversations")
                .update({
                  status: "requires_manual_handling",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", conversation.id);
            }
          } else {
            // 無訂單意圖，交給人工
            await supabaseAdmin
              .from("conversations")
              .update({
                status: "requires_manual_handling",
                updated_at: new Date().toISOString(),
              })
              .eq("id", conversation.id);
          }

          // 9. 結束處理（不執行後續的全自動邏輯）
          continue;
        }

        // ═══════════════════════════════════════════════════════
        // 半自動模式：AI 監聽並累積資訊，資訊完整時標記為待確認
        // ═══════════════════════════════════════════════════════
        if (team.auto_mode === false) {
          console.log("[LINE Webhook] 半自動模式：解析並累積資訊");

          // 半自動模式需要對話上下文，先確保 conversation 存在
          if (!conversation) {
            const { data: convHalfAuto, error: convErrHalfAuto } =
              await supabaseAdmin
                .rpc("get_or_create_conversation", {
                  p_team_id: team.id,
                  p_line_user_id: lineUserId,
                })
                .single();

            if (convErrHalfAuto || !convHalfAuto) {
              console.error(
                "[LINE Webhook] 對話取得/建立失敗（半自動）：",
                convErrHalfAuto
              );
              throw new Error("Failed to get or create conversation");
            }
            conversation = convHalfAuto;
            conversation = await ensureConversationDisplayName(
              supabaseAdmin,
              conversation,
              lineProfile?.displayName
            );

            // 更新訊息的 conversation_id
            await supabaseAdmin
              .from("line_messages")
              .update({
                conversation_id: conversation.id,
                message_data: lineProfile
                  ? { ...(savedMessage?.message_data || {}), line_profile: lineProfile }
                  : savedMessage?.message_data || null,
              })
              .eq("id", savedMessage.id);
          }

          // 取得對話歷史供 AI 解析
          const { data: historyData } = await supabaseAdmin.rpc(
            "get_conversation_history",
            {
              p_conversation_id: conversation.id,
              p_limit: 5,
            }
          );

          const conversationHistory = historyData || [];

          // 進行 AI 解析（用於累積對話資訊）
          const aiResult = await parseMessageWithAI(
            messageText,
            {
              team_id: team.id,
              name: team.name,
              business_type: team.business_type,
            },
            conversationHistory,
            conversation.collected_data
          );

          console.log("[LINE Webhook] 半自動模式 AI 解析結果:", {
            intent: aiResult.intent,
            is_complete: aiResult.is_complete,
            is_continuation: aiResult.is_continuation,
          });

          // 更新訊息的 AI 解析結果
          await supabaseAdmin
            .from("line_messages")
            .update({
              ai_parsed: true,
              ai_result: aiResult,
              ai_confidence: aiResult.confidence,
            })
            .eq("id", savedMessage.id);

          if (aiResult.intent === "order" && aiResult.order) {
            await supabaseAdmin.rpc("update_conversation_data", {
              p_conversation_id: conversation.id,
              p_collected_data: aiResult.order,
              p_missing_fields: aiResult.missing_fields || [],
            });

            const nextStatus = aiResult.is_complete
              ? "awaiting_merchant_confirmation"
              : "requires_manual_handling";

            await supabaseAdmin
              .from("conversations")
              .update({
                status: nextStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("id", conversation.id);
          }

          // 半自動模式不回覆客人，等待商家在 App 中確認
          continue;
        }

        // ═══════════════════════════════════════════════════════
        // Step 3: 取得對話歷史（最近 5 條）- 全自動模式
        // ═══════════════════════════════════════════════════════
        if (!conversation) {
          // 只有 intent=order 才建立對話並進入全自動流程
          const { data: convAuto, error: convAutoErr } = await supabaseAdmin
            .rpc("get_or_create_conversation", {
              p_team_id: team.id,
              p_line_user_id: lineUserId,
            })
            .single();

          if (convAutoErr || !convAuto) {
            console.error(
              "[LINE Webhook] 對話取得/建立失敗（全自動）：",
              convAutoErr
            );
            throw new Error("Failed to get or create conversation");
          }
          conversation = convAuto;
          conversation = await ensureConversationDisplayName(
            supabaseAdmin,
            conversation,
            lineProfile?.displayName
          );

          await supabaseAdmin
            .from("line_messages")
            .update({
              conversation_id: conversation.id,
              message_data: lineProfile
                ? { ...(savedMessage?.message_data || {}), line_profile: lineProfile }
                : savedMessage?.message_data || null,
            })
            .eq("id", savedMessage.id);
        }

        const { data: historyData, error: historyError } =
          await supabaseAdmin.rpc("get_conversation_history", {
            p_conversation_id: conversation.id,
            p_limit: 5,
          });

        if (historyError) {
          console.error("[LINE Webhook] 對話歷史查詢失敗:", historyError);
        }

        const conversationHistory = historyData || [];
        console.log("[LINE Webhook] 對話歷史數量:", conversationHistory.length);

        // ═══════════════════════════════════════════════════════
        // Step 4: 呼叫 AI 解析（傳遞歷史和已收集資訊）
        // ═══════════════════════════════════════════════════════
        const aiResult = await parseMessageWithAI(
          messageText,
          {
            team_id: team.id,
            name: team.name,
            business_type: team.business_type,
          },
          conversationHistory,
          conversation.collected_data
        );

        console.log("[LINE Webhook] AI 解析結果:", {
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          is_continuation: aiResult.is_continuation,
          is_complete: aiResult.is_complete,
          missing_fields: aiResult.missing_fields,
        });

        // 更新訊息的 AI 解析結果
        await supabaseAdmin
          .from("line_messages")
          .update({
            ai_parsed: true,
            ai_result: aiResult,
            ai_confidence: aiResult.confidence,
          })
          .eq("id", savedMessage.id);

        // ═══════════════════════════════════════════════════════
        // Step 5: 根據 AI 結果處理
        // ═══════════════════════════════════════════════════════
        if (aiResult.intent === "order") {
          if (aiResult.is_complete && aiResult.order) {
            // ✅ 資訊完整，建立訂單
            console.log("[LINE Webhook] 資訊完整，建立訂單...");

            const order = aiResult.order;
            const appointmentDate = order.delivery_date || order.pickup_date;
            const appointmentTime =
              order.delivery_time || order.pickup_time || "00:00";
            const stage = aiResult.stage || (aiResult.is_complete ? "done" : undefined);
            const orderStatus =
              stage === "done" && appointmentDate ? "pending" : "draft";

            // 計算總金額（如果 AI 沒有提供）
            let totalAmount = order.total_amount || 0;

            try {
              // 建立訂單（支援新欄位）
              const { data: orderId, error: orderError } =
                await supabaseAdmin.rpc("create_order_from_ai", {
                  // 必填參數
                  p_team_id: team.id,
                  p_customer_name: order.customer_name || "LINE 顧客",
                  p_customer_phone: order.customer_phone || null,
                  p_items: order.items,
                  p_total_amount: totalAmount,
                  p_line_message_id: savedMessage.id,
                  p_original_message: messageText,
                  // 通用參數（預約/交付日期時間）- 支援新舊欄位名稱（向後兼容）
                  p_appointment_date: appointmentDate,
                  p_appointment_time: appointmentTime,
                  p_status: orderStatus,
                  // 可選參數（多行業支援）
                  p_delivery_method: order.delivery_method || "pickup",
                  p_pickup_type: order.pickup_type || null, // store 或 meetup
                  p_pickup_location: order.pickup_location || null, // 取貨/面交地點
                  p_requires_frozen: order.requires_frozen || false,
                  p_store_info: order.store_info || null,
                  p_shipping_address: order.shipping_address || null,
                  p_service_duration: order.service_duration || null,
                  p_service_notes: order.service_notes || null,
                  p_customer_notes:
                    order.items
                      .map((item: any) => item.notes)
                      .filter(Boolean)
                      .join(", ") || null,
                  p_conversation_id: conversation.id, // 對話 ID
                });

              if (orderError) {
                console.error("[LINE Webhook] 訂單建立失敗:", orderError);
                throw orderError;
              }

              console.log("[LINE Webhook] 訂單建立成功:", orderId);

              // 標記對話完成
              await supabaseAdmin.rpc("complete_conversation", {
                p_conversation_id: conversation.id,
                p_order_id: orderId,
              });

              // 查詢訂單詳情
              const { data: orderDetail } = await supabaseAdmin
                .from("orders")
                .select("order_number")
                .eq("id", orderId)
                .single();

              // 建立確認訊息（根據配送方式和取貨類型）
              const itemsList = order.items
                .map(
                  (item: any) =>
                    `• ${item.name} x${item.quantity}${
                      item.notes ? ` (${item.notes})` : ""
                    }`
                )
                .join("\n");

              const deliveryMethod = order.delivery_method || "pickup";
              const pickupType = order.pickup_type;
              let deliveryInfo = "";

              if (deliveryMethod === "pickup") {
                // 取貨（區分店取/面交）
                const deliveryDate = order.delivery_date || order.pickup_date;
                const deliveryTime = order.delivery_time || order.pickup_time;

                if (pickupType === "store") {
                  // 店取：顯示商家地址（如果有設定）
                  let storeAddress = order.pickup_location;

                  // 如果沒有 pickup_location，嘗試從 team.pickup_settings 取得
                  if (
                    !storeAddress &&
                    team.pickup_settings?.store_pickup?.address
                  ) {
                    storeAddress = team.pickup_settings.store_pickup.address;
                  }

                  deliveryInfo = `取貨方式：到店取貨\n${
                    storeAddress ? `取貨地點：${storeAddress}\n` : ""
                  }取貨時間：${deliveryDate} ${deliveryTime}`;
                } else if (pickupType === "meetup") {
                  // 面交：顯示約定地點
                  deliveryInfo = `取貨方式：約定地點面交\n面交地點：${
                    order.pickup_location || "待約定"
                  }\n面交時間：${deliveryDate} ${deliveryTime}`;
                } else {
                  // 舊版相容（沒有 pickup_type）
                  deliveryInfo = `取貨時間：${deliveryDate} ${deliveryTime}`;
                }
              } else if (deliveryMethod === "convenience_store") {
                // 超商：顯示店號
                deliveryInfo = `配送方式：超商取貨\n取貨店號：${
                  order.store_info || "待確認"
                }`;
              } else if (deliveryMethod === "black_cat") {
                // 宅配：顯示地址（不顯示時間）
                deliveryInfo = `配送方式：宅配\n配送地址：${
                  order.shipping_address || "待確認"
                }`;
              }

              const confirmMessage =
                `✅ 訂單已確認！\n\n` +
                `訂單編號：${orderDetail?.order_number || "處理中"}\n\n` +
                `商品：\n${itemsList}\n\n` +
                `${deliveryInfo}\n` +
                (totalAmount > 0 ? `金額：NT$ ${totalAmount}\n\n` : "\n") +
                `感謝您的訂購！`;

              // 儲存 AI 回覆
              await supabaseAdmin.from("line_messages").insert({
                team_id: team.id,
                line_user_id: lineUserId,
                message_type: "text",
                message_text: confirmMessage,
                role: "ai",
                conversation_id: conversation.id,
              });

              // 回覆確認訊息
              await replyLineMessage(
                event.replyToken,
                [{ type: "text", text: confirmMessage }],
                team.line_channel_access_token
              );
            } catch (createOrderError) {
              console.error(
                "[LINE Webhook] 訂單建立過程錯誤:",
                createOrderError
              );

              const errorMessage =
                "抱歉，訂單處理時發生錯誤，請稍後再試或直接聯絡我們。";

              // 儲存 AI 回覆
              await supabaseAdmin.from("line_messages").insert({
                team_id: team.id,
                line_user_id: lineUserId,
                message_type: "text",
                message_text: errorMessage,
                role: "ai",
                conversation_id: conversation.id,
              });

              // 回覆錯誤訊息
              await replyLineMessage(
                event.replyToken,
                [{ type: "text", text: errorMessage }],
                team.line_channel_access_token
              );
            }
          } else {
            // ⏳ 資訊不完整：直接轉人工處理
            console.log("[LINE Webhook] 資訊不完整，轉人工處理");

            await supabaseAdmin.rpc("update_conversation_data", {
              p_conversation_id: conversation.id,
              p_collected_data: aiResult.order || {},
              p_missing_fields: aiResult.missing_fields || [],
            });

            await supabaseAdmin
              .from("conversations")
              .update({
                status: "requires_manual_handling",
                updated_at: new Date().toISOString(),
              })
              .eq("id", conversation.id);

            const replyMessage =
              aiResult.suggested_reply ||
              "已收到您的需求，資訊不足，將由人工協助確認，謝謝！";

            // 儲存 AI 回覆
            await supabaseAdmin.from("line_messages").insert({
              team_id: team.id,
              line_user_id: lineUserId,
              message_type: "text",
              message_text: replyMessage,
              role: "ai",
              conversation_id: conversation.id,
            });

            // 回覆詢問訊息
            await replyLineMessage(
              event.replyToken,
              [{ type: "text", text: replyMessage }],
              team.line_channel_access_token
            );
          }
        } else if (aiResult.intent === "inquiry") {
          // 一般詢問
          console.log("[LINE Webhook] 一般詢問");

          const replyMessage =
            aiResult.suggested_reply || "感謝您的詢問！我們會盡快回覆您。";

          // 儲存 AI 回覆
          await supabaseAdmin.from("line_messages").insert({
            team_id: team.id,
            line_user_id: lineUserId,
            message_type: "text",
            message_text: replyMessage,
            role: "ai",
            conversation_id: conversation.id,
          });

          await replyLineMessage(
            event.replyToken,
            [{ type: "text", text: replyMessage }],
            team.line_channel_access_token
          );
        } else {
          // 其他類型訊息
          console.log("[LINE Webhook] 其他類型訊息");

          const replyMessage =
            aiResult.suggested_reply || "收到您的訊息，謝謝！";

          // 儲存 AI 回覆
          await supabaseAdmin.from("line_messages").insert({
            team_id: team.id,
            line_user_id: lineUserId,
            message_type: "text",
            message_text: replyMessage,
            role: "ai",
            conversation_id: conversation.id,
          });

          await replyLineMessage(
            event.replyToken,
            [{ type: "text", text: replyMessage }],
            team.line_channel_access_token
          );
        }
      } catch (eventError) {
        console.error("[LINE Webhook] 事件處理錯誤:", eventError);
        // 繼續處理下一個事件
      }
    }

    // 回傳成功（LINE 需要 200 狀態碼）
    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LINE Webhook] 錯誤:", error);

    // LINE Webhook 必須回傳 200，否則會重複發送
    return new Response(
      JSON.stringify({
        message: "Error processed",
        error: error.message,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
