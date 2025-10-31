import { ToastContainer } from "@/components/Toast";
import { useTeams } from "@/hooks/queries/useTeams";
import { useTeamSync } from "@/hooks/useTeamSync";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    elevation: {
      // 所有陰影層級都用白色
      level0: "#F9FAFB",
      level1: "#F9FAFB",
      level2: "#F9FAFB",
      level3: "#F9FAFB",
      level4: "#F9FAFB",
      level5: "#F9FAFB",
    },
  },
};

// 防止 splash screen 自動隱藏，由 RootNavigator 控制
SplashScreen.preventAutoHideAsync();

/**
 * 內部組件：處理團隊狀態同步和路由守衛
 * 必須在 QueryClientProvider 內部才能使用 React Query
 *
 * 架構重構：採用 Declarative Routing + Custom Hooks 模式
 * - useTeamSync: 處理團隊狀態自動同步
 * - useAuthRouter: 處理路由決策（狀態機模式）
 * - 分離關注點，單一職責，易於測試
 */
function RootNavigator() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // 使用 React Query 取得團隊列表（只在已登入且 hydrated 時才啟用）
  const { data: teams, isLoading: isTeamsLoading } = useTeams({
    enabled: isLoggedIn && hasHydrated,
  });

  // Hook 1: 自動同步團隊狀態（只在 hydrated 後執行）
  useTeamSync({ teams, isLoggedIn, enabled: hasHydrated });
  const isRouteReady = hasHydrated && (!isLoggedIn || !isTeamsLoading);

  // 管理 SplashScreen：hydration 完成後隱藏
  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [hasHydrated]);

  // ✅ 在路由狀態未確定前，渲染空 Stack（SplashScreen 繼續顯示）
  if (!isRouteReady) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  // 檢查當前團隊是否已完成 LINE 設定
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);
  const isLineConfigured = currentTeam?.line_channel_id ? true : false;

  // 使用 Stack.Protected 進行路由保護
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn && <Redirect href="/(auth)/login" />}
      {isLoggedIn && !currentTeamId && <Redirect href="/(auth)/team-select" />}
      {isLoggedIn && currentTeamId && !isLineConfigured && (
        <Redirect href="/(auth)/team-webhook" />
      )}
      {/* Protected: 已登入且有團隊且已完成 LINE 設定時才能訪問 */}
      <Stack.Protected
        guard={isLoggedIn && !!currentTeamId && isLineConfigured}
      >
        <Stack.Screen name="(main)" />
      </Stack.Protected>

      {/* Protected: 未登入或無團隊或未完成 LINE 設定時才能訪問 auth 相關頁面 */}
      <Stack.Protected
        guard={!isLoggedIn || !currentTeamId || !isLineConfigured}
      >
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Root Layout
 *
 * 職責：
 * 1. 提供全局 providers (Theme, Paper, React Query)
 * 2. 渲染 navigator 結構
 *
 * 架構模式：集中式認證守衛 + 團隊狀態同步
 * - 永遠渲染 Stack，確保 Expo Router 可以正常運作
 * - RootNavigator 處理 hydration、團隊同步和路由邏輯
 * - Team-Centric：已登入但無當前團隊時，導向團隊設置頁
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider theme={paperLightTheme}>
          <ThemeProvider value={DefaultTheme}>
            <RootNavigator />
            <StatusBar style="auto" />
            <ToastContainer />
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
