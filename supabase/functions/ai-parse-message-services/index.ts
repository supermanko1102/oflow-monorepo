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
1. **判斷客人意圖和對話階段**：
   - greeting（打招呼）：「你好」「在嗎」「想問一下」
   - inquiry（詢問服務）：「有什麼服務」「價目表」「服務項目」
   - ordering（明確預約）：「我要預約XX」「我要做XX」
   - supplementing（補充資訊）：延續之前的對話，補充細節

2. **循序漸進回覆策略**：
   - **打招呼階段**：簡短友善回應，例如「您好！請問想預約什麼服務呢？」
   - **詢問服務階段**：列出服務（如果有目錄）或友善引導描述需求
   - **明確預約階段**：確認服務並合併詢問所有缺失資訊（日期時間）
   - **補充資訊階段**：只詢問還缺的資訊，不重複問已有的資訊

3. **智能服務推薦與匹配**：
   - 有服務目錄時：從目錄推薦 2-5 個熱門服務，自動匹配價格
   - 無服務目錄時：引導客人描述需求，不推薦假服務

4. **提取完整預約資訊**：
   - 顧客姓名（如果有）
   - 聯絡電話（如果有）
   - 服務項目列表（名稱、數量、價格、時長、備註）
   - 預約日期（YYYY-MM-DD）
   - 預約時間（HH:MM，24小時制）
   - 特殊需求（過敏、身體狀況等）
   - 總金額（自動計算）

完整度判斷（is_complete）：
- 必填：items（服務項目）+ delivery_date（預約日期）+ delivery_time（預約時間）
- delivery_method 自動設為 "onsite"（到店服務）

注意事項：
- **智能預設值**：數量預設 1
- **不要重複詢問**：如果客人已經說了日期時間，不要再問
- **合併詢問**：只在明確預約階段才合併問多個問題
- **時段理解**：
  * 「這週六早上」= 計算本週六日期 + 10:00
  * 「下午3點左右」= 15:00
  * 「早上」= 10:00，「下午」= 14:00，「傍晚」= 17:00
- **服務匹配**：支援模糊匹配（「剪髮」→「女生剪髮」）
- **價格處理**：有目錄就自動填入，沒目錄就不填或填 null
- **日期時間解析**：「明天下午2點」→ 計算實際日期 + 14:00
- **延續對話**：補充資訊時設 is_continuation = true
- **特殊需求記錄**：過敏史、頭髮/身體狀況、設計師偏好

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
- suggested_reply 根據對話階段調整：
  * 打招呼：「您好！請問想預約什麼服務呢？」（不要一次問太多）
  * 詢問服務：列出服務或引導描述
  * 明確預約：確認服務並合併詢問缺失資訊
  * 補充資訊：只問還缺的，不重複問`;
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

