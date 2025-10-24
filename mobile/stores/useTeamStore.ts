/**
 * Team Store (Client State Only)
 * 
 * 重構後職責：
 * - 只管理 currentTeamId (client-side selection state)
 * - 所有 server state (teams list, members) 由 React Query 管理
 * 
 * 遷移說明：
 * - teams, teamMembers → 使用 useTeams(), useTeamMembers() hooks
 * - createTeam, joinTeam → 使用 useCreateTeam(), useJoinTeam() mutations
 * - fetchUserTeams, fetchTeamMembers → 使用 React Query 自動管理
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface TeamState {
  // Client State: 當前選擇的團隊 ID
  currentTeamId: string | null;

  // Hydration flag
  _hasHydrated: boolean;

  // Actions
  setCurrentTeamId: (teamId: string | null) => void;
  clearCurrentTeam: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      // Initial state
      currentTeamId: null,
      _hasHydrated: false,

      // Actions
      setCurrentTeamId: (teamId: string | null) => {
        console.log("[Team Store] 設定當前團隊:", teamId);
        set({ currentTeamId: teamId });
      },

      clearCurrentTeam: () => {
        console.log("[Team Store] 清除當前團隊");
        set({ currentTeamId: null });
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "team-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // 只持久化當前團隊 ID
        currentTeamId: state.currentTeamId,
      }),
    }
  )
);
