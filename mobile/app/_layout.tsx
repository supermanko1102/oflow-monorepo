import { QueryDevTools } from "@/components/QueryDevTools";
import { ToastContainer } from "@/components/Toast";
import { useTeams } from "@/hooks/queries/useTeams";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
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
 * 內部組件：處理團隊狀態同步和路由
 * 必須在 QueryClientProvider 內部才能使用 React Query
 */
function RootNavigator() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // 使用 React Query 取得團隊列表（自動 cache、refetch）
  const { data: teams } = useTeams();

  // 團隊狀態同步邏輯
  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || !teams) return;
    
    // 情境 1: 本地沒有但後端有單一團隊 → 自動設定
    if (!currentTeamId && teams.length === 1) {
      console.log('[Root] 自動設定團隊:', teams[0].team_name);
      setCurrentTeamId(teams[0].team_id);
    }
    
    // 情境 2: 本地有但後端沒有 → 清除無效的 teamId
    if (currentTeamId && !teams.find(t => t.team_id === currentTeamId)) {
      console.log('[Root] 團隊無效，清除');
      setCurrentTeamId(null);
    }
  }, [hasHydrated, isLoggedIn, teams, currentTeamId, setCurrentTeamId]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn || !currentTeamId ? (
        // 未登入或無當前團隊：渲染 auth group
        // （包含登入、團隊設置、團隊選擇等頁面）
        <Stack.Screen name="(auth)" />
      ) : (
        // 已登入且有當前團隊：渲染 main group
        <Stack.Screen name="(main)" />
      )}
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
