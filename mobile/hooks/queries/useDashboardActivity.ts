import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { getDashboardActivity } from "@/services/dashboardService";
import { DashboardActivityPage } from "@/types/order";

type Params = {
  teamId?: string | null;
  enabled?: boolean;
  pageSize?: number;
};

export function useDashboardActivity({
  teamId,
  enabled = true,
  pageSize = 20,
}: Params) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.dashboard.activity(teamId || ""), pageSize],
    enabled: enabled && !!teamId,
    getNextPageParam: (lastPage: DashboardActivityPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getDashboardActivity({
        teamId: teamId as string,
        limit: pageSize,
        cursor: pageParam ?? undefined,
      }),
  });
}
