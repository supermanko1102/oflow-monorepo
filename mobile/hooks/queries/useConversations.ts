/**
 * Conversations Query Hooks
 *
 * 使用 React Query 管理所有對話相關的 server state（Inbox 功能）
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as conversationService from "@/services/conversationService";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// ==================== Queries ====================

/**
 * 查詢團隊的對話列表
 *
 * @param teamId - 團隊 ID
 * @param status - 對話狀態（collecting_info, completed, abandoned）
 * @param limit - 限制筆數（預設 20）
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * Cache 策略：
 * - staleTime: 30 秒（對話可能頻繁變動）
 */
export function useConversations(
  teamId: string | null,
  status:
    | "collecting_info"
    | "completed"
    | "abandoned"
    | "awaiting_merchant_confirmation"
    | "requires_manual_handling" = "collecting_info",
  limit: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.conversations.list(teamId || "", status),
    queryFn: () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }
      return conversationService.getConversations(teamId, status, limit);
    },
    enabled: enabled && !!teamId,
    staleTime: 30 * 1000, // 30 秒
  });
}

/**
 * 查詢單一對話詳情（含歷史訊息）
 *
 * @param conversationId - 對話 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * Cache 策略：
 * - staleTime: 1 分鐘
 */
export function useConversationDetail(
  conversationId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || ""),
    queryFn: () => {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }
      return conversationService.getConversationById(conversationId);
    },
    enabled: enabled && !!conversationId,
    staleTime: 1 * 60 * 1000, // 1 分鐘
  });
}

/**
 * 對話 Realtime 訂閱
 *
 * 讓 Inbox 在有新增/更新/刪除時自動更新
 */
export function useConversationsRealtime(teamId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`conversations-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversations.all(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);
}

// ==================== Mutations ====================

/**
 * 忽略對話
 *
 * 成功後：
 * - 自動 invalidate 對話列表
 * - 自動 invalidate 該對話的詳情
 */
export function useIgnoreConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationService.ignoreConversation,
    onSuccess: (_, conversationId) => {
      // 重新載入所有對話列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all(),
      });

      // 重新載入該對話詳情
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      });
    },
  });
}

/**
 * 確認建單（從對話建立訂單）
 *
 * 成功後：
 * - 自動 invalidate 對話列表
 * - 自動 invalidate 該對話的詳情
 * - 自動 invalidate 訂單列表
 * - 自動 invalidate Dashboard
 */
export function useConfirmConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      orderData,
    }: {
      conversationId: string;
      orderData: {
        customerName: string;
        customerPhone: string;
        items: any[];
        totalAmount: number;
        pickupDate: string;
        pickupTime: string;
        customerNotes?: string;
      };
    }) => conversationService.confirmConversation(conversationId, orderData),
    onSuccess: (_, variables) => {
      // 重新載入所有對話列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all(),
      });

      // 重新載入該對話詳情
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });

      // 重新載入訂單列表（因為建立了新訂單）
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(),
      });

      // 重新載入 Dashboard
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(),
      });
    },
  });
}
