import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { LineProfile } from "../types.ts";

export async function fetchLineProfile(
  userId: string,
  accessToken: string
): Promise<LineProfile> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn("[LINE Webhook] 取得 LINE Profile 失敗:", res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("[LINE Webhook] 取得 LINE Profile 例外:", err);
    return null;
  }
}

export async function saveIncomingMessage(
  supabase: SupabaseClient,
  teamId: string,
  lineMessageId: string,
  lineUserId: string,
  messageText: string,
  lineProfile: LineProfile
) {
  const { data, error } = await supabase
    .from("line_messages")
    .insert({
      team_id: teamId,
      line_message_id: lineMessageId,
      line_user_id: lineUserId,
      message_type: "text",
      message_text: messageText,
      role: "customer",
      message_data: lineProfile || null,
    })
    .select("id, message_data")
    .single();
  if (error) {
    throw error;
  }
  return data as { id: string; message_data: any };
}

export async function updateMessageConversation(
  supabase: SupabaseClient,
  messageId: string,
  conversationId: string,
  lineProfile: LineProfile,
  messageData: any
) {
  await supabase
    .from("line_messages")
    .update({
      conversation_id: conversationId,
      message_data: lineProfile || messageData || null,
    })
    .eq("id", messageId);
}
