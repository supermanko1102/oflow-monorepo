import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null; // LINE User ID (向後相容)
  lineUserId: string | null; // LINE User ID (明確命名)
  supabaseUserId: string | null; // Supabase UUID
  userName: string;
  userPictureUrl: string | null;
  accessToken: string | null; // LINE Access Token
  currentTeamId: string | null;
  _hasHydrated: boolean;
  login: (
    userId: string,
    userName: string,
    userPictureUrl?: string | null
  ) => void;
  loginWithLine: (
    lineUserId: string,
    supabaseUserId: string,
    userName: string,
    userPictureUrl: string | null,
    accessToken: string
  ) => void;
  logout: () => void;
  setCurrentTeamId: (teamId: string | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userId: null,
      lineUserId: null,
      supabaseUserId: null,
      userName: "",
      userPictureUrl: null,
      accessToken: null,
      currentTeamId: null,
      _hasHydrated: false,
      login: (
        userId: string,
        userName: string,
        userPictureUrl: string | null = null
      ) =>
        set({
          isLoggedIn: true,
          userId,
          userName,
          userPictureUrl,
        }),
      loginWithLine: (
        lineUserId: string,
        supabaseUserId: string,
        userName: string,
        userPictureUrl: string | null,
        accessToken: string
      ) =>
        set({
          isLoggedIn: true,
          userId: lineUserId, // 向後相容
          lineUserId,
          supabaseUserId,
          userName,
          userPictureUrl,
          accessToken,
        }),
      logout: () =>
        set({
          isLoggedIn: false,
          userId: null,
          lineUserId: null,
          supabaseUserId: null,
          userName: "",
          userPictureUrl: null,
          accessToken: null,
          currentTeamId: null,
        }),
      setCurrentTeamId: (teamId: string | null) =>
        set({ currentTeamId: teamId }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state) => {
        console.log("[AuthStore] === Hydration 開始 ===");
        console.log("[AuthStore] 恢復的狀態:", {
          isLoggedIn: state?.isLoggedIn,
          currentTeamId: state?.currentTeamId,
          userName: state?.userName,
        });

        // 檢查 Supabase session 是否有效
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("[AuthStore] Supabase session:", session ? "有效" : "無效");
        console.log("[AuthStore] Session 詳情:", {
          hasSession: !!session,
          userId: session?.user?.id,
          expiresAt: session?.expires_at,
        });

        if (state?.isLoggedIn && !session) {
          // AuthStore 認為已登入，但 Supabase session 無效 → 清除登入狀態
          console.log("[AuthStore] ❌ 不匹配：AuthStore 已登入但 session 無效");
          state.logout();
        } else if (session) {
          console.log("[AuthStore] ✅ Session 有效，保持登入");
        }

        // 標記為已 hydrated
        const setHasHydrated =
          state?.setHasHydrated || useAuthStore.getState().setHasHydrated;
        setHasHydrated(true);
        console.log("[AuthStore] === Hydration 完成 ===");
      },
      // 只持久化必要的欄位，不持久化 _hasHydrated
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        lineUserId: state.lineUserId,
        supabaseUserId: state.supabaseUserId,
        userName: state.userName,
        userPictureUrl: state.userPictureUrl,
        accessToken: state.accessToken,
        currentTeamId: state.currentTeamId,
      }),
    }
  )
);

// 監聽 Supabase auth 狀態變化，處理 session 過期
let hasInitialized = false;

supabase.auth.onAuthStateChange((event, session) => {
  console.log("[AuthStore] onAuthStateChange 觸發:", {
    event,
    hasSession: !!session,
    hasInitialized,
    storeIsLoggedIn: useAuthStore.getState().isLoggedIn,
    storeHasHydrated: useAuthStore.getState()._hasHydrated,
  });

  // 初始化階段不處理（避免誤觸發）
  if (!hasInitialized) {
    console.log("[AuthStore] 初始化階段，跳過處理");
    hasInitialized = true;
    return;
  }

  // 只有在已經 hydrated 後才處理 session 過期
  const state = useAuthStore.getState();
  if (!session && state.isLoggedIn && state._hasHydrated) {
    console.log("[AuthStore] ⚠️ Session 過期，自動登出");
    useAuthStore.getState().logout();
  }
});
