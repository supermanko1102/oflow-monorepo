// services/authActions.ts
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { getUserTeams } from "@/services/teamService";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import type { Team } from "@/types/team";

export async function syncAuthStatus(): Promise<void> {
  try {
    const teams: Team[] = await getUserTeams();
    console.log("syncAuthStatus teams", teams);
    if (teams.length === 0) {
      useAuthStore.setState({
        status: AuthStatus.NoTeam,
        currentTeamId: null,
      });
    } else {
      const primaryTeam = teams[0];

      const hasWebhook = !!primaryTeam.line_channel_id;

      useAuthStore.setState({
        status: hasWebhook ? AuthStatus.Active : AuthStatus.NoWebhook,
        currentTeamId: primaryTeam.team_id,
      });
    }
  } catch (error) {
    console.error("[syncAuthStatus] 同步狀態失敗:", error);
    // 發生錯誤時，預設為 NoTeam 狀態
    useAuthStore.setState({
      status: AuthStatus.NoTeam,
      currentTeamId: null,
    });
  }
}

export async function loginWithLine(accessToken: string, refreshToken: string) {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  await syncAuthStatus();
}

export async function loginWithApple(
  accessToken: string,
  refreshToken: string
) {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  await syncAuthStatus();
}

// export async function loginWithGoogle(
//   accessToken: string,
//   refreshToken: string
// ) {
//   await supabase.auth.setSession({
//     access_token: accessToken,
//     refresh_token: refreshToken,
//   });
//   await syncAuthStatus();
// }

export async function logout() {
  useAuthStore.setState({
    status: AuthStatus.Unauthenticated,
    currentTeamId: null,
  });

  await supabase.auth.signOut();

  queryClient.clear();
}
