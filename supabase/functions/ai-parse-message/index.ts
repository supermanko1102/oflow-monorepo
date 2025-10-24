// OFlow AI Message Parser
// 使用 OpenAI GPT-4 解析 LINE 訊息，提取訂單資訊

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// AI 解析結果介面
interface AIParseResult {
  intent: "order" | "inquiry" | "other";
  confidence: number;
  order?: {
    customer_name?: string;
    customer_phone?: string;
    items: Array<{
      name: string;
      quantity: number;
      notes?: string;
    }>;
    pickup_date?: string; // YYYY-MM-DD
    pickup_time?: string; // HH:MM
    total_amount?: number;
  };
  raw_response?: string;
}

// OpenAI API 請求
async function callOpenAI(message: string, teamContext?: any): Promise<AIParseResult> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // 取得當前日期時間作為上下文
  const now = new Date();
  const dateContext = now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  // 構建系統提示詞
  const systemPrompt = `你是一個專業的訂單解析助手，專門從對話中提取訂單資訊。

當前日期：${dateContext}
團隊資訊：${teamContext?.name || "未知"}（${teamContext?.business_type || "一般商家"}）

你的任務：
1. 判斷訊息的意圖（order/inquiry/other）
2. 如果是訂單，提取以下資訊：
   - 顧客姓名（如果有提到「我是XXX」或稱呼）
   - 聯絡電話（如果有提到）
   - 商品列表（名稱、數量、備註）
   - 取貨日期（YYYY-MM-DD 格式，若只說「明天」請計算實際日期）
   - 取貨時間（HH:MM 格式，24小時制）
   - 總金額（如果有提到）

注意事項：
- 日期解析：「明天」= 今天+1天，「下週一」= 計算下週一的日期
- 時間格式：「下午2點」= 14:00，「早上10點」= 10:00
- 數量：如果沒說，預設為 1
- 商品名稱：保持原文，包含尺寸（如「6吋」「8吋」）

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;

  const userPrompt = `請解析這個訊息：

${message}

回傳 JSON 格式（不要有其他文字）：
{
  "intent": "order" | "inquiry" | "other",
  "confidence": 0.0-1.0,
  "order": {
    "customer_name": "顧客姓名（如果有）",
    "customer_phone": "電話（如果有）",
    "items": [
      {
        "name": "商品名稱",
        "quantity": 數量,
        "notes": "備註（如果有）"
      }
    ],
    "pickup_date": "YYYY-MM-DD（如果有）",
    "pickup_time": "HH:MM（如果有）",
    "total_amount": 金額（如果有）
  }
}`;

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

      return result;
    } catch (parseError) {
      console.error("[AI Parse] JSON 解析失敗:", parseError);
      // 如果 JSON 解析失敗，回傳低信心度的結果
      return {
        intent: "other",
        confidence: 0.0,
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
    const { message, team_context } = await req.json();

    if (!message) {
      throw new Error("Missing message parameter");
    }

    console.log("[AI Parse] 收到解析請求，訊息長度:", message.length);

    // 呼叫 OpenAI 解析
    const result = await callOpenAI(message, team_context);

    console.log("[AI Parse] 解析完成:", {
      intent: result.intent,
      confidence: result.confidence,
      hasOrder: !!result.order,
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

