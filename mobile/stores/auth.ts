import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export enum AuthStatus {
  Unauthenticated = "unauthenticated",
  NoTeam = "noTeam",
  Active = "active",
}

interface AuthState {
  isHydrated: boolean;
  status: AuthStatus;
  currentTeamId: string | null;
  setCurrentTeamId: (teamId: string | null) => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      isHydrated: false,
      status: AuthStatus.Unauthenticated,
      currentTeamId: null,
      setCurrentTeamId: (teamId) =>
        set({
          currentTeamId: teamId,
        }),
    }),
    {
      version: 1,
      name: "auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
