import { ToastContainer } from "@/components/Toast";
import { useTeams } from "@/hooks/queries/useTeams";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
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
 * 內部組件：提供基本的 Stack 結構
 * 路由守衛邏輯由各個 Layout 自行處理（分散式守衛架構）
 *
 * 此組件負責：
 * - 等待 hydration 和團隊資料加載完成後才隱藏 SplashScreen
 * - 提供基本的 Stack 結構
 */
function RootNavigator() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  // 取得團隊列表（只在已登入且 hydrated 時啟用）
  const { isLoading: isTeamsLoading } = useTeams({
    enabled: isLoggedIn && hasHydrated,
  });

  // 計算路由是否準備好：hydrated 且（未登入或團隊資料已加載）
  const isRouteReady = hasHydrated && (!isLoggedIn || !isTeamsLoading);

  // 管理 SplashScreen：路由準備好後才隱藏
  useEffect(() => {
    if (isRouteReady) {
      SplashScreen.hideAsync();
    }
  }, [isRouteReady]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

/**
 * Root Layout
 *
 * 職責：
 * 1. 提供全局 providers (Theme, Paper, React Query)
 * 2. 渲染基本的 navigator 結構
 * 3. 管理 SplashScreen
 * 4. 檢查並套用 OTA 更新
 *
 * 架構模式：分散式認證守衛
 * - Root Layout 只提供基礎設施，不處理路由守衛
 * - 各 Layout ((auth) 和 (main)) 各自負責守護自己的路由範圍
 */
export default function RootLayout() {
  // OTA 更新檢查
  useEffect(() => {
    async function checkForUpdates() {
      // 開發模式跳過 OTA 檢查
      if (__DEV__) {
        return;
      }

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // 立即套用更新
          await Updates.reloadAsync();
        }
      } catch (error) {
        // 靜默失敗，不影響用戶體驗
        console.error("OTA update check failed:", error);
      }
    }

    checkForUpdates();
  }, []);

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
