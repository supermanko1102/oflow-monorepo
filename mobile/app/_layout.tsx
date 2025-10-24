import { QueryDevTools } from "@/components/QueryDevTools";
import { ToastContainer } from "@/components/Toast";
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
 * Root Layout
 *
 * 職責：
 * 1. 提供全局 providers (Theme, Paper)
 * 2. 等待 auth 狀態 hydration
 * 3. 根據 auth 狀態和團隊狀態進行初始路由決策
 * 4. 管理 splash screen
 *
 * 架構模式：集中式認證守衛
 * - 在 hydration 完成前返回 null，避免子組件提前渲染
 * - 使用條件渲染控制路由，避免在首次渲染時觸發導航副作用
 * - Team-Centric：已登入但無當前團隊時，導向團隊設置頁
 */
export default function RootLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
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
            <StatusBar style="auto" />
            <ToastContainer />
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
      <QueryDevTools />
    </QueryClientProvider>
  );
}
