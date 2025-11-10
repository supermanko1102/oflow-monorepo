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
 * - 在 Splash 隱藏後檢查並下載 OTA 更新
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

  // 管理 SplashScreen 和 OTA 更新：Splash 隱藏後才檢查更新
  useEffect(() => {
    async function initializeApp() {
      if (!isRouteReady) return;

      try {
        // 步驟 1: 隱藏 Splash Screen
        console.log("[App Init] Hiding splash screen...");
        await SplashScreen.hideAsync();
        console.log("[App Init] Splash screen hidden");

        // 步驟 2: 檢查 OTA 更新（只在 production build 執行）
        if (__DEV__) {
          console.log("[OTA] Skipped in development mode");
          return;
        }

        // 記錄當前狀態
        console.log("[OTA] Current state:", {
          channel: Updates.channel,
          runtimeVersion: Updates.runtimeVersion,
          updateId: Updates.updateId || "built-in",
        });

        // 檢查更新
        console.log("[OTA] Checking for updates...");
        const update = await Updates.checkForUpdateAsync();
        console.log("[OTA] Check result:", {
          isAvailable: update.isAvailable,
          manifestId: update.manifest?.id,
        });

        if (update.isAvailable) {
          // 背景下載更新
          console.log("[OTA] Downloading update...");
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log("[OTA] Update downloaded:", {
            isNew: fetchResult.isNew,
          });

          // 更新將在下次啟動時自動套用
          console.log(
            "[OTA] ✅ Update ready! Will be applied on next app launch."
          );

          // 可選：顯示提示（需要引入 Alert 或 Toast）
          // Alert.alert('更新完成', '新版本將在下次啟動時套用');
        } else {
          console.log("[OTA] Already on the latest version");
        }
      } catch (error) {
        console.error("[OTA] Update check failed:", error);
        // 錯誤不應該阻止 App 正常運行
      }
    }

    initializeApp();
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
 *
 * 架構模式：分散式認證守衛
 * - Root Layout 只提供基礎設施，不處理路由守衛
 * - 各 Layout ((auth) 和 (main)) 各自負責守護自己的路由範圍
 * - SplashScreen 和 OTA 更新由 RootNavigator 管理
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
