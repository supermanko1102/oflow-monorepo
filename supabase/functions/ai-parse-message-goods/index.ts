// OFlow AI Message Parser - 商品型業務專用
// 處理烘焙、花店、手工藝等商品型業務的訊息解析
// 專注於商品匹配、配送方式、庫存相關邏輯

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import type {
  AIParseResult,
  ConversationMessage,
  Product,
  TeamContext,
} from "../_shared/types.ts";
import {
  fetchTeamProducts,
  generateProductCatalog,
} from "../_shared/product-fetcher.ts";
import {
  DeliverySettings,
  fetchTeamDeliverySettings,
  generateDeliveryMethodsPrompt,
} from "../_shared/delivery-settings-fetcher.ts";
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
  productCatalog: string,
  deliveryMethodsPrompt: string
): string {
  return `你是專業的訂單解析助手，專門處理 ${
    teamContext?.name || "商家"
  }（${businessLabel}）的訂單。

當前日期：${dateContext}
${productCatalog}
${conversationContext}${collectedDataContext}
${deliveryMethodsPrompt}

你的任務：
1. **判斷客人意圖 intent**：order / inquiry / other
2. **判斷對話階段 stage（甜點 4 階段）**：
   - inquiry：詢問商品或尚未提供商品內容
   - ordering：已表達下單意圖，但商品細節/數量尚需確認
   - delivery：商品已明確，正在確認配送方式/取貨資訊
   - contact：配送已決定，補齊姓名/電話/備註等聯絡資料

2. **循序漸進回覆策略**：
   - **打招呼階段**：簡短友善回應，例如「您好！請問需要什麼商品呢？」
   - **詢問商品階段**：列出商品（如果有目錄）或友善引導描述需求
   - **明確訂購階段**：確認商品並合併詢問所有缺失資訊
   - **補充資訊階段**：只詢問還缺的資訊，不重複問已有的資訊

3. **智能商品推薦與匹配**：
   - 有商品目錄時：從目錄推薦 2-5 個熱門商品，自動匹配價格
   - 無商品目錄時：引導客人描述需求，不推薦假商品

4. **配送方式理解與時間需求**：
   - **店取（pickup + pickup_type=store）**：「自取」「到店」「店取」→ 需要日期 + 時間（如 14:00）
   - **面交（pickup + pickup_type=meetup）**：「面交」「當面交」「約面交」→ 需要日期 + 時間 + 面交地點
   - **超商（convenience_store）**：「超商」「7-11」「全家」「萊爾富」→ 只需要日期（不需要時間），需要店號/店名
   - **宅配（black_cat）**：「宅配」「黑貓」「寄送」「配送」→ 只需要日期（不需要時間），需要寄送地址
   
   注意：pickup_type 只有在 delivery_method=pickup 時才填入（store 或 meetup），且**只有店取/面交需要 delivery_time，超商/宅配不需要時間**。

5. **提取完整訂單資訊**：
   - 顧客姓名（如果有）
   - 聯絡電話（如果有）
   - 商品列表（名稱、數量、價格、備註）
   - 配送方式和對應資訊：
     * 店取：pickup_type=store, delivery_date, delivery_time
     * 面交：pickup_type=meetup, pickup_location, delivery_date, delivery_time
     * 超商：store_info（不需要時間）
     * 宅配：shipping_address（不需要時間）
   - 總金額（自動計算）

完整度判斷（is_complete）：
- 店取：items + delivery_method=pickup + pickup_type=store + delivery_date + delivery_time
- 面交：items + delivery_method=pickup + pickup_type=meetup + pickup_location + delivery_date + delivery_time
- 超商：items + delivery_method=convenience_store + store_info
- 宅配：items + delivery_method=black_cat + shipping_address

注意事項：
- **智能預設值**：數量預設 1
- **不要重複詢問**：如果客人已經說了配送方式或地點，不要再問
- **合併詢問**：只在明確訂購階段才合併問多個問題
- **上下文理解**：
  * 客人說「桃園區面交」→ pickup_type=meetup, pickup_location="桃園區"
  * 客人說「我要自取」→ pickup_type=store（不是 meetup）
- **價格處理**：有目錄就自動填入，沒目錄就不填或填 null
- **日期時間解析**：「明天下午2點」→ 計算實際日期 + 14:00
- **延續對話**：補充資訊時設 is_continuation = true
- **配送方式守則**：只能使用「商家已啟用」的配送方式；客人要求未啟用的方式時，請禮貌說明不可用並引導改用可用選項
- **自動結單**：當所有「必要資訊」都已收集（missing_fields 為空）時，**請直接**將 is_complete 設為 true，intent 設為 order。**不要**為了詢問「備註」或「其他需求」而中斷結單流程。如果客人沒說備註，就留空。

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}

// 生成商品型的 User Prompt
function generateGoodsUserPrompt(message: string): string {
  return `請解析這個訊息（如果有對話歷史，請合併資訊）：

**客人的新訊息：** ${message}

回傳 JSON 格式（不要有其他文字）：
{
  "intent": "order" | "inquiry" | "other",
  "stage": "inquiry" | "ordering" | "delivery" | "contact",
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
    "delivery_time": "HH:MM（只有店取/面交需要，超商/宅配不需要）",
    "delivery_method": "pickup|convenience_store|black_cat（如果有）",
    "pickup_type": "store|meetup（僅當 delivery_method=pickup 時）",
    "pickup_location": "取貨/面交地點（如果有）",
    "requires_frozen": true/false（如果有提到冷凍需求）,
    "store_info": "超商店號/店名（如果超商取貨）",
    "shipping_address": "寄送地址（如果宅配）",
    "total_amount": 金額（如果有）
  },
  "missing_fields": ["items", "delivery_date", "delivery_time", "delivery_method", "pickup_type", "pickup_location", "store_info", "shipping_address"] 中缺少的（超商/宅配不要把時間當成缺失）,
  "suggested_reply": "給客人的回覆訊息"
}

說明：
- stage 定義（依甜點 4 階段）：inquiry(詢問商品/尚未下單)、ordering(已表達下單但商品細節待確認)、delivery(商品確定後補配送方式/取貨資訊)、contact(配送確定後補姓名/電話/備註)
- 姓名/電話如果缺少，要列入 missing_fields，並視為未完成（is_complete=false），在 suggested_reply 裡禮貌詢問
- is_complete 根據配送方式動態判斷：
  * 店取：items + delivery_method=pickup + pickup_type=store + delivery_date + delivery_time
  * 面交：items + delivery_method=pickup + pickup_type=meetup + pickup_location + delivery_date + delivery_time
  * 超商：items + delivery_method=convenience_store + store_info（時間不必填）
  * 宅配：items + delivery_method=black_cat + shipping_address（時間不必填）
- suggested_reply 根據 stage 調整：
  * inquiry：招呼 + 提供菜單/引導描述，避免一次問太多
  * ordering：確認商品/數量/價格，合併詢問缺的配送方式
  * delivery：只問配送/取貨相關（不要再問商品）
  * delivery：只問配送/取貨相關（不要再問商品）
  * contact：配送已定，補齊姓名/電話/備註；缺哪問哪，不重複
- **重要**：一旦所有必要欄位（missing_fields）都已填寫，**立即**回傳 is_complete=true，intent=order。**不要**詢問備註，除非客人主動提及。直接讓系統建立訂單。`;
}

const deliveryMissingFields = new Set([
  "delivery_method",
  "pickup_type",
  "pickup_location",
  "delivery_date",
  "delivery_time",
  "store_info",
  "shipping_address",
]);

const contactMissingFields = new Set(["customer_name", "customer_phone"]);

function inferStageFromResult(result: AIParseResult): AIParseResult["stage"] {
  if (result.is_complete) return "done";
  const missing = result.missing_fields || [];
  const hasItems =
    Array.isArray(result.order?.items) && result.order?.items.length > 0;

  if (!hasItems) return "inquiry";

  const needsDelivery = missing.some((f) => deliveryMissingFields.has(f));
  if (needsDelivery) return "delivery";

  const needsContact = missing.some((f) => contactMissingFields.has(f));
  if (needsContact) return "contact";

  return "ordering";
}

function getAllowedDeliveryMethods(
  settings: DeliverySettings | null
): string[] {
  const allowed = new Set<string>();

  if (
    settings?.pickup_settings?.store_pickup?.enabled ||
    settings?.pickup_settings?.meetup?.enabled
  ) {
    allowed.add("pickup");
  }
  if (settings?.enable_convenience_store) {
    allowed.add("convenience_store");
  }
  if (settings?.enable_black_cat) {
    allowed.add("black_cat");
  }

  return Array.from(allowed);
}

function enforceAllowedDeliveryMethod(
  result: AIParseResult,
  allowed: string[]
): AIParseResult {
  if (!result.order || allowed.length === 0) return result;
  const deliveryMethod = result.order.delivery_method;
  if (!deliveryMethod) return result;
  if (allowed.includes(deliveryMethod)) return result;

  // 移除不允許的配送方式，要求重新選擇
  result.order.delivery_method = undefined;
  (result.order as any).pickup_type = undefined;
  (result.order as any).pickup_location = undefined;
  (result.order as any).store_info = undefined;
  (result.order as any).shipping_address = undefined;
  (result.order as any).delivery_time = undefined;

  result.is_complete = false;
  result.missing_fields = Array.from(
    new Set([...(result.missing_fields || []), "delivery_method"])
  );

  const methodLabelMap: Record<string, string> = {
    pickup: "店取/面交",
    convenience_store: "超商取貨",
    black_cat: "宅配",
  };
  const allowedText = allowed.map((m) => methodLabelMap[m] || m).join("、");
  result.suggested_reply = `目前提供的配送方式：${allowedText}。請問您要選擇哪一種呢？`;
  return result;
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
  let products: Product[] = [];
  if (teamContext?.team_id) {
    console.log("[AI Parse Goods] 查詢團隊商品:", teamContext.team_id);
    products = await fetchTeamProducts(teamContext.team_id);
    console.log("[AI Parse Goods] 找到商品數量:", products.length);
  }

  // 查詢配送設定
  let deliverySettings: DeliverySettings | null = null;
  if (teamContext?.team_id) {
    console.log("[AI Parse Goods] 查詢配送設定:", teamContext.team_id);
    deliverySettings = await fetchTeamDeliverySettings(teamContext.team_id);
    console.log("[AI Parse Goods] 配送設定:", deliverySettings);
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
  const deliveryMethodsPrompt = generateDeliveryMethodsPrompt(deliverySettings);

  // 生成 Prompts
  const systemPrompt = generateGoodsPrompt(
    dateContext,
    safeTeamContext,
    businessLabel,
    conversationContext,
    collectedDataContext,
    productCatalog,
    deliveryMethodsPrompt
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
      if (!result.stage) {
        result.stage = inferStageFromResult(result);
      }
      const allowedMethods = getAllowedDeliveryMethods(deliverySettings);
      let updatedResult = enforceAllowedDeliveryMethod(result, allowedMethods);

      // Post-processing: Double check completion
      // 如果 missing_fields 為空，且有商品，強制設為 complete
      if (
        updatedResult.order &&
        updatedResult.order.items &&
        updatedResult.order.items.length > 0 &&
        (!updatedResult.missing_fields ||
          updatedResult.missing_fields.length === 0)
      ) {
        console.log(
          "[AI Parse Goods] 檢測到無缺失欄位，強制設定 is_complete = true"
        );
        updatedResult.is_complete = true;
        updatedResult.intent = "order";
        updatedResult.stage = "done";
      }

      return updatedResult;
    } catch (parseError) {
      console.error("[AI Parse Goods] JSON 解析失敗:", parseError);
      throw parseError;
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
    console.log("[AI Parse Goods] 已收集資訊:", collected_data ? "有" : "無");

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
      stage: result.stage,
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
