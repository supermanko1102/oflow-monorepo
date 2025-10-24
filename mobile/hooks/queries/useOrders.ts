/**
 * Orders Query Hooks
 * 
 * 使用 React Query 管理所有訂單相關的 server state
 * 包含：
 * - useOrders: 查詢團隊的訂單列表
 * - useOrderDetail: 查詢單一訂單詳情
 * - useUpdateOrderStatus: 更新訂單狀態
 * - useUpdateOrder: 更新訂單資料
 */

import { queryKeys } from '@/hooks/queries/queryKeys';
import * as orderService from '@/services/orderService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderFilters } from '@/services/orderService';

// ==================== Queries ====================

/**
 * 查詢團隊的訂單列表
 * 
 * @param teamId - 團隊 ID
 * @param filters - 篩選條件（狀態、日期範圍、搜尋）
 * @param enabled - 是否啟用查詢（預設為 true）
 * 
 * 使用時機：
 * - 訂單列表頁
 * - 首頁訂單預覽
 * 
 * Cache 策略：
 * - staleTime: 1 分鐘（訂單可能頻繁變動）
 * - 支援下拉重新整理
 */
export function useOrders(
  teamId: string | null,
  filters?: OrderFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.orders.list(teamId || '', filters),
    queryFn: () => {
      if (!teamId) {
        throw new Error('Team ID is required');
      }
      return orderService.getOrders(teamId, filters);
    },
    enabled: enabled && !!teamId,
    staleTime: 1 * 60 * 1000, // 1 分鐘
  });
}

/**
 * 查詢單一訂單詳情
 * 
 * @param orderId - 訂單 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 * 
 * 使用時機：
 * - 訂單詳情頁
 * 
 * Cache 策略：
 * - staleTime: 2 分鐘（詳情頁較少變動）
 */
export function useOrderDetail(orderId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId || ''),
    queryFn: () => {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      return orderService.getOrderById(orderId);
    },
    enabled: enabled && !!orderId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  });
}

// ==================== Mutations ====================

/**
 * 更新訂單狀態
 * 
 * 成功後：
 * - 自動 invalidate 該訂單的詳情
 * - 自動 invalidate 訂單列表
 * 
 * 使用範例：
 * ```tsx
 * const updateStatus = useUpdateOrderStatus();
 * 
 * const handleComplete = async (orderId: string) => {
 *   try {
 *     await updateStatus.mutateAsync({
 *       order_id: orderId,
 *       status: 'completed',
 *     });
 *     toast.success('訂單已完成');
 *   } catch (error) {
 *     toast.error('更新失敗');
 *   }
 * };
 * ```
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.updateOrderStatus,
    onSuccess: (_, variables) => {
      // 更新成功後，重新載入該訂單詳情
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.order_id),
      });

      // 重新載入所有訂單列表（因為狀態變更可能影響列表篩選）
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(),
      });
    },
  });
}

/**
 * 更新訂單資料
 * 
 * 成功後：
 * - 自動 invalidate 該訂單的詳情
 * - 自動 invalidate 訂單列表
 * 
 * 使用範例：
 * ```tsx
 * const updateOrder = useUpdateOrder();
 * 
 * const handleUpdateNotes = async (orderId: string, notes: string) => {
 *   try {
 *     await updateOrder.mutateAsync({
 *       order_id: orderId,
 *       notes,
 *     });
 *     toast.success('備註已更新');
 *   } catch (error) {
 *     toast.error('更新失敗');
 *   }
 * };
 * ```
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.updateOrder,
    onSuccess: (_, variables) => {
      // 更新成功後，重新載入該訂單詳情
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.order_id),
      });

      // 重新載入所有訂單列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(),
      });
    },
  });
}

// ==================== Helper Functions ====================

/**
 * Prefetch orders list
 * 
 * 使用時機：
 * - 選擇團隊後
 * - 預期使用者即將查看訂單列表時
 * 
 * 範例：
 * ```tsx
 * import { prefetchOrders } from '@/hooks/queries/useOrders';
 * 
 * // 在選擇團隊後
 * await prefetchOrders(queryClient, teamId);
 * ```
 */
export async function prefetchOrders(
  queryClient: ReturnType<typeof useQueryClient>,
  teamId: string,
  filters?: OrderFilters
) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.orders.list(teamId, filters),
    queryFn: () => orderService.getOrders(teamId, filters),
    staleTime: 1 * 60 * 1000,
  });
}

