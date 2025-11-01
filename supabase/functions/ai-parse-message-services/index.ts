// OFlow AI Message Parser - 服務型業務專用
// 處理美容、按摩、美甲等服務型業務的訊息解析
// 專注於時段管理、預約邏輯

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
  beauty: "美容美髮",
  massage: "按摩 SPA",
  nail: "美甲美睫",
  pet: "寵物美容",
};

// 生成服務型業務的 System Prompt
function generateServicesPrompt(
  dateContext: string,
  teamContext: TeamContext,
  businessLabel: string,
  conversationContext: string,
  collectedDataContext: string,
  serviceCatalog: string
): string {
  return `你是專業的預約助手，專門處理 ${
    teamContext?.name || "商家"
  }（${businessLabel}）的預約。

當前日期：${dateContext}
${serviceCatalog}
${conversationContext}${collectedDataContext}

你的任務：
1. 判斷訊息的意圖（order/inquiry/other）
2. **智能服務推薦**：當客人詢問「有什麼服務」「價目表」「服務項目」時，從上方服務項目目錄中推薦 2-5 個服務項目，並在 suggested_reply 中列出服務名稱、時長和價格
3. **服務匹配與價格填入**：當客人提到服務項目時，從服務目錄中找到匹配的項目（支援模糊匹配，如「剪髮」匹配「女生剪髮」），並自動填入 price 欄位
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
- **服務匹配**：客人提到的服務名稱要與服務目錄比對（支援模糊匹配，如「剪髮」匹配「女生剪髮」、「染」匹配「染髮」）
- **時段理解**：準確理解時段語意：
  - 「這週六早上」= 計算本週六日期 + 10:00
  - 「下午3點左右」= 15:00
  - 「早上」= 10:00，「下午」= 14:00，「傍晚」= 17:00
- **價格自動填入**：找到匹配服務後，自動填入 price 欄位（數字）
- **服務詢問**：當客人問「有什麼服務」「價目表」時，在 suggested_reply 中列出 2-5 個服務項目，格式友善易讀
- **金額計算**：total_amount = sum(items.price * items.quantity)
- **日期解析**：「明天」= 今天+1天，「下週一」= 計算下週一的日期，「這週六」= 計算本週六的日期
- **時間格式**：「下午2點」= 14:00，「早上10點」= 10:00
- **數量**：如果沒說，預設為 1
- **服務名稱**：保持原文（如「女生剪髮」「染髮」「精油按摩」）
- **合併資訊**：新訊息的資訊覆蓋舊的，但不刪除未提到的欄位
- **延續對話**：如果是延續對話且補充了資訊，is_continuation = true
- **delivery_method 自動設為 "onsite"**，不需要客人指定
- **特殊需求記錄**：
  - 過敏史（藥物、化學品）
  - 頭髮狀況（染過、燙過、受損程度）
  - 身體狀況（孕婦、皮膚敏感）
  - 設計師偏好（如果客人提到）

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}

// 生成服務型的 User Prompt
function generateServicesUserPrompt(message: string): string {
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
- suggested_reply：根據情況回覆，例如：
  - 詢問服務：「我們提供以下服務：\\n• 女生剪髮 $800（約90分鐘）\\n• 染髮 $2500（約180分鐘）\\n...」
  - 缺資訊：「收到！您要預約 XX 服務。請問預約日期和時間？」
  - 完整：「✅ 預約已確認！...」`;
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

  // 查詢服務項目目錄
  let services = [];
  if (teamContext?.team_id) {
    console.log("[AI Parse Services] 查詢團隊服務:", teamContext.team_id);
    services = await fetchTeamProducts(teamContext.team_id);
    console.log("[AI Parse Services] 找到服務數量:", services.length);
  }

  // 取得日期上下文
  const dateContext = getCurrentDateContext();

  // 取得業務類別標籤
  const businessType = teamContext?.business_type || "beauty";
  const businessLabel = businessTypeLabels[businessType] || "服務業";

  // 確保 teamContext 存在
  const safeTeamContext: TeamContext = teamContext || {
    team_id: "",
    name: "商家",
    business_type: "beauty",
  };

  // 構建上下文字串
  const conversationContext = buildConversationContext(conversationHistory);
  const collectedDataContext = buildCollectedDataContext(collectedData);
  const serviceCatalog = generateProductCatalog(services);

  // 生成 Prompts
  const systemPrompt = generateServicesPrompt(
    dateContext,
    safeTeamContext,
    businessLabel,
    conversationContext,
    collectedDataContext,
    serviceCatalog
  );

  const userPrompt = generateServicesUserPrompt(message);

  console.log("[AI Parse Services] 呼叫 OpenAI API...");

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
      console.error("[AI Parse Services] OpenAI API 錯誤:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || "";

    console.log("[AI Parse Services] OpenAI 回應:", rawResponse);

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

      // 服務型業務自動設定 delivery_method = "onsite"
      if (result.order && !result.order.delivery_method) {
        result.order.delivery_method = "onsite";
      }

      return result;
    } catch (parseError) {
      console.error("[AI Parse Services] JSON 解析失敗:", parseError);
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
    console.error("[AI Parse Services] OpenAI 呼叫失敗:", error);
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

    console.log(
      "[AI Parse Services] 收到解析請求，訊息長度:",
      message.length
    );
    console.log(
      "[AI Parse Services] 對話歷史數量:",
      conversation_history?.length || 0
    );
    console.log(
      "[AI Parse Services] 已收集資訊:",
      collected_data ? "有" : "無"
    );

    // 呼叫 OpenAI 解析
    const result = await callOpenAI(
      message,
      team_context,
      conversation_history,
      collected_data
    );

    console.log("[AI Parse Services] 解析完成:", {
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
    console.error("[AI Parse Services] 錯誤:", error);

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

