// services/authActions.ts
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { getUserTeams } from "@/services/teamService";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import type { Team } from "@/types/team";

/**
 * 同步認證狀態
 * 根據用戶的團隊資料決定正確的 AuthStatus
 *
 * 邏輯：
 * - 無團隊 → NoTeam
 * - 有團隊但無 LINE webhook → NoWebhook
 * - 有團隊且有 LINE webhook → Active
 */
export async function syncAuthStatus(): Promise<void> {
  try {
    // 1. 查詢用戶團隊列表
    const teams: Team[] = await getUserTeams();
    console.log("syncAuthStatus teams", teams);
    // 2. 根據團隊狀態決定 AuthStatus
    if (teams.length === 0) {
      // 沒有團隊，導向團隊建立/加入流程
      useAuthStore.setState({
        status: AuthStatus.NoTeam,
        currentTeamId: null,
      });
    } else {
      // 使用第一個團隊作為當前團隊（可以之後實作團隊切換）
      const primaryTeam = teams[0];

      // 檢查是否已設定 LINE 官方帳號
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

/**
 * LINE 登入
 * @param lineUserId - LINE 用戶 ID
 * @param supabaseUserId - Supabase UUID
 * @param userName - 用戶名稱
 * @param userPictureUrl - 頭像 URL
 * @param accessToken - Access token
 * @param refreshToken - Refresh token
 */
export async function loginWithLine(
  lineUserId: string,
  supabaseUserId: string,
  userName: string,
  userPictureUrl: string | null,
  accessToken: string,
  refreshToken: string
) {
  // 1. 設定 Supabase session
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // 2. 更新 store 基本資訊
  useAuthStore.setState({ supabaseUserId });

  // 3. 同步狀態（根據團隊決定 AuthStatus）
  await syncAuthStatus();
}

/**
 * Apple 登入
 * 使用 Apple Sign In 取得的 session 來設定認證狀態
 *
 * @param supabaseUserId - Supabase 用戶 UUID
 * @param accessToken - Supabase Access token
 * @param refreshToken - Supabase Refresh token
 */
export async function loginWithApple(
  supabaseUserId: string,
  accessToken: string,
  refreshToken: string
) {
  // 1. 設定 Supabase session
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // 2. 更新 store 基本資訊
  useAuthStore.setState({ supabaseUserId });

  // 3. 同步狀態（根據團隊決定 AuthStatus）
  await syncAuthStatus();
}

/**
 * 登出
 */
export async function logout() {
  // 1. 清除 store
  useAuthStore.setState({
    status: AuthStatus.Unauthenticated,
    supabaseUserId: null,
    currentTeamId: null,
  });

  // 2. 清除 Supabase session
  await supabase.auth.signOut();

  queryClient.clear();
}
