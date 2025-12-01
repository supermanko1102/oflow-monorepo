import { supabase } from "@/lib/supabase";
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
  checkSessionExpiration: () => Promise<void>;
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
      checkSessionExpiration: async () => {
        try {
          set({ isHydrated: false });
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            await supabase.auth.signOut().catch(() => {});
            set({ status: AuthStatus.Unauthenticated, currentTeamId: null });
          }
        } catch (err) {
          console.error("[auth] getSession failed", err);
          set({ status: AuthStatus.Unauthenticated, currentTeamId: null });
        } finally {
          set({ isHydrated: true });
        }
      },
    }),
    {
      version: 1,
      name: "auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.checkSessionExpiration();
        }
      },
    }
  )
);
