/**
 * Delivery Settings Query Hooks
 *
 * 使用 React Query 管理配送設定相關的 server state
 * 包含：
 * - useDeliverySettings: 查詢配送設定
 * - useUpdateDeliverySettings: 更新配送設定
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as deliverySettingsService from "@/services/deliverySettingsService";
import type { DeliverySettings } from "@/types/delivery-settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ==================== Queries ====================

/**
 * 查詢團隊的配送設定
 *
 * @param teamId - 團隊 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * 使用時機：
 * - 配送設定頁面
 * - AI Webhook (後端)
 *
 * Cache 策略：
 * - staleTime: 5 分鐘（設定不常變動）
 */
export function useDeliverySettings(teamId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.deliverySettings.detail(teamId),
    queryFn: () => deliverySettingsService.getDeliverySettings(teamId),
    enabled: enabled && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
}

// ==================== Mutations ====================

/**
 * 更新配送設定
 *
 * 成功後：
 * - 自動 invalidate 該團隊的配送設定
 *
 * 使用範例：
 * ```tsx
 * const updateSettings = useUpdateDeliverySettings();
 *
 * await updateSettings.mutateAsync({
 *   teamId: 'xxx',
 *   settings: { ... }
 * });
 * ```
 */
export function useUpdateDeliverySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      settings,
    }: {
      teamId: string;
      settings: Partial<DeliverySettings>;
    }) => {
      return deliverySettingsService.updateDeliverySettings(teamId, settings);
    },
    onSuccess: (_, variables) => {
      // Invalidate 該團隊的配送設定
      queryClient.invalidateQueries({
        queryKey: queryKeys.deliverySettings.detail(variables.teamId),
      });
    },
  });
}

