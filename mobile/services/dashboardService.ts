/**
 * Dashboard Service
 * 封裝首頁 Dashboard 相關的 API 呼叫
 */

import { ApiClient } from "@/lib/apiClient";
import { config } from "@/lib/config";
import type { DashboardSummary } from "@/types/order";

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
