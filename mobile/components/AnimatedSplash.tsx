import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/useAuthStore";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useEffect, useState, type ReactNode } from "react";
import { Text, useColorScheme, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

export function AnimatedSplash({ children }: { children: ReactNode }) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [isAppReady, setIsAppReady] = useState(false);
  const colorScheme = useColorScheme();

  // 取得團隊列表（只在已登入且 hydrated 時啟用）
  const { isLoading: isTeamsLoading } = useTeams({
    enabled: isLoggedIn && hasHydrated,
  });

  // 計算路由是否準備好：hydrated 且（未登入或團隊資料已加載）
  const isRouteReady = hasHydrated && (!isLoggedIn || !isTeamsLoading);

  useEffect(() => {
    async function initializeApp() {
      if (!isRouteReady) return;

      try {
        await SplashScreen.hideAsync();
        // 步驟 2: 檢查 OTA 更新（只在 production build 執行）
        if (__DEV__) {
          setIsAppReady(true);
          return;
        }
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
        } else {
          console.log("[OTA] Already on the latest version");
        }
        setIsAppReady(true);
      } catch (error) {
        console.error("[OTA] Update check failed:", error);
        setIsAppReady(true);
      }
    }

    initializeApp();
  }, [isRouteReady]);

  // 主題相關樣式
  const isDark = colorScheme === "dark";

  // 如果應用還未準備好，顯示自定義啟動畫面
  if (!isAppReady) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? "bg-green-950" : "bg-line-green"
        }`}
      >
        <Animated.View className="mb-6" entering={FadeInDown.duration(600)}>
          <View className="w-[100px] h-[100px] rounded-full items-center justify-center bg-transparent">
            <Text className="text-white text-2xl font-bold">OFlow</Text>
          </View>
        </Animated.View>
      </View>
    );
  }
  return <>{children}</>;
}
