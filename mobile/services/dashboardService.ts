/**
 * Dashboard Service
 * 封裝首頁 Dashboard 相關的 API 呼叫
 */

import { ApiClient } from "@/lib/apiClient";
import { config } from "@/lib/config";
import type { DashboardSummary, RevenueStats, TimeRange } from "@/types/order";

// 建立 Dashboard API Client 實例
const dashboardApi = new ApiClient(config.api.orderOperations);

/**
 * 查詢 Dashboard 摘要
 * 包含今日待處理、今日已完成、未來訂單
 *
 * @param teamId - 團隊 ID
 * @returns Dashboard 摘要資料
 */
export async function getDashboardSummary(
  teamId: string
): Promise<DashboardSummary> {
  const response = await dashboardApi.call<
    { success: boolean } & DashboardSummary
  >("GET", "dashboard-summary", {
    team_id: teamId,
  });

  return {
    todayPending: response.todayPending,
    todayCompleted: response.todayCompleted,
    future: response.future,
  };
}

/**
 * 查詢營收統計
 * 支援不同時間範圍的營收統計查詢
 *
 * @param teamId - 團隊 ID
 * @param timeRange - 時間範圍（day/week/month/year）
 * @returns 營收統計資料
 */
export async function getRevenueStats(
  teamId: string,
  timeRange: TimeRange
): Promise<RevenueStats> {
  const response = await dashboardApi.call<{ success: boolean } & RevenueStats>(
    "GET",
    "revenue-stats",
    {
      team_id: teamId,
      time_range: timeRange,
    }
  );

  return {
    timeRange: response.timeRange,
    startDate: response.startDate,
    endDate: response.endDate,
    totalRevenue: response.totalRevenue,
    orderCount: response.orderCount,
    paymentStats: response.paymentStats,
  };
}
