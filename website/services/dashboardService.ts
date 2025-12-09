import { ApiClient } from "@/lib/apiClient";

type DashboardSummary = {
  todayPending: unknown[];
  todayCompleted: unknown[];
  future: unknown[];
  recentOrders?: unknown[];
};

const dashboardApi = new ApiClient(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/order-operations`
);

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
    recentOrders: response.recentOrders,
  };
}

export async function getDashboardActivity(params: {
  teamId: string;
  limit?: number;
  cursor?: string;
}): Promise<{ items: unknown[]; nextCursor: string | null }> {
  const { teamId, limit = 20, cursor } = params;
  const response = await dashboardApi.call<
    { success: boolean } & { items: unknown[]; nextCursor: string | null }
  >("GET", "dashboard-activity", {
    team_id: teamId,
    limit: String(limit),
    cursor: cursor ?? "",
  });

  return {
    items: response.items,
    nextCursor: response.nextCursor,
  };
}
