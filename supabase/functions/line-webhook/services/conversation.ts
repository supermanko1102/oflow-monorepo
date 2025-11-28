import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { ConversationMessage } from "../../_shared/types.ts";

export type Conversation = {
  id: string;
  team_id: string;
  line_user_id: string;
  status: string;
  collected_data: Record<string, any> | null;
  missing_fields: string[] | null;
  order_id: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function ensureConversation(
  supabase: SupabaseClient,
  teamId: string,
  lineUserId: string
): Promise<Conversation> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_team_id: teamId,
    p_line_user_id: lineUserId,
  });
  if (error || !data || data.length === 0) {
    throw error || new Error("Failed to get or create conversation");
  }
  return data[0] as Conversation;
}

export async function ensureConversationDisplayName(
  supabase: SupabaseClient,
  conversation: Conversation,
  displayName?: string
): Promise<Conversation> {
  if (!conversation || !displayName) return conversation;
  const existing =
    conversation.collected_data?.line_display_name ||
    (conversation as any).line_display_name;
  if (existing === displayName) return conversation;

  const newCollected = {
    ...(conversation.collected_data || {}),
    line_display_name: displayName,
  };

  await supabase
    .from("conversations")
    .update({
      collected_data: newCollected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return { ...conversation, collected_data: newCollected };
}

export async function findActiveConversation(
  supabase: SupabaseClient,
  teamId: string,
  lineUserId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("team_id", teamId)
    .eq("line_user_id", lineUserId)
    .eq("status", "collecting_info")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[LINE Webhook] findActiveConversation failed:", error);
    return null;
  }

  return (data as Conversation) || null;
}

export async function fetchConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase.rpc("get_conversation_history", {
    p_conversation_id: conversationId,
    p_limit: limit,
  });
  if (error) {
    console.error("[LINE Webhook] 對話歷史查詢失敗:", error);
    return [];
  }
  return (data || []) as ConversationMessage[];
}

export async function updateConversationData(
  supabase: SupabaseClient,
  conversationId: string,
  collectedData: any,
  missingFields: string[]
) {
  await supabase.rpc("update_conversation_data", {
    p_conversation_id: conversationId,
    p_collected_data: collectedData,
    p_missing_fields: missingFields,
  });
}
