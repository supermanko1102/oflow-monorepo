// OFlow LINE Webhook Handler
// 接收 LINE Messaging API Webhook 事件，解析訊息並自動生成訂單

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

    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );

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

// 呼叫 AI 解析服務
async function parseMessageWithAI(
  message: string,
  teamContext: any
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

    // ✅ 根據 Bot User ID (destination) 查找對應的團隊
    console.log("[LINE Webhook] 查找團隊，Bot User ID:", destination);
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select(
        "id, name, business_type, line_channel_secret, line_channel_access_token, auto_mode"
      )
      .eq("line_bot_user_id", destination) // 使用 line_bot_user_id
      .single();

    if (teamError || !team) {
      console.error("[LINE Webhook] 找不到對應團隊 (Bot User ID):", destination);
      console.error("[LINE Webhook] 錯誤詳情:", teamError);
      // 回傳 200 避免 LINE 重複發送
      return new Response(
        JSON.stringify({ message: "Team not found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[LINE Webhook] 找到團隊:", team.name);
    console.log("[LINE Webhook] Channel Secret 長度:", team.line_channel_secret?.length);

    // 驗證 LINE 簽章
    console.log("[LINE Webhook] 開始驗證簽章...");
    console.log("[LINE Webhook] Signature from LINE:", signature);
    console.log("[LINE Webhook] Body 長度:", bodyText.length);
    
    const isValidSignature = await verifyLineSignature(
      bodyText,
      signature,
      team.line_channel_secret
    );

    if (!isValidSignature) {
      console.error("[LINE Webhook] ❌ 簽章驗證失敗");
      console.error("[LINE Webhook] Expected channel secret:", team.line_channel_secret);
      console.error("[LINE Webhook] 請確認 LINE Developers Console 的 Channel Secret 與資料庫中的是否一致");
      
      // 回傳 200 避免 LINE 重複發送（但記錄錯誤）
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid signature",
          message: "簽章驗證失敗，請檢查 Channel Secret 是否正確"
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

        // 儲存訊息到資料庫
        const { data: savedMessage, error: saveError } = await supabaseAdmin
          .from("line_messages")
          .insert({
            team_id: team.id,
            line_message_id: lineMessageId,
            line_user_id: lineUserId,
            message_type: "text",
            message_text: messageText,
            ai_parsed: false,
          })
          .select()
          .single();

        if (saveError) {
          console.error("[LINE Webhook] 訊息儲存失敗:", saveError);
          throw saveError;
        }

        console.log("[LINE Webhook] 訊息已儲存");

        // 呼叫 AI 解析
        const aiResult = await parseMessageWithAI(messageText, {
          name: team.name,
          business_type: team.business_type,
        });

        console.log("[LINE Webhook] AI 解析結果:", {
          intent: aiResult.intent,
          confidence: aiResult.confidence,
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

        // 如果是訂單且信心度夠高，自動建立訂單
        if (
          aiResult.intent === "order" &&
          aiResult.confidence >= 0.8 &&
          aiResult.order &&
          aiResult.order.items &&
          aiResult.order.items.length > 0
        ) {
          console.log("[LINE Webhook] 信心度足夠，開始建立訂單...");

          const order = aiResult.order;

          // 驗證必要欄位
          if (!order.pickup_date || !order.pickup_time) {
            console.log(
              "[LINE Webhook] 缺少必要資訊（日期/時間），發送詢問訊息"
            );

            await replyLineMessage(
              event.replyToken,
              [
                {
                  type: "text",
                  text: "收到您的訂單！不過還需要確認以下資訊：\n\n" +
                    (!order.pickup_date ? "• 取貨日期\n" : "") +
                    (!order.pickup_time ? "• 取貨時間\n" : "") +
                    "\n請補充這些資訊，謝謝！",
                },
              ],
              team.line_channel_access_token
            );

            continue;
          }

          // 計算總金額（如果 AI 沒有提供）
          let totalAmount = order.total_amount || 0;
          if (!totalAmount) {
            // 這裡可以根據商品名稱查詢價格表
            // 目前暫時設為 0，需要商家確認
            totalAmount = 0;
          }

          // 建立訂單
          try {
            const { data: orderId, error: orderError } = await supabaseAdmin.rpc(
              "create_order_from_ai",
              {
                p_team_id: team.id,
                p_customer_name: order.customer_name || "LINE 顧客",
                p_customer_phone: order.customer_phone || null,
                p_items: order.items,
                p_total_amount: totalAmount,
                p_pickup_date: order.pickup_date,
                p_pickup_time: order.pickup_time,
                p_line_message_id: savedMessage.id,
                p_original_message: messageText,
                p_customer_notes: order.items
                  .map((item: any) => item.notes)
                  .filter(Boolean)
                  .join(", ") || null,
              }
            );

            if (orderError) {
              console.error("[LINE Webhook] 訂單建立失敗:", orderError);
              throw orderError;
            }

            console.log("[LINE Webhook] 訂單建立成功:", orderId);

            // 查詢剛建立的訂單詳情
            const { data: orderDetail } = await supabaseAdmin
              .from("orders")
              .select("order_number")
              .eq("id", orderId)
              .single();

            // 回覆確認訊息
            const itemsList = order.items
              .map(
                (item: any) =>
                  `• ${item.name} x${item.quantity}${item.notes ? ` (${item.notes})` : ""}`
              )
              .join("\n");

            await replyLineMessage(
              event.replyToken,
              [
                {
                  type: "text",
                  text:
                    `✅ 訂單已確認！\n\n` +
                    `訂單編號：${orderDetail?.order_number || "處理中"}\n\n` +
                    `商品：\n${itemsList}\n\n` +
                    `取貨時間：${order.pickup_date} ${order.pickup_time}\n` +
                    (totalAmount > 0 ? `金額：NT$ ${totalAmount}\n\n` : "\n") +
                    `感謝您的訂購！`,
                },
              ],
              team.line_channel_access_token
            );
          } catch (createOrderError) {
            console.error(
              "[LINE Webhook] 訂單建立過程錯誤:",
              createOrderError
            );

            // 回覆錯誤訊息
            await replyLineMessage(
              event.replyToken,
              [
                {
                  type: "text",
                  text: "抱歉，訂單處理時發生錯誤，請稍後再試或直接聯絡我們。",
                },
              ],
              team.line_channel_access_token
            );
          }
        } else if (aiResult.intent === "order" && aiResult.confidence < 0.8) {
          // 信心度不足，請求確認
          console.log("[LINE Webhook] 信心度不足，請求人工確認");

          await replyLineMessage(
            event.replyToken,
            [
              {
                type: "text",
                text:
                  "收到您的訊息！我們會盡快為您處理，如有任何問題會再與您聯繫。",
              },
            ],
            team.line_channel_access_token
          );
        } else if (aiResult.intent === "inquiry") {
          // 一般詢問
          console.log("[LINE Webhook] 一般詢問");

          await replyLineMessage(
            event.replyToken,
            [
              {
                type: "text",
                text: "感謝您的詢問！我們會盡快回覆您。",
              },
            ],
            team.line_channel_access_token
          );
        } else {
          // 其他類型訊息
          console.log("[LINE Webhook] 其他類型訊息");

          await replyLineMessage(
            event.replyToken,
            [
              {
                type: "text",
                text: "收到您的訊息，謝謝！",
              },
            ],
            team.line_channel_access_token
          );
        }
      } catch (eventError) {
        console.error("[LINE Webhook] 事件處理錯誤:", eventError);
        // 繼續處理下一個事件
      }
    }

    // 回傳成功（LINE 需要 200 狀態碼）
    return new Response(
      JSON.stringify({ message: "OK" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

