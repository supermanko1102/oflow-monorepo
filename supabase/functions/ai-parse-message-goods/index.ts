// OFlow AI Message Parser - 商品型業務專用（重構版）
// 處理烘焙、花店、手工藝等商品型業務的訊息解析

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
import {
  generateGoodsSystemPrompt,
  businessTypeLabels,
} from "./prompts/system.ts";
import { generateGoodsUserPrompt } from "./prompts/user.ts";
import { inferStageFromResult } from "./logic/stage.ts";
import {
  getAllowedDeliveryMethods,
  enforceAllowedDeliveryMethod,
  normalizeAIResult,
} from "./logic/postprocess.ts";
import { deriveStageHint } from "./logic/stageHint.ts";

function safeTeamContext(teamContext?: TeamContext): TeamContext {
  return (
    teamContext || {
      team_id: "",
      name: "商家",
      business_type: "other",
    }
  );
}

function resolveBusinessLabel(teamContext: TeamContext): string {
  const businessType = teamContext?.business_type || "other";
  return businessTypeLabels[businessType] || "一般商家";
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

  // 確保 teamContext 存在
  const normalizedTeamContext = safeTeamContext(teamContext);

  // 構建上下文字串
  const conversationContext = buildConversationContext(conversationHistory);
  const collectedDataContext = buildCollectedDataContext(collectedData);
  const productCatalog = generateProductCatalog(products);
  const deliveryMethodsPrompt = generateDeliveryMethodsPrompt(deliverySettings);

  // 預估階段提示（用收斂中的 collected_data）
  const stageHint = deriveStageHint(collectedData);

  // 生成 Prompts
  const systemPrompt = generateGoodsSystemPrompt(
    dateContext,
    normalizedTeamContext,
    resolveBusinessLabel(normalizedTeamContext),
    conversationContext,
    collectedDataContext,
    productCatalog,
    deliveryMethodsPrompt
  );
  const userPrompt = generateGoodsUserPrompt(message, stageHint);

  console.log("[AI Parse Goods] 呼叫 OpenAI API...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1", // 升級模型以提升理解與語氣
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // 降低隨機性，提高準確性
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
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

      const parsed: AIParseResult = JSON.parse(jsonText);
      parsed.raw_response = rawResponse;

      const updated = normalizeAIResult(parsed, deliverySettings);
      if (!updated.stage) {
        updated.stage = inferStageFromResult(updated);
      }

      return updated;
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
