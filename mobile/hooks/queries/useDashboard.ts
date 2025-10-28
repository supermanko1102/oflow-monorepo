/**
 * Dashboard Query Hooks
 *
 * 使用 React Query 管理 Dashboard 相關的 server state
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as dashboardService from "@/services/dashboardService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * 查詢 Dashboard 摘要
 *
 * @param teamId - 團隊 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * 使用時機：
 * - 首頁 Dashboard
 *
 * Cache 策略：
 * - staleTime: 1 分鐘（Dashboard 資料可能頻繁變動）
 * - 支援下拉重新整理
 *
 * 回傳資料：
 * - todayPending: 今日待處理訂單
 * - todayCompleted: 今日已完成訂單
 * - future: 未來訂單（最多 50 筆）
 */
export function useDashboardSummary(
  teamId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(teamId || ""),
    queryFn: () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }
      return dashboardService.getDashboardSummary(teamId);
    },
    enabled: enabled && !!teamId,
    staleTime: 1 * 60 * 1000, // 1 分鐘
  });
}

/**
 * Prefetch Dashboard Summary
 *
 * 使用時機：
 * - 選擇團隊後
 * - 預期使用者即將查看首頁時
 *
 * 範例：
 * ```tsx
 * import { prefetchDashboardSummary } from '@/hooks/queries/useDashboard';
 *
 * // 在選擇團隊後
 * await prefetchDashboardSummary(queryClient, teamId);
 * ```
 */
export async function prefetchDashboardSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  teamId: string
) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.summary(teamId),
    queryFn: () => dashboardService.getDashboardSummary(teamId),
    staleTime: 1 * 60 * 1000,
  });
}
