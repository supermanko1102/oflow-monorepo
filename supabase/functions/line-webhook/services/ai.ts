import type { AIParseResult, ConversationMessage, TeamContext } from "../../_shared/types.ts";
import { isServiceBasedBusiness } from "../types.ts";

export async function callAIParser(
  message: string,
  team: TeamContext,
  history: ConversationMessage[],
  collectedData: any
): Promise<AIParseResult> {
  const functionName = isServiceBasedBusiness(team.business_type)
    ? "ai-parse-message-services"
    : "ai-parse-message-goods";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL/Anon key not configured");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message,
      team_context: team,
      conversation_history: history,
      collected_data: collectedData,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Parse API error: ${res.status}`);
  }

  const data = await res.json();
  return data.result as AIParseResult;
}

export function mergeCollectedData(
  current: any,
  aiResult: AIParseResult
): { collected: any; missing: string[] } {
  const merged = {
    ...(current || {}),
    ...(aiResult.order || {}),
  };
  return { collected: merged, missing: aiResult.missing_fields || [] };
}
