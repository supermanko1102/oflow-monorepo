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
