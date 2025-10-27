/**
 * Auth Router Hook
 *
 * 職責：根據認證和團隊狀態決定應該導航到哪個路由
 * - 採用狀態機模式，清晰的狀態定義
 * - 聲明式路由映射表
 * - 單一職責：只負責路由決策，不處理業務邏輯
 *
 * 設計原則：
 * - 狀態驅動：先推導狀態，再映射到路由
 * - 可測試：狀態推導函數可獨立測試
 * - 可擴展：新增狀態只需修改映射表
 *
 * 路由狀態機：
 * ```
 * unauthenticated           → /(auth)/login
 * authenticated_no_team     → /(auth)/team-select
 * authenticated_incomplete  → /(auth)/team-webhook
 * authenticated_complete    → /(main)
 * ```
 */

import { Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

interface Team {
  team_id: string;
  team_name: string;
  line_channel_id: string | null;
}

interface UseAuthRouterOptions {
  isLoggedIn: boolean;
  currentTeamId: string | null;
  teams: Team[] | undefined;
}

/**
 * 路由狀態類型
 *
 * - unauthenticated: 未登入
 * - authenticated_no_team: 已登入但沒有團隊或沒有選擇團隊
 * - authenticated_incomplete: 已登入有團隊但未完成 LINE 設定
 * - authenticated_complete: 已登入有團隊且完成設定
 */
type AuthRouteState =
  | { type: "unauthenticated" }
  | { type: "authenticated_no_team" }
  | { type: "authenticated_incomplete"; teamId: string; teamName: string }
  | { type: "authenticated_complete"; teamId: string };

/**
 * 路由映射表
 * 每個狀態對應到具體的路由路徑
 */
const ROUTE_MAP = {
  unauthenticated: "/(auth)/login",
  authenticated_no_team: "/(auth)/team-select",
  authenticated_incomplete: "/(auth)/team-webhook",
  authenticated_complete: "/(main)",
} as const;

/**
 * 推導當前路由狀態
 *
 * 這是一個純函數，可以獨立測試
 *
 * @param isLoggedIn - 是否已登入
 * @param currentTeamId - 當前選擇的團隊 ID
 * @param teams - 團隊列表
 * @returns 當前的路由狀態
 */
export function deriveRouteState(
  isLoggedIn: boolean,
  currentTeamId: string | null,
  teams: Team[] | undefined
): AuthRouteState {
  // 狀態 1: 未登入
  if (!isLoggedIn) {
    return { type: "unauthenticated" };
  }

  // 狀態 2: 已登入但沒有選擇團隊
  if (!currentTeamId) {
    return { type: "authenticated_no_team" };
  }

  // 找到當前團隊
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);

  // 狀態 3: 選擇的團隊不存在（可能被刪除或無權限）
  if (!currentTeam) {
    return { type: "authenticated_no_team" };
  }

  // 狀態 4: 團隊存在但未完成 LINE 設定
  if (!currentTeam.line_channel_id) {
    return {
      type: "authenticated_incomplete",
      teamId: currentTeam.team_id,
      teamName: currentTeam.team_name,
    };
  }

  // 狀態 5: 完全設定完成
  return {
    type: "authenticated_complete",
    teamId: currentTeam.team_id,
  };
}

/**
 * Auth Router Hook
 *
 * 根據認證狀態自動導航到正確的頁面
 *
 * @param options - 配置選項
 * @param options.isLoggedIn - 是否已登入
 * @param options.currentTeamId - 當前選擇的團隊 ID
 * @param options.teams - 團隊列表
 *
 * 使用範例：
 * ```tsx
 * const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
 * const currentTeamId = useAuthStore((state) => state.currentTeamId);
 * const { data: teams } = useTeams({ enabled: isLoggedIn });
 *
 * useAuthRouter({ isLoggedIn, currentTeamId, teams });
 * ```
 */
export function useAuthRouter({
  isLoggedIn,
  currentTeamId,
  teams,
}: UseAuthRouterOptions) {
  const router = useRouter();
  const previousStateRef = useRef<string | null>(null);

  useEffect(() => {
    // 推導當前路由狀態
    const routeState = deriveRouteState(isLoggedIn, currentTeamId, teams);
    const targetRoute = ROUTE_MAP[routeState.type];

    // 防止重複導航到相同狀態
    if (previousStateRef.current === routeState.type) {
      return;
    }

    // 記錄狀態轉換
    console.log("[AuthRouter] 路由狀態轉換:", {
      from: previousStateRef.current,
      to: routeState.type,
      targetRoute,
      context: {
        isLoggedIn,
        currentTeamId,
        hasTeams: !!teams,
        teamsCount: teams?.length,
      },
    });

    // 特殊處理：authenticated_incomplete 狀態，額外記錄團隊資訊
    if (routeState.type === "authenticated_incomplete") {
      console.log("[AuthRouter] 團隊未完成 LINE 設定，導向 webhook 頁面:", {
        teamId: routeState.teamId,
        teamName: routeState.teamName,
      });
    }

    // 執行導航
    router.replace(targetRoute as Href);

    // 更新狀態追蹤
    previousStateRef.current = routeState.type;
  }, [isLoggedIn, currentTeamId, teams, router]);
}
