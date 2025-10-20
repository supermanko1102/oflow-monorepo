import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string;
  userPictureUrl: string | null;
  currentTeamId: string | null;
  _hasHydrated: boolean;
  login: (
    userId: string,
    userName: string,
    userPictureUrl?: string | null
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
      userName: "",
      userPictureUrl: null,
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
      logout: () =>
        set({
          isLoggedIn: false,
          userId: null,
          userName: "",
          userPictureUrl: null,
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
        userName: state.userName,
        userPictureUrl: state.userPictureUrl,
        currentTeamId: state.currentTeamId,
      }),
    }
  )
);
