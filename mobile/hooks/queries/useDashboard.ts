/**
 * Dashboard Query Hooks
 *
 * 使用 React Query 管理 Dashboard 相關的 server state
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as dashboardService from "@/services/dashboardService";
import type { TimeRange } from "@/types/order";
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

/**
 * 查詢營收統計
 *
 * @param teamId - 團隊 ID
 * @param timeRange - 時間範圍（day/week/month/year）
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * 使用時機：
 * - 首頁營收統計卡片
 * - 統計報表頁面
 *
 * Cache 策略：
 * - staleTime: 5 分鐘（營收統計變動頻率較低）
 * - 支援不同時間範圍的獨立快取
 *
 * 回傳資料：
 * - totalRevenue: 總營收
 * - orderCount: 訂單數量
 * - paymentStats: 按付款方式分類的營收統計
 */
export function useRevenueStats(
  teamId: string | null,
  timeRange: TimeRange,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.dashboard.revenueStats(teamId || "", timeRange),
    queryFn: () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }
      return dashboardService.getRevenueStats(teamId, timeRange);
    },
    enabled: enabled && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
}
