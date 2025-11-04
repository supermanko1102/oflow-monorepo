import { useTeams } from "@/hooks/queries/useTeams";
import { useTeamSync } from "@/hooks/useTeamSync";
import { useAuthStore } from "@/stores/useAuthStore";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Main Group Layout
 *
 * 職責：
 * 1. 定義所有主應用頁面
 * 2. 守護 main 路由：未完整認證時自動跳轉到對應的 auth 頁面
 * 3. 執行團隊狀態同步
 * 4. 只允許完整認證的用戶訪問此區域
 *
 * 架構模式：分散式守衛
 * - 參考 refer.md 的 MainLayout 實作模式
 * - 使用 useFocusEffect + router.replace 進行路由守衛
 * - 使用 try-catch 模式控制渲染狀態
 * - 整合 useTeamSync 處理團隊狀態自動同步
 */
export default function MainLayout() {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // 取得團隊資料（只在已登入且 hydrated 時啟用）
  const { data: teams, isLoading } = useTeams({
    enabled: isLoggedIn && hasHydrated,
  });

  // 團隊狀態同步（只在 hydrated 後執行）
  useTeamSync({ teams, isLoggedIn, enabled: hasHydrated });

  // 計算完整認證狀態
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);
  const isLineConfigured = currentTeam?.line_channel_id ? true : false;
  const isFullyAuthenticated =
    isLoggedIn && !!currentTeamId && isLineConfigured;

  // 守衛邏輯：根據認證狀態跳轉到對應的 auth 頁面
  const checkAccessible = useCallback(() => {
    if (!hasHydrated) return;

    if (!isLoggedIn) {
      console.log("[MainLayout] 未登入，跳轉到登入頁");
      router.replace("/(auth)/login");
    } else if (isLoading) {
      // 等待團隊資料加載
      return;
    } else if (!currentTeamId || !currentTeam) {
      // 沒有 currentTeamId，或 currentTeamId 對應的團隊不存在（已被刪除）
      console.log("[MainLayout] 無團隊或團隊不存在，跳轉到團隊選擇頁");
      router.replace("/(auth)/team-setup");
    } else if (!isLineConfigured) {
      console.log("[MainLayout] 未設定 LINE，跳轉到 webhook 設定頁");
      router.replace("/(auth)/team-webhook");
    }
  }, [
    hasHydrated,
    isLoggedIn,
    isLoading,
    currentTeamId,
    currentTeam,
    isLineConfigured,
    router,
  ]);

  useFocusEffect(checkAccessible);

  // 使用 try-catch 模式控制渲染
  try {
    if (!hasHydrated) throw new Error("Hydrating");
    if (isLoggedIn && isLoading) throw new Error("Loading teams");
    if (!isFullyAuthenticated) throw new Error("Not authenticated");

    console.log("[MainLayout] 允許訪問主應用", {
      hasTeams: !!teams,
      teamsLength: teams?.length,
      currentTeamId,
      currentTeam: currentTeam?.team_name,
      isLineConfigured,
    });
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="order"
          options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: "#FFFFFF",
            },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    );
  } catch (e) {
    // 在準備期間顯示 loading
    if (e instanceof Error) {
      console.log(`[MainLayout] 阻擋訪問：${e.message}`, {
        hasHydrated,
        isLoggedIn,
        isLoading,
        hasTeams: !!teams,
        teamsLength: teams?.length,
        currentTeamId,
        isLineConfigured,
        isFullyAuthenticated,
      });
    }
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
}
