import {
  getTeamById,
  MOCK_CURRENT_USER_ID,
  mockTeamMembers,
  mockTeams,
} from "@/data/mockTeams";
import * as teamService from "@/services/teamService";
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
  fetchUserTeams: () => Promise<void>;
  setTeamsFromLogin: (teams: any[]) => void;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  setCurrentTeam: (teamId: string) => void;

  // 團隊操作
  createTeam: (
    name: string,
    lineOfficialAccountId: string | null
  ) => Promise<Team>;
  joinTeam: (inviteCode: string) => Promise<Team>;
  leaveTeam: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => void;

  // 成員管理
  updateMemberRole: (teamId: string, userId: string, newRole: TeamRole) => void;
  removeMember: (teamId: string, userId: string) => void;

  // 團隊資訊更新
  updateTeamInfo: (
    teamId: string,
    updates: Partial<Pick<Team, "name" | "lineOfficialAccountId">>
  ) => void;
  regenerateInviteCode: (teamId: string) => Promise<string>;

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
      fetchUserTeams: async () => {
        try {
          console.log("[Team Store] 從 API 載入團隊...");
          const apiTeams = await teamService.getUserTeams();

          // 轉換為 UserTeam 格式
          const teams: UserTeam[] = apiTeams.map((team: any) => ({
            id: team.team_id,
            name: team.team_name,
            lineOfficialAccountId: team.line_channel_name || null,
            createdAt: new Date().toISOString(),
            inviteCode: "", // 邀請碼需要額外查詢
            myRole: team.role || "member",
            memberCount: team.member_count || 1,
          }));

          set({ teams });
        } catch (error) {
          console.error("[Team Store] 載入團隊失敗:", error);
          throw error;
        }
      },

      // 從登入回應設定團隊資料
      setTeamsFromLogin: (apiTeams: any[]) => {
        console.log("[Team Store] 從登入回應設定團隊...");
        const teams: UserTeam[] = apiTeams.map((team: any) => ({
          id: team.team_id,
          name: team.team_name,
          lineOfficialAccountId: team.line_channel_name || null,
          createdAt: new Date().toISOString(),
          inviteCode: "",
          myRole: team.role || "member",
          memberCount: team.member_count || 1,
        }));

        set({ teams });
      },

      // 查詢團隊成員列表
      fetchTeamMembers: async (teamId: string) => {
        try {
          console.log("[Team Store] 從 API 載入團隊成員...");
          const apiMembers = await teamService.getTeamMembers(teamId);

          // 轉換為 TeamMember 格式
          const members: TeamMember[] = apiMembers.map((member: any) => ({
            id: member.member_id,
            userId: member.user_id,
            userName: member.user_name || "未命名",
            userPictureUrl: member.user_picture_url,
            teamId: teamId,
            role: member.role as TeamRole,
            joinedAt: member.joined_at,
          }));

          set({ teamMembers: members });
        } catch (error) {
          console.error("[Team Store] 載入團隊成員失敗:", error);
          throw error;
        }
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
      createTeam: async (
        name: string,
        lineOfficialAccountId: string | null
      ) => {
        try {
          console.log("[Team Store] 建立團隊:", name);
          const apiTeam = await teamService.createTeam({
            team_name: name,
            line_channel_id: lineOfficialAccountId,
          });

          // 轉換為 Team 格式
          const newTeam: Team = {
            id: apiTeam.id,
            name: apiTeam.name,
            lineOfficialAccountId: null,
            createdAt: new Date().toISOString(),
            inviteCode: apiTeam.invite_code,
          };

          // 重新載入團隊列表
          await get().fetchUserTeams();

          return newTeam;
        } catch (error) {
          console.error("[Team Store] 建立團隊失敗:", error);
          throw error;
        }
      },

      // 加入團隊
      joinTeam: async (inviteCode: string) => {
        try {
          console.log("[Team Store] 加入團隊:", inviteCode);
          const apiTeam = await teamService.joinTeam(inviteCode);

          // 轉換為 Team 格式
          const team: Team = {
            id: apiTeam.team_id,
            name: apiTeam.team_name,
            lineOfficialAccountId: apiTeam.line_channel_name || null,
            createdAt: new Date().toISOString(),
            inviteCode: "",
          };

          // 重新載入團隊列表
          await get().fetchUserTeams();

          return team;
        } catch (error) {
          console.error("[Team Store] 加入團隊失敗:", error);
          throw error;
        }
      },

      // 離開團隊
      leaveTeam: async (teamId: string) => {
        try {
          console.log("[Team Store] 離開團隊:", teamId);
          await teamService.leaveTeam(teamId);

          // 如果離開的是當前團隊，清除 currentTeam
          if (get().currentTeam?.id === teamId) {
            set({ currentTeam: null, teamMembers: [] });
          }

          // 重新載入團隊列表
          await get().fetchUserTeams();
        } catch (error) {
          console.error("[Team Store] 離開團隊失敗:", error);
          throw error;
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
      regenerateInviteCode: async (teamId: string) => {
        try {
          console.log("[Team Store] 取得邀請碼:", teamId);
          const inviteCode = await teamService.getInviteCode(teamId);

          // 更新 currentTeam 中的邀請碼
          if (get().currentTeam?.id === teamId) {
            set({
              currentTeam: { ...get().currentTeam!, inviteCode },
            });
          }

          return inviteCode;
        } catch (error) {
          console.error("[Team Store] 取得邀請碼失敗:", error);
          throw error;
        }
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
