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
      onRehydrateStorage: () => (state) => {
        // 當從 AsyncStorage 讀取完成後，標記為已 hydrated
        state?.setHasHydrated(true);
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
