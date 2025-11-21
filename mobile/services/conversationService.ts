/**
 * Conversation Service
 * 封裝對話管理相關的 API 呼叫（Inbox 功能）
 */

import { ApiClient } from "@/lib/apiClient";
import type { Conversation, ConversationDetail } from "@/types/conversation";

// 建立 Conversation API Client 實例
const conversationApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/conversation-operations`
);

/**
 * 查詢對話列表
 *
 * @param teamId - 團隊 ID
 * @param status - 對話狀態（collecting_info, completed, abandoned）
 * @param limit - 限制筆數（預設 20）
 * @returns 對話列表
 */
export async function getConversations(
  teamId: string,
  status:
    | "collecting_info"
    | "completed"
    | "abandoned"
    | "awaiting_merchant_confirmation"
    | "requires_manual_handling" = "collecting_info",
  limit: number = 20
): Promise<Conversation[]> {
  const response = await conversationApi.call<{
    success: boolean;
    conversations: Conversation[];
  }>("GET", "list", {
    team_id: teamId,
    status,
    limit: limit.toString(),
  });

  return response.conversations;
}

/**
 * 查詢對話詳情（含歷史訊息）
 *
 * @param conversationId - 對話 ID
 * @returns 對話詳情與歷史訊息
 */
export async function getConversationById(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await conversationApi.call<{
    success: boolean;
    conversation: any;
    history: Array<{
      role: string;
      message: string;
      created_at: string;
    }>;
  }>("GET", "detail", {
    conversation_id: conversationId,
  });

  return {
    conversation: response.conversation,
    history: response.history,
  };
}

/**
 * 忽略對話
 *
 * @param conversationId - 對話 ID
 */
export async function ignoreConversation(
  conversationId: string
): Promise<void> {
  await conversationApi.call<{ success: boolean }>(
    "POST",
    "ignore",
    undefined,
    {
      conversation_id: conversationId,
    }
  );
}

/**
 * 確認建單（從對話建立訂單）
 *
 * @param conversationId - 對話 ID
 * @param orderData - 訂單資料
 * @returns 新建立的訂單 ID
 */
export async function confirmConversation(
  conversationId: string,
  orderData: {
    customerName: string;
    customerPhone: string;
    items: any[];
    totalAmount: number;
    pickupDate: string;
    pickupTime: string;
    customerNotes?: string;
  }
): Promise<string> {
  const response = await conversationApi.call<{
    success: boolean;
    orderId: string;
  }>("POST", "confirm", undefined, {
    conversation_id: conversationId,
    order_data: orderData,
  });

  return response.orderId;
}
