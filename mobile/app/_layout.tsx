import { QueryDevTools } from "@/components/QueryDevTools";
import { ToastContainer } from "@/components/Toast";
import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthRouter } from "@/hooks/useAuthRouter";
import { useTeamSync } from "@/hooks/useTeamSync";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// 防止 splash screen 自動隱藏
SplashScreen.preventAutoHideAsync();

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
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // 使用 React Query 取得團隊列表（只在已登入時才啟用）
  const { data: teams } = useTeams({ enabled: isLoggedIn });

  // Hook 1: 自動同步團隊狀態（當本地無團隊時自動設定）
  useTeamSync({ teams, isLoggedIn });

  // Hook 2: 根據認證狀態自動導航
  useAuthRouter({ isLoggedIn, currentTeamId, teams });

  // 檢查當前團隊是否已完成 LINE 設定
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);
  const isLineConfigured = currentTeam?.line_channel_id ? true : false;

  console.log("[Root] 路由守衛狀態:", {
    isLoggedIn,
    currentTeamId,
    isLineConfigured,
  });

  // 使用 Stack.Protected 進行路由保護
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
 * 2. 等待 auth 狀態 hydration
 * 3. 管理 splash screen
 *
 * 架構模式：集中式認證守衛 + 團隊狀態同步
 * - 在 hydration 完成前返回 null，避免子組件提前渲染
 * - RootNavigator 處理團隊同步和路由邏輯
 * - Team-Centric：已登入但無當前團隊時，導向團隊設置頁
 */
export default function RootLayout() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Hydration 完成後隱藏 splash screen
  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [hasHydrated]);

  // 等待 hydration 完成前不渲染任何內容
  // 這確保了子 layout 不會在 auth 狀態確定前被掛載
  if (!hasHydrated) {
    return null;
  }

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
      <QueryDevTools />
    </QueryClientProvider>
  );
}
