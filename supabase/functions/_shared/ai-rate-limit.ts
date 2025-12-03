import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// 速率限制結果介面
export interface RateLimitResult {
  allowed: boolean;
  reason?:
    | "daily_limit_exceeded"
    | "monthly_limit_exceeded"
    | "rate_limit_exceeded"
    | "ai_disabled"
    | "team_not_found";
  message?: string;
  daily_used?: number;
  daily_limit?: number;
  monthly_used?: number;
  monthly_limit?: number;
  minute_used?: number;
  minute_limit?: number;
}

/**
 * 檢查團隊 AI 配額
 */
export async function checkAIQuota(
  supabase: SupabaseClient,
  teamId: string
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_team_ai_quota", {
      p_team_id: teamId,
    });

    if (error) {
      console.error("[AI Rate Limit] 檢查配額失敗:", error);
      // 失敗時預設允許（避免影響正常流程）
      return { allowed: true };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error("[AI Rate Limit] 檢查配額異常:", error);
    return { allowed: true };
  }
}

/**
 * 記錄 AI 使用量
 */
export async function recordAIUsage(
  supabase: SupabaseClient,
  teamId: string,
  lineUserId: string,
  requestType: string,
  tokensUsed: number,
  costUsd: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_ai_usage", {
      p_team_id: teamId,
      p_line_user_id: lineUserId,
      p_request_type: requestType,
      p_tokens_used: tokensUsed,
      p_cost_usd: costUsd,
    });

    if (error) {
      console.error("[AI Rate Limit] 記錄使用量失敗:", error);
    }
  } catch (error) {
    console.error("[AI Rate Limit] 記錄使用量異常:", error);
  }
}

/**
 * 取得 GPT-5.1 定價
 */
export function getModelPricing(model: string = "gpt-5.1") {
  if (model === "gpt-5-mini") {
    return {
      input: 0.25 / 1000000,
      cached_input: 0.025 / 1000000,
      output: 2.0 / 1000000,
    };
  }
  // Default to GPT-5.1
  return {
    input: 1.25 / 1000000,
    cached_input: 0.125 / 1000000,
    output: 10.0 / 1000000,
  };
}

/**
 * 計算預估成本
 */
export function calculateEstimatedCost(
  inputTokens: number,
  outputTokens: number,
  model: string = "gpt-5.1",
  isCached: boolean = false
): number {
  const pricing = getModelPricing(model);
  const inputCost = isCached
    ? inputTokens * pricing.cached_input
    : inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  return inputCost + outputCost;
}
