import {
  generateInviteCode,
  getTeamById,
  getTeamByInviteCode,
  getTeamMembers,
  getUserTeams,
  MOCK_CURRENT_USER_ID,
  mockTeamMembers,
  mockTeams,
} from "@/data/mockTeams";
import { Team, TeamMember, TeamRole, UserTeam } from "@/types/team";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface TeamState {
  teams: UserTeam[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  _hasHydrated: boolean;

  // 查詢方法
  fetchUserTeams: (userId: string) => void;
  fetchTeamMembers: (teamId: string) => void;
  setCurrentTeam: (teamId: string) => void;

  // 團隊操作
  createTeam: (
    name: string,
    lineOfficialAccountId: string | null,
    userId: string,
    userName: string
  ) => Team;
  joinTeam: (
    inviteCode: string,
    userId: string,
    userName: string
  ) => Team | null;
  leaveTeam: (teamId: string, userId: string) => void;
  deleteTeam: (teamId: string) => void;

  // 成員管理
  updateMemberRole: (teamId: string, userId: string, newRole: TeamRole) => void;
  removeMember: (teamId: string, userId: string) => void;

  // 團隊資訊更新
  updateTeamInfo: (
    teamId: string,
    updates: Partial<Pick<Team, "name" | "lineOfficialAccountId">>
  ) => void;
  regenerateInviteCode: (teamId: string) => string;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],
      currentTeam: null,
      teamMembers: [],
      _hasHydrated: false,

      // 查詢用戶所屬的所有團隊
      fetchUserTeams: (userId: string) => {
        const teams = getUserTeams(userId);
        set({ teams });
      },

      // 查詢團隊成員列表
      fetchTeamMembers: (teamId: string) => {
        const members = getTeamMembers(teamId);
        set({ teamMembers: members });
      },

      // 設定當前團隊
      setCurrentTeam: (teamId: string) => {
        const team = getTeamById(teamId);
        if (team) {
          set({ currentTeam: team });
          get().fetchTeamMembers(teamId);
        }
      },

      // 建立新團隊
      createTeam: (
        name: string,
        lineOfficialAccountId: string | null,
        userId: string,
        userName: string
      ) => {
        const newTeam: Team = {
          id: `team_${Date.now()}`,
          name,
          lineOfficialAccountId,
          createdAt: new Date().toISOString(),
          inviteCode: generateInviteCode(),
        };

        const newMember: TeamMember = {
          id: `member_${Date.now()}`,
          userId,
          userName,
          userPictureUrl: null,
          teamId: newTeam.id,
          role: "owner",
          joinedAt: new Date().toISOString(),
        };

        // 模擬資料更新（實際會調用 API）
        mockTeams.push(newTeam);
        mockTeamMembers.push(newMember);

        // 更新 store
        get().fetchUserTeams(userId);

        return newTeam;
      },

      // 加入團隊
      joinTeam: (inviteCode: string, userId: string, userName: string) => {
        const team = getTeamByInviteCode(inviteCode);
        if (!team) {
          return null;
        }

        // 檢查是否已是成員
        const existingMember = mockTeamMembers.find(
          (m) => m.teamId === team.id && m.userId === userId
        );
        if (existingMember) {
          return team;
        }

        const newMember: TeamMember = {
          id: `member_${Date.now()}`,
          userId,
          userName,
          userPictureUrl: null,
          teamId: team.id,
          role: "member",
          joinedAt: new Date().toISOString(),
        };

        mockTeamMembers.push(newMember);
        get().fetchUserTeams(userId);

        return team;
      },

      // 離開團隊
      leaveTeam: (teamId: string, userId: string) => {
        const memberIndex = mockTeamMembers.findIndex(
          (m) => m.teamId === teamId && m.userId === userId
        );

        if (memberIndex !== -1) {
          mockTeamMembers.splice(memberIndex, 1);
          get().fetchUserTeams(userId);

          // 如果離開的是當前團隊，清除 currentTeam
          if (get().currentTeam?.id === teamId) {
            set({ currentTeam: null, teamMembers: [] });
          }
        }
      },

      // 刪除團隊（僅 owner）
      deleteTeam: (teamId: string) => {
        const teamIndex = mockTeams.findIndex((t) => t.id === teamId);
        if (teamIndex !== -1) {
          mockTeams.splice(teamIndex, 1);

          // 刪除所有團隊成員
          const membersToRemove = mockTeamMembers.filter(
            (m) => m.teamId === teamId
          );
          membersToRemove.forEach((member) => {
            const idx = mockTeamMembers.indexOf(member);
            if (idx !== -1) mockTeamMembers.splice(idx, 1);
          });

          // 更新 store
          get().fetchUserTeams(MOCK_CURRENT_USER_ID);
          if (get().currentTeam?.id === teamId) {
            set({ currentTeam: null, teamMembers: [] });
          }
        }
      },

      // 更新成員角色
      updateMemberRole: (teamId: string, userId: string, newRole: TeamRole) => {
        const member = mockTeamMembers.find(
          (m) => m.teamId === teamId && m.userId === userId
        );

        if (member) {
          member.role = newRole;
          get().fetchTeamMembers(teamId);
          get().fetchUserTeams(MOCK_CURRENT_USER_ID);
        }
      },

      // 移除成員
      removeMember: (teamId: string, userId: string) => {
        const memberIndex = mockTeamMembers.findIndex(
          (m) => m.teamId === teamId && m.userId === userId
        );

        if (memberIndex !== -1) {
          mockTeamMembers.splice(memberIndex, 1);
          get().fetchTeamMembers(teamId);
        }
      },

      // 更新團隊資訊
      updateTeamInfo: (
        teamId: string,
        updates: Partial<Pick<Team, "name" | "lineOfficialAccountId">>
      ) => {
        const team = mockTeams.find((t) => t.id === teamId);
        if (team) {
          Object.assign(team, updates);

          // 更新 currentTeam
          if (get().currentTeam?.id === teamId) {
            set({ currentTeam: { ...team } });
          }

          get().fetchUserTeams(MOCK_CURRENT_USER_ID);
        }
      },

      // 重新生成邀請碼
      regenerateInviteCode: (teamId: string) => {
        const team = mockTeams.find((t) => t.id === teamId);
        if (team) {
          const newCode = generateInviteCode();
          team.inviteCode = newCode;

          if (get().currentTeam?.id === teamId) {
            set({ currentTeam: { ...team } });
          }

          return newCode;
        }
        return "";
      },

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: "team-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // 只持久化當前團隊 ID，其他資料重新載入
        currentTeam: state.currentTeam,
      }),
    }
  )
);
