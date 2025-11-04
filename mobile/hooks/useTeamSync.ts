/**
 * Team Sync Hook
 *
 * 職責：自動同步團隊狀態
 * - 當本地沒有 currentTeamId 但後端有團隊時，自動設定
 * - 優先選擇未完成 LINE 設定的團隊（引導用戶完成設定流程）
 * - 不處理路由邏輯（單一職責）
 *
 * 設計原則：
 * - 分離關注點：只負責狀態同步，不管路由
 * - 聲明式：基於當前狀態自動推導應該設定的團隊
 * - 冪等性：多次執行結果一致
 */

import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect } from "react";

interface Team {
  team_id: string;
  team_name: string;
  line_channel_id: string | null;
}

interface UseTeamSyncOptions {
  teams: Team[] | undefined;
  isLoggedIn: boolean;
  enabled?: boolean; // 是否啟用此 hook（預設 true）
}

/**
 * 團隊同步 Hook
 *
 * @param options - 配置選項
 * @param options.teams - 從後端取得的團隊列表
 * @param options.isLoggedIn - 使用者是否已登入
 *
 * 使用範例：
 * ```tsx
 * const { data: teams } = useTeams({ enabled: isLoggedIn });
 * useTeamSync({ teams, isLoggedIn });
 * ```
 */
export function useTeamSync({
  teams,
  isLoggedIn,
  enabled = true,
}: UseTeamSyncOptions) {
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);

  useEffect(() => {
    // 守衛：未啟用時不執行
    if (!enabled) {
      console.log("[TeamSync] 未啟用，跳過同步邏輯");
      return;
    }

    // 前置條件檢查
    if (!isLoggedIn || !teams || teams.length === 0) {
      console.log("[TeamSync] 跳過同步:", {
        isLoggedIn,
        hasTeams: !!teams,
        teamsCount: teams?.length,
      });
      return;
    }

    // 如果本地已有 currentTeamId，不需要自動設定
    if (currentTeamId) {
      console.log("[TeamSync] 已有 currentTeamId，跳過自動設定:", {
        currentTeamId,
      });
      return;
    }

    // 情境 1: 只有一個團隊 → 自動設定
    if (teams.length === 1) {
      const team = teams[0];
      console.log("[TeamSync] 🔧 自動設定單一團隊:", {
        teamId: team.team_id,
        teamName: team.team_name,
        hasLine: !!team.line_channel_id,
      });
      setCurrentTeamId(team.team_id);
      return;
    }

    // 情境 2: 多個團隊 → 優先選擇未完成 LINE 設定的團隊
    const incompleteTeam = teams.find((t) => !t.line_channel_id);
    if (incompleteTeam) {
      console.log("[TeamSync] 🔧 多個團隊，選擇第一個未完成 LINE 設定的:", {
        teamId: incompleteTeam.team_id,
        teamName: incompleteTeam.team_name,
      });
      setCurrentTeamId(incompleteTeam.team_id);
    } else {
      console.log("[TeamSync] 所有團隊都已完成設定，等待用戶手動選擇");
      // 不自動設定，讓用戶在 settings 的 modal 中選擇團隊
    }
  }, [enabled, isLoggedIn, teams, currentTeamId, setCurrentTeamId]);
}
