// OFlow AI Message Parser
// 使用 OpenAI GPT-4 解析 LINE 訊息，提取訂單資訊
// 整合商品資料，提供智能推薦

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 對話歷史訊息介面
interface ConversationMessage {
  role: "customer" | "ai";
  message: string;
}

// AI 解析結果介面
interface AIParseResult {
  intent: "order" | "inquiry" | "other";
  confidence: number;
  is_continuation: boolean; // 是否延續之前的對話
  is_complete: boolean; // 資訊是否完整可建單
  order?: {
    customer_name?: string;
    customer_phone?: string;
    items: Array<{
      name: string;
      quantity: number;
      price?: number; // 商品價格（從商品資料庫自動填入）⭐
      notes?: string;
    }>;
    delivery_date?: string; // YYYY-MM-DD (通用：交付/預約日期)
    delivery_time?: string; // HH:MM (通用：交付/預約時間)
    delivery_method?: "pickup" | "convenience_store" | "black_cat" | "onsite";

    // 商品型專屬
    requires_frozen?: boolean;
    store_info?: string;
    shipping_address?: string;

    // 服務型專屬
    service_duration?: number;
    service_notes?: string;

    total_amount?: number;

    // 向後兼容
    pickup_date?: string;
    pickup_time?: string;
  };
  missing_fields?: string[]; // 缺少的欄位
  suggested_reply?: string; // 建議的回覆訊息
  raw_response?: string;
}

// 商品介面
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  description?: string;
}

// 生成商品型業務的 System Prompt（烘焙、花店等）
function generateProductBasedPrompt(
  dateContext: string,
  teamContext: any,
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
2. **智能商品推薦**：當客人詢問「有什麼商品」「有哪些蛋糕」時，從上方商品目錄中推薦，並在 suggested_reply 中列出商品名稱和價格
3. **商品匹配與價格填入**：當客人提到商品名稱時，從商品目錄中找到匹配的商品，並自動填入 price 欄位
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
- "自己來拿"/"到店取"/"門市取貨" → pickup
- "超商"/"7-11"/"全家"/"超商取貨" → convenience_store
- "宅配"/"黑貓"/"寄送"/"配送" → black_cat

完整度判斷（is_complete）：
- 必填：items（商品）, delivery_date（交付日期）, delivery_time（交付時間）, delivery_method（配送方式）
- 超商取貨需要：store_info（店號/店名）
- 黑貓宅配需要：shipping_address（寄送地址）
- 如果商品需冷藏，需詢問：requires_frozen（是否冷凍配送）

注意事項：
- **商品匹配**：客人提到的商品名稱要與商品目錄比對（支援模糊匹配，如「巴斯克」匹配「巴斯克蛋糕」）
- **價格自動填入**：找到匹配商品後，自動填入 price 欄位（數字）
- **商品詢問**：當客人問「有什麼」「菜單」「價目表」時，在 suggested_reply 中列出 2-5 個熱門商品
- **金額計算**：total_amount = sum(items.price * items.quantity)
- 日期解析：「明天」= 今天+1天，「下週一」= 計算下週一的日期
- 時間格式：「下午2點」= 14:00，「早上10點」= 10:00
- 數量：如果沒說，預設為 1
- 商品名稱：保持原文，包含尺寸（如「6吋」「8吋」）
- 合併資訊：新訊息的資訊覆蓋舊的，但不刪除未提到的欄位
- 如果是延續對話且補充了資訊，is_continuation = true

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}

// 生成服務型業務的 System Prompt（美容美髮、按摩等）
function generateServiceBasedPrompt(
  dateContext: string,
  teamContext: any,
  businessLabel: string,
  conversationContext: string,
  collectedDataContext: string,
  productCatalog: string
): string {
  return `你是專業的預約助手，專門處理 ${
    teamContext?.name || "商家"
  }（${businessLabel}）的預約。

當前日期：${dateContext}
${productCatalog}
${conversationContext}${collectedDataContext}

你的任務：
1. 判斷訊息的意圖（order/inquiry/other）
2. **智能服務推薦**：當客人詢問「有什麼服務」「價目表」時，從上方服務項目目錄中推薦，並在 suggested_reply 中列出服務名稱和價格
3. **服務匹配與價格填入**：當客人提到服務項目時，從服務目錄中找到匹配的項目，並自動填入 price 欄位
4. 判斷是否為延續之前的對話（is_continuation）
5. 如果有對話歷史或已收集資訊，將新訊息與之前的資訊合併
6. 提取完整的預約資訊：
   - 顧客姓名（如果有提到「我是XXX」或稱呼）
   - 聯絡電話（如果有提到）
   - 服務項目列表（名稱、數量、價格、備註）
   - 預約日期（YYYY-MM-DD 格式，若只說「明天」請計算實際日期）
   - 預約時間（HH:MM 格式，24小時制）
   - 服務時長（如果客人提到，單位：分鐘）
   - 特殊需求（過敏、頭髮狀況、身體狀況等）
   - 總金額（根據服務價格自動計算）
7. 循序漸進引導：服務項目 → 預約時間 → 特殊需求

完整度判斷（is_complete）：
- 必填：items（服務項目）, delivery_date（預約日期）, delivery_time（預約時間）
- delivery_method 固定為 "onsite"（到店服務）
- 不需要詢問配送方式

注意事項：
- **服務匹配**：客人提到的服務名稱要與服務目錄比對（支援模糊匹配，如「剪髮」匹配「女生剪髮」）
- **價格自動填入**：找到匹配服務後，自動填入 price 欄位（數字）
- **服務詢問**：當客人問「有什麼服務」「價目表」時，在 suggested_reply 中列出 2-5 個服務項目
- **金額計算**：total_amount = sum(items.price * items.quantity)
- 日期解析：「明天」= 今天+1天，「下週一」= 計算下週一的日期
- 時間格式：「下午2點」= 14:00，「早上10點」= 10:00
- 數量：如果沒說，預設為 1
- 服務名稱：保持原文（如「女生剪髮」「染髮」「精油按摩」）
- 合併資訊：新訊息的資訊覆蓋舊的，但不刪除未提到的欄位
- 如果是延續對話且補充了資訊，is_continuation = true
- delivery_method 自動設為 "onsite"，不需要客人指定

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}

// 查詢團隊的上架商品
async function fetchTeamProducts(teamId: string): Promise<Product[]> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[AI Parse] Supabase credentials not configured, skipping product fetch"
    );
    return [];
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, category, unit, description")
      .eq("team_id", teamId)
      .eq("is_available", true) // 只查詢上架商品
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AI Parse] 查詢商品失敗:", error);
      return [];
    }

    return products || [];
  } catch (error) {
    console.error("[AI Parse] 查詢商品異常:", error);
    return [];
  }
}

// 生成商品目錄字串（供 AI 參考）
function generateProductCatalog(products: Product[]): string {
  if (!products || products.length === 0) {
    return "\n**商品目錄：** 目前尚未建立商品資料，請依據客人描述判斷。\n";
  }

  let catalog = "\n**商品/服務目錄（僅上架項目）：**\n";

  // 按分類分組
  const categorizedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // 生成目錄
  Object.entries(categorizedProducts).forEach(([category, items]) => {
    catalog += `\n【${category}】\n`;
    items.forEach((product) => {
      catalog += `  - ${product.name} $${product.price}/${product.unit}`;
      if (product.description) {
        catalog += ` (${product.description})`;
      }
      catalog += `\n`;
    });
  });

  catalog +=
    "\n**重要**：當客人提到商品名稱時，請從上方目錄找到匹配的商品，並自動填入 price 欄位。\n";

  return catalog;
}

// OpenAI API 請求（支援對話歷史、上下文、商品目錄）
async function callOpenAI(
  message: string,
  teamContext?: any,
  conversationHistory?: ConversationMessage[],
  collectedData?: any
): Promise<AIParseResult> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // 查詢商品目錄 ⭐
  let products: Product[] = [];
  if (teamContext?.team_id) {
    console.log("[AI Parse] 查詢團隊商品:", teamContext.team_id);
    products = await fetchTeamProducts(teamContext.team_id);
    console.log("[AI Parse] 找到商品數量:", products.length);
  }

  // 取得當前日期時間作為上下文
  const now = new Date();
  const dateContext = now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  // 判斷業務類型
  const businessType = teamContext?.business_type || "bakery";
  const isProductBased = ["bakery", "flower", "craft", "other"].includes(
    businessType
  );
  const isServiceBased = ["beauty", "massage", "nail", "pet"].includes(
    businessType
  );

  // 構建對話歷史字串
  let conversationContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = "\n\n**對話歷史（最近的對話）：**\n";
    // 反轉順序，讓最舊的在前面
    const orderedHistory = [...conversationHistory].reverse();
    orderedHistory.forEach((msg, idx) => {
      const speaker = msg.role === "customer" ? "客人" : "AI";
      conversationContext += `${idx + 1}. ${speaker}: ${msg.message}\n`;
    });
  }

  // 構建已收集資訊字串
  let collectedDataContext = "";
  if (collectedData && Object.keys(collectedData).length > 0) {
    collectedDataContext = "\n\n**已收集的訂單資訊：**\n";
    collectedDataContext += JSON.stringify(collectedData, null, 2);
  }

  // 取得業務類別標籤
  const businessTypeLabels: Record<string, string> = {
    bakery: "烘焙甜點",
    beauty: "美容美髮",
    massage: "按摩 SPA",
    nail: "美甲美睫",
    flower: "花店",
    craft: "手工藝",
    pet: "寵物美容",
    other: "其他",
  };
  const businessLabel = businessTypeLabels[businessType] || "一般商家";

  // 生成商品目錄字串 ⭐
  const productCatalog = generateProductCatalog(products);

  // 根據業務類型生成不同的系統提示詞（含商品目錄）
  const systemPrompt = isProductBased
    ? generateProductBasedPrompt(
        dateContext,
        teamContext,
        businessLabel,
        conversationContext,
        collectedDataContext,
        productCatalog
      )
    : generateServiceBasedPrompt(
        dateContext,
        teamContext,
        businessLabel,
        conversationContext,
        collectedDataContext,
        productCatalog
      );

  // 根據業務類型生成不同的 user prompt
  const userPrompt = isProductBased
    ? `請解析這個訊息（如果有對話歷史，請合併資訊）：

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
        "name": "商品名稱",
        "quantity": 數量,
        "price": 價格（從商品目錄自動填入，數字）,
        "notes": "備註（如果有）"
      }
    ],
    "delivery_date": "YYYY-MM-DD（如果有）",
    "delivery_time": "HH:MM（如果有）",
    "delivery_method": "pickup|convenience_store|black_cat（如果有）",
    "requires_frozen": true/false（如果有提到冷凍需求）,
    "store_info": "超商店號（如果超商取貨）",
    "shipping_address": "寄送地址（如果宅配）",
    "total_amount": 金額（如果有）
  },
  "missing_fields": ["items", "delivery_date", "delivery_time", "delivery_method"] 中缺少的,
  "suggested_reply": "給客人的回覆訊息"
}

說明：
- is_complete = true：有商品、日期、時間、配送方式（可以建立訂單）
- is_complete = false：缺少必要資訊
- suggested_reply：根據情況回覆，例如「收到！請問交付日期、時間和配送方式？」或「✅ 訂單已確認！...」`
    : `請解析這個訊息（如果有對話歷史，請合併資訊）：

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
        "name": "服務項目名稱",
        "quantity": 數量,
        "price": 價格（從服務目錄自動填入，數字）,
        "notes": "備註（如果有）"
      }
    ],
    "delivery_date": "YYYY-MM-DD（預約日期，如果有）",
    "delivery_time": "HH:MM（預約時間，如果有）",
    "delivery_method": "onsite（固定為到店服務）",
    "service_duration": 服務時長分鐘數（如果有提到）,
    "service_notes": "特殊需求（過敏、頭髮狀況等，如果有）",
    "total_amount": 金額（如果有）
  },
  "missing_fields": ["items", "delivery_date", "delivery_time"] 中缺少的,
  "suggested_reply": "給客人的回覆訊息"
}

說明：
- is_complete = true：有服務項目、預約日期、預約時間（可以建立預約）
- is_complete = false：缺少必要資訊
- delivery_method 自動設為 "onsite"
- suggested_reply：根據情況回覆，例如「收到！請問預約日期和時間？」或「✅ 預約已確認！...」`;

  console.log("[AI Parse] 呼叫 OpenAI API...");

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
      console.error("[AI Parse] OpenAI API 錯誤:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || "";

    console.log("[AI Parse] OpenAI 回應:", rawResponse);

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
      console.error("[AI Parse] JSON 解析失敗:", parseError);
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
    console.error("[AI Parse] OpenAI 呼叫失敗:", error);
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

    console.log("[AI Parse] 收到解析請求，訊息長度:", message.length);
    console.log("[AI Parse] 對話歷史數量:", conversation_history?.length || 0);
    console.log("[AI Parse] 已收集資訊:", collected_data ? "有" : "無");

    // 呼叫 OpenAI 解析
    const result = await callOpenAI(
      message,
      team_context,
      conversation_history,
      collected_data
    );

    console.log("[AI Parse] 解析完成:", {
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
    console.error("[AI Parse] 錯誤:", error);

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
