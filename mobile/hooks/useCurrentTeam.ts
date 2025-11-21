import { useMemo } from "react";

import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/auth";

export function useCurrentTeam(options?: Parameters<typeof useTeams>[0]) {
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const teamsQuery = useTeams(options);

  const currentTeam = useMemo(
    () => teamsQuery.data?.find((team) => team.team_id === currentTeamId),
    [teamsQuery.data, currentTeamId]
  );
  const hasWebhook = useMemo(
    () => Boolean(currentTeam?.line_channel_id),
    [currentTeam?.line_channel_id]
  );

  return {
    ...teamsQuery,
    currentTeamId,
    currentTeam,
    hasWebhook,
  };
}
