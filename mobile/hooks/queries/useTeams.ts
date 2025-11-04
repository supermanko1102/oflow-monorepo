/**
 * Teams Query Hooks
 *
 * 使用 React Query 管理所有團隊相關的 server state
 * 包含：
 * - useTeams: 查詢使用者的團隊列表
 * - useTeamMembers: 查詢團隊成員
 * - useInviteCode: 查詢/產生邀請碼
 * - useCreateTeam: 建立團隊
 * - useJoinTeam: 加入團隊
 * - useLeaveTeam: 離開團隊
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as teamService from "@/services/teamService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ==================== Queries ====================

/**
 * 查詢使用者的所有團隊
 *
 * @param options - 查詢選項
 * @param options.enabled - 是否啟用查詢（預設為 true）
 *
 * 使用時機：
 * - 團隊選擇頁
 * - 團隊切換器
 * - 登入後初始載入
 *
 * Cache 策略：
 * - staleTime: 5 分鐘（較長，團隊列表不常變動）
 * - 登入後會自動 prefetch
 */
export function useTeams(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.teams.list(),
    queryFn: teamService.getUserTeams,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
}

/**
 * 查詢團隊成員列表
 *
 * @param teamId - 團隊 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * 使用時機：
 * - 團隊設定頁
 * - 成員管理頁
 *
 * Cache 策略：
 * - staleTime: 2 分鐘（成員可能會變動）
 */
export function useTeamMembers(teamId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.teams.members(teamId),
    queryFn: () => teamService.getTeamMembers(teamId),
    enabled: enabled && !!teamId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  });
}

/**
 * 查詢團隊邀請碼
 *
 * @param teamId - 團隊 ID
 * @param enabled - 是否啟用查詢（預設為 false，需手動觸發）
 *
 * 使用時機：
 * - 點擊「邀請成員」按鈕時
 *
 * Cache 策略：
 * - staleTime: 10 分鐘（邀請碼不常變動）
 * - enabled 預設 false，避免不必要的請求
 */
export function useInviteCode(teamId: string, enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.teams.inviteCode(teamId),
    queryFn: () => teamService.getInviteCode(teamId),
    enabled: enabled && !!teamId,
    staleTime: 10 * 60 * 1000, // 10 分鐘
  });
}

// ==================== Mutations ====================

/**
 * 建立新團隊
 *
 * 成功後：
 * - 自動 invalidate teams list
 * - 返回新團隊資訊（包含 invite_code）
 *
 * 使用範例：
 * ```tsx
 * const createTeam = useCreateTeam();
 *
 * const handleCreate = async () => {
 *   try {
 *     const newTeam = await createTeam.mutateAsync({
 *       team_name: "我的團隊",
 *       business_type: "restaurant",
 *     });
 *     console.log("新團隊 ID:", newTeam.id);
 *   } catch (error) {
 *     console.error("建立失敗:", error);
 *   }
 * };
 * ```
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamService.createTeam,
    onSuccess: () => {
      // 建立成功後，重新載入團隊列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(),
      });
    },
  });
}

/**
 * 加入團隊（使用邀請碼）
 *
 * 成功後：
 * - 自動 invalidate teams list
 * - 返回加入的團隊資訊
 *
 * 使用範例：
 * ```tsx
 * const joinTeam = useJoinTeam();
 *
 * const handleJoin = async (inviteCode: string) => {
 *   try {
 *     const team = await joinTeam.mutateAsync(inviteCode);
 *     console.log("加入團隊:", team.name);
 *   } catch (error) {
 *     console.error("加入失敗:", error);
 *   }
 * };
 * ```
 */
export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamService.joinTeam,
    onSuccess: () => {
      // 加入成功後，重新載入團隊列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(),
      });
    },
  });
}

/**
 * 離開團隊
 *
 * 成功後：
 * - 自動 invalidate teams list
 * - 移除該團隊的所有相關 cache
 *
 * 使用範例：
 * ```tsx
 * const leaveTeam = useLeaveTeam();
 *
 * const handleLeave = async (teamId: string) => {
 *   try {
 *     await leaveTeam.mutateAsync(teamId);
 *     console.log("已離開團隊");
 *   } catch (error) {
 *     console.error("離開失敗:", error);
 *   }
 * };
 * ```
 */
export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamService.leaveTeam,
    onSuccess: (_, teamId) => {
      // 離開成功後，重新載入團隊列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(),
      });

      // 移除該團隊的所有相關 cache
      queryClient.removeQueries({
        queryKey: queryKeys.teams.members(teamId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.teams.inviteCode(teamId),
      });
    },
  });
}

/**
 * 刪除團隊（永久刪除）
 *
 * ⚠️ 注意：此操作無法復原！
 *
 * 成功後：
 * - 自動 invalidate teams list
 * - 移除該團隊的所有相關 cache
 *
 * 使用範例：
 * ```tsx
 * const deleteTeam = useDeleteTeam();
 *
 * const handleDelete = async (teamId: string) => {
 *   try {
 *     await deleteTeam.mutateAsync(teamId);
 *     console.log("團隊已永久刪除");
 *   } catch (error) {
 *     console.error("刪除失敗:", error);
 *   }
 * };
 * ```
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamService.deleteTeam,
    onSuccess: async (_, teamId) => {
      // 如果刪除的是當前團隊，清除 currentTeamId
      const { useAuthStore } = await import("@/stores/useAuthStore");
      const currentTeamId = useAuthStore.getState().currentTeamId;
      if (currentTeamId === teamId) {
        console.log(
          "[useDeleteTeam] 刪除的是當前團隊，清除 currentTeamId:",
          teamId
        );
        useAuthStore.getState().setCurrentTeamId(null);
      }

      // 刪除成功後，重新載入團隊列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(),
      });

      // 移除該團隊的所有相關 cache
      queryClient.removeQueries({
        queryKey: queryKeys.teams.members(teamId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.teams.inviteCode(teamId),
      });
    },
  });
}

// ==================== Helper Functions ====================

/**
 * Prefetch teams list
 *
 * 使用時機：
 * - 登入成功後
 * - 預期使用者即將需要團隊列表時
 *
 * 範例：
 * ```tsx
 * import { prefetchTeams } from '@/hooks/queries/useTeams';
 *
 * // 在登入成功後
 * await prefetchTeams(queryClient);
 * ```
 */
export async function prefetchTeams(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.teams.list(),
    queryFn: teamService.getUserTeams,
    staleTime: 5 * 60 * 1000,
  });
}
