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

// 呼叫 AI 解析服務（支援對話歷史）
async function parseMessageWithAI(
  message: string,
  teamContext: any,
  conversationHistory: any[],
  collectedData: any
): Promise<any> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-parse-message`,
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

        console.log("[LINE Webhook] 訊息內容:", messageText);
        console.log("[LINE Webhook] 使用者 ID:", lineUserId);

        // ═══════════════════════════════════════════════════════
        // Step 1: 取得或建立對話
        // ═══════════════════════════════════════════════════════
        console.log("[LINE Webhook] 取得或建立對話...");
        const { data: conversation, error: convError } = await supabaseAdmin
          .rpc("get_or_create_conversation", {
            p_team_id: team.id,
            p_line_user_id: lineUserId,
          })
          .single();

        if (convError || !conversation) {
          console.error("[LINE Webhook] 對話取得/建立失敗:", convError);
          throw new Error("Failed to get or create conversation");
        }

        console.log("[LINE Webhook] 對話 ID:", conversation.id);
        console.log("[LINE Webhook] 對話狀態:", conversation.status);

        // ═══════════════════════════════════════════════════════
        // Step 2: 儲存客人訊息到資料庫
        // ═══════════════════════════════════════════════════════
        const { data: savedMessage, error: saveError } = await supabaseAdmin
          .from("line_messages")
          .insert({
            team_id: team.id,
            line_message_id: lineMessageId,
            line_user_id: lineUserId,
            message_type: "text",
            message_text: messageText,
            role: "customer",
            conversation_id: conversation.id,
            ai_parsed: false,
          })
          .select()
          .single();

        if (saveError) {
          console.error("[LINE Webhook] 訊息儲存失敗:", saveError);
          throw saveError;
        }

        console.log("[LINE Webhook] 客人訊息已儲存");

        // ═══════════════════════════════════════════════════════
        // Step 3: 取得對話歷史（最近 5 條）
        // ═══════════════════════════════════════════════════════
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
                  p_appointment_date: order.delivery_date || order.pickup_date,
                  p_appointment_time: order.delivery_time || order.pickup_time,
                  // 可選參數（多行業支援）
                  p_delivery_method: order.delivery_method || "pickup",
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

              // 建立確認訊息
              const itemsList = order.items
                .map(
                  (item: any) =>
                    `• ${item.name} x${item.quantity}${
                      item.notes ? ` (${item.notes})` : ""
                    }`
                )
                .join("\n");

              const confirmMessage =
                `✅ 訂單已確認！\n\n` +
                `訂單編號：${orderDetail?.order_number || "處理中"}\n\n` +
                `商品：\n${itemsList}\n\n` +
                `取貨時間：${order.pickup_date} ${order.pickup_time}\n` +
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
            // ⏳ 資訊不完整，更新對話狀態並詢問
            console.log("[LINE Webhook] 資訊不完整，請求補充");

            // 更新對話中已收集的資訊
            await supabaseAdmin.rpc("update_conversation_data", {
              p_conversation_id: conversation.id,
              p_collected_data: aiResult.order || {},
              p_missing_fields: aiResult.missing_fields || [],
            });

            const replyMessage =
              aiResult.suggested_reply || "收到您的訊息！請補充訂單資訊。";

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
