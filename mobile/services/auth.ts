// services/authActions.ts
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { AuthStatus, useAuthStore } from "@/stores/auth";

/**
 * LINE 登入
 * @param lineUserId - LINE 用戶 ID
 * @param supabaseUserId - Supabase UUID
 * @param userName - 用戶名稱
 * @param userPictureUrl - 頭像 URL
 * @param accessToken - Access token
 */
export async function loginWithLine(
  lineUserId: string,
  supabaseUserId: string,
  userName: string,
  userPictureUrl: string | null,
  accessToken: string
) {
  // 1. 設定 Supabase session
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: "", // 從登入流程取得
  });

  // 2. 更新 store 狀態
  useAuthStore.setState({
    supabaseUserId,
    status: AuthStatus.NoTeam, // 先設為 NoTeam，後續會更新
  });
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

  // 2. 更新 store 狀態
  useAuthStore.setState({
    supabaseUserId,
    status: AuthStatus.NoTeam, // 先設為 NoTeam，後續會更新
  });
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

  // 3. 清除 React Query cache
  queryClient.clear();
}
