// OFlow AI Message Parser - 商品型業務專用
// 處理烘焙、花店、手工藝等商品型業務的訊息解析
// 專注於商品匹配、配送方式、庫存相關邏輯

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import type {
  AIParseResult,
  ConversationMessage,
  TeamContext,
} from "../_shared/types.ts";
import {
  fetchTeamProducts,
  generateProductCatalog,
} from "../_shared/product-fetcher.ts";
import {
  getCurrentDateContext,
  buildConversationContext,
  buildCollectedDataContext,
} from "../_shared/date-utils.ts";

// 取得業務類別標籤
const businessTypeLabels: Record<string, string> = {
  bakery: "烘焙甜點",
  flower: "花店",
  craft: "手工藝",
  other: "其他",
};

// 生成商品型業務的 System Prompt
function generateGoodsPrompt(
  dateContext: string,
  teamContext: TeamContext,
  businessLabel: string,
  conversationContext: string,
  collectedDataContext: string,
  productCatalog: string
): string {
  return `你是專業的訂單解析助手，專門處理 ${
    teamContext?.name || "商家"
  }（${businessLabel}）的訂單。

當前日期：${dateContext}
${productCatalog}
${conversationContext}${collectedDataContext}

你的任務：
1. 判斷訊息的意圖（order/inquiry/other）
2. **智能商品推薦**：當客人詢問「有什麼商品」「有哪些蛋糕」「菜單」「價目表」時，從上方商品目錄中推薦 2-5 個熱門商品，並在 suggested_reply 中列出商品名稱、規格和價格
3. **商品匹配與價格填入**：當客人提到商品名稱時，從商品目錄中找到匹配的商品（支援模糊匹配，如「巴斯克」匹配「巴斯克蛋糕」），並自動填入 price 欄位
4. 判斷是否為延續之前的對話（is_continuation）
5. 如果有對話歷史或已收集資訊，將新訊息與之前的資訊合併
6. 提取完整的訂單資訊：
   - 顧客姓名（如果有提到「我是XXX」或稱呼）
   - 聯絡電話（如果有提到）
   - 商品列表（名稱、數量、價格、備註）
   - 交付日期（YYYY-MM-DD 格式，若只說「明天」請計算實際日期）
   - 交付時間（HH:MM 格式，24小時制）
   - 配送方式（自取/超商/黑貓）
   - 是否需要冷凍配送（針對需冷藏商品）
   - 總金額（根據商品價格自動計算）
7. 循序漸進引導：商品 → 時間 → 配送方式 → 細節

配送方式自然語言對應：
- "自己來拿"/"到店取"/"門市取貨"/"自取" → pickup
- "超商"/"7-11"/"全家"/"超商取貨" → convenience_store
- "宅配"/"黑貓"/"寄送"/"配送" → black_cat

完整度判斷（is_complete）：
- 必填：items（商品）, delivery_date（交付日期）, delivery_time（交付時間）, delivery_method（配送方式）
- 超商取貨需要：store_info（店號/店名）
- 黑貓宅配需要：shipping_address（寄送地址）
- 如果商品需冷藏，需詢問：requires_frozen（是否冷凍配送）

注意事項：
- **商品匹配**：客人提到的商品名稱要與商品目錄比對（支援模糊匹配，如「巴斯克」匹配「巴斯克蛋糕」、「6吋」匹配「6吋巴斯克蛋糕」）
- **規格識別**：注意尺寸（6吋、8吋）、顏色、口味等規格，確保匹配正確的商品
- **價格自動填入**：找到匹配商品後，自動填入 price 欄位（數字）
- **商品詢問**：當客人問「有什麼」「菜單」「價目表」時，在 suggested_reply 中列出 2-5 個熱門商品，格式友善易讀
- **金額計算**：total_amount = sum(items.price * items.quantity)
- **日期解析**：「明天」= 今天+1天，「下週一」= 計算下週一的日期，「這週六」= 計算本週六的日期
- **時間格式**：「下午2點」= 14:00，「早上10點」= 10:00，「中午」= 12:00
- **數量**：如果沒說，預設為 1
- **商品名稱**：保持原文，包含尺寸和規格（如「巴斯克蛋糕 6吋」）
- **合併資訊**：新訊息的資訊覆蓋舊的，但不刪除未提到的欄位
- **延續對話**：如果是延續對話且補充了資訊，is_continuation = true
- **配送細節**：
  - 超商取貨必須要有店號或店名
  - 宅配必須要有完整地址
  - 冷凍商品要主動詢問是否需要冷凍配送

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}

// 生成商品型的 User Prompt
function generateGoodsUserPrompt(message: string): string {
  return `請解析這個訊息（如果有對話歷史，請合併資訊）：

**客人的新訊息：** ${message}

回傳 JSON 格式（不要有其他文字）：
{
  "intent": "order" | "inquiry" | "other",
  "confidence": 0.0-1.0,
  "is_continuation": true/false,
  "is_complete": true/false,
  "order": {
    "customer_name": "顧客姓名（如果有）",
    "customer_phone": "電話（如果有）",
    "items": [
      {
        "name": "商品名稱（含規格，如：巴斯克蛋糕 6吋）",
        "quantity": 數量,
        "price": 價格（從商品目錄自動填入，數字）,
        "notes": "備註（如果有，如：少糖、不要堅果）"
      }
    ],
    "delivery_date": "YYYY-MM-DD（如果有）",
    "delivery_time": "HH:MM（如果有）",
    "delivery_method": "pickup|convenience_store|black_cat（如果有）",
    "requires_frozen": true/false（如果有提到冷凍需求）,
    "store_info": "超商店號/店名（如果超商取貨）",
    "shipping_address": "寄送地址（如果宅配）",
    "total_amount": 金額（如果有）
  },
  "missing_fields": ["items", "delivery_date", "delivery_time", "delivery_method", "store_info", "shipping_address"] 中缺少的,
  "suggested_reply": "給客人的回覆訊息"
}

說明：
- is_complete = true：有商品、日期、時間、配送方式（且超商有店號或宅配有地址）
- is_complete = false：缺少必要資訊
- suggested_reply：根據情況回覆，例如：
  - 詢問商品：「我們有以下商品：\\n• 巴斯克蛋糕 6吋 $450\\n• 檸檬塔 $120\\n...」
  - 缺資訊：「收到！您要訂 XX。請問交付日期、時間和配送方式？」
  - 完整：「✅ 訂單已確認！...」`;
}

// OpenAI API 請求
async function callOpenAI(
  message: string,
  teamContext?: TeamContext,
  conversationHistory?: ConversationMessage[],
  collectedData?: any
): Promise<AIParseResult> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // 查詢商品目錄
  let products = [];
  if (teamContext?.team_id) {
    console.log("[AI Parse Goods] 查詢團隊商品:", teamContext.team_id);
    products = await fetchTeamProducts(teamContext.team_id);
    console.log("[AI Parse Goods] 找到商品數量:", products.length);
  }

  // 取得日期上下文
  const dateContext = getCurrentDateContext();

  // 取得業務類別標籤
  const businessType = teamContext?.business_type || "other";
  const businessLabel = businessTypeLabels[businessType] || "一般商家";

  // 確保 teamContext 存在
  const safeTeamContext: TeamContext = teamContext || {
    team_id: "",
    name: "商家",
    business_type: "other",
  };

  // 構建上下文字串
  const conversationContext = buildConversationContext(conversationHistory);
  const collectedDataContext = buildCollectedDataContext(collectedData);
  const productCatalog = generateProductCatalog(products);

  // 生成 Prompts
  const systemPrompt = generateGoodsPrompt(
    dateContext,
    safeTeamContext,
    businessLabel,
    conversationContext,
    collectedDataContext,
    productCatalog
  );

  const userPrompt = generateGoodsUserPrompt(message);

  console.log("[AI Parse Goods] 呼叫 OpenAI API...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 使用 GPT-4o-mini，速度快且成本低
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // 降低隨機性，提高準確性
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Parse Goods] OpenAI API 錯誤:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || "";

    console.log("[AI Parse Goods] OpenAI 回應:", rawResponse);

    // 解析 JSON 回應
    try {
      // 移除可能的 markdown 程式碼區塊標記
      let jsonText = rawResponse.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*\n/, "").replace(/\n```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*\n/, "").replace(/\n```$/, "");
      }

      const result: AIParseResult = JSON.parse(jsonText);
      result.raw_response = rawResponse;

      // 驗證必要欄位
      if (!result.intent) {
        result.intent = "other";
      }
      if (typeof result.confidence !== "number") {
        result.confidence = 0.5;
      }
      if (typeof result.is_continuation !== "boolean") {
        result.is_continuation = false;
      }
      if (typeof result.is_complete !== "boolean") {
        result.is_complete = false;
      }

      return result;
    } catch (parseError) {
      console.error("[AI Parse Goods] JSON 解析失敗:", parseError);
      // 如果 JSON 解析失敗，回傳低信心度的結果
      return {
        intent: "other",
        confidence: 0.0,
        is_continuation: false,
        is_complete: false,
        raw_response: rawResponse,
      };
    }
  } catch (error) {
    console.error("[AI Parse Goods] OpenAI 呼叫失敗:", error);
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

    // 解析請求
    const { message, team_context, conversation_history, collected_data } =
      await req.json();

    if (!message) {
      throw new Error("Missing message parameter");
    }

    console.log("[AI Parse Goods] 收到解析請求，訊息長度:", message.length);
    console.log(
      "[AI Parse Goods] 對話歷史數量:",
      conversation_history?.length || 0
    );
    console.log(
      "[AI Parse Goods] 已收集資訊:",
      collected_data ? "有" : "無"
    );

    // 呼叫 OpenAI 解析
    const result = await callOpenAI(
      message,
      team_context,
      conversation_history,
      collected_data
    );

    console.log("[AI Parse Goods] 解析完成:", {
      intent: result.intent,
      confidence: result.confidence,
      is_continuation: result.is_continuation,
      is_complete: result.is_complete,
      hasOrder: !!result.order,
      missing_fields: result.missing_fields,
    });

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AI Parse Goods] 錯誤:", error);

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

