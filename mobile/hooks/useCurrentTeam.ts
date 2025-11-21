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
  console.log("currentTeam", currentTeam);
  const hasWebhook = useMemo(
    () => currentTeam?.line_channel_id !== undefined,
    [currentTeam]
  );

  return {
    ...teamsQuery,
    currentTeamId,
    currentTeam,
    hasWebhook,
  };
}
