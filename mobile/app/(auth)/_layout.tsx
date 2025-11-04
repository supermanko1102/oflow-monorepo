import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/useAuthStore";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Auth Group Layout
 *
 * 職責：
 * 1. 定義所有 auth 相關頁面
 * 2. 守護 auth 路由：已完整認證時自動跳轉到主頁面
 * 3. 只允許未完整認證的用戶訪問此區域
 *
 * 架構模式：分散式守衛
 * - 參考 refer.md 的 AuthLayout 實作模式
 * - 使用 useFocusEffect + router.replace 進行路由守衛
 * - 使用 try-catch 模式控制渲染狀態
 */
export default function AuthLayout() {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // 取得團隊資料（只在已登入且 hydrated 時啟用）
  const { data: teams, isLoading } = useTeams({
    enabled: isLoggedIn && hasHydrated,
  });

  // 計算完整認證狀態
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);
  const isLineConfigured = currentTeam?.line_channel_id ? true : false;
  const isFullyAuthenticated =
    isLoggedIn && !!currentTeamId && isLineConfigured;

  // 守衛邏輯：已完整認證時跳轉到主頁面
  const checkAccessible = useCallback(() => {
    if (hasHydrated && isFullyAuthenticated) {
      console.log("[AuthLayout] 已完整認證，跳轉到主頁面");
      router.replace("/(main)/(tabs)");
    }
  }, [hasHydrated, isFullyAuthenticated, router]);

  useFocusEffect(checkAccessible);

  // 使用 try-catch 模式控制渲染
  try {
    if (!hasHydrated) throw new Error("Hydrating");
    if (isLoggedIn && isLoading) throw new Error("Loading teams");
    if (isFullyAuthenticated) throw new Error("Already authenticated");

    console.log("[AuthLayout] 允許訪問 auth 區域");
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="team-setup" />
        <Stack.Screen name="team-create" />
        <Stack.Screen name="team-join" />
        <Stack.Screen name="team-webhook" />
      </Stack>
    );
  } catch (e) {
    // 在準備期間顯示 loading
    if (e instanceof Error) {
      console.log(`[AuthLayout] 阻擋訪問：${e.message}`);
    }
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
}
