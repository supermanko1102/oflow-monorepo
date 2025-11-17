import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export enum AuthStatus {
  Unauthenticated = "unauthenticated",
  NoTeam = "noTeam",
  NoWebhook = "noWebhook",
  Active = "active",
}

interface AuthState {
  isHydrated: boolean;
  status: AuthStatus;
  currentTeamId: string | null;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (_set, _get) => ({
      isHydrated: false,
      status: AuthStatus.Unauthenticated,
      currentTeamId: null,
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
