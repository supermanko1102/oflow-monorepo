/**
 * Conversation Types
 * 對話相關的類型定義
 */

export interface Conversation {
  id: string;
  team_id: string;
  line_user_id: string;
  status: "collecting_info" | "completed" | "abandoned";
  collected_data: Record<string, any>;
  missing_fields: string[];
  order_id: string | null;
  order_number?: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  turn_count?: number;
  lastMessage?: {
    role: string;
    message: string;
    created_at: string;
  } | null;
}

export interface ConversationDetail {
  conversation: Conversation;
  history: Array<{
    role: string;
    message: string;
    created_at: string;
  }>;
}
