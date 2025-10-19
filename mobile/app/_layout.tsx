import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ToastContainer } from '@/components/Toast';

// 防止 splash screen 自動隱藏
SplashScreen.preventAutoHideAsync();

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    elevation: {              // 所有陰影層級都用白色
      level0: '#F9FAFB',
      level1: '#F9FAFB',
      level2: '#F9FAFB',
      level3: '#F9FAFB',
      level4: '#F9FAFB',
      level5: '#F9FAFB',
    },
  }
};

/**
 * Root Layout
 * 
 * 職責：
 * 1. 提供全局 providers (Theme, Paper)
 * 2. 等待 auth 狀態 hydration
 * 3. 根據 auth 狀態進行初始路由決策
 * 4. 管理 splash screen
 * 
 * 架構模式：集中式認證守衛
 * - 在 hydration 完成前返回 null，避免子組件提前渲染
 * - 使用條件渲染控制路由，避免在首次渲染時觸發導航副作用
 */
export default function RootLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // 等待 hydration 完成前不渲染任何內容
  // 這確保了子 layout 不會在 auth 狀態確定前被掛載
  if (!hasHydrated) {
    return null;
  }

  // Hydration 完成後隱藏 splash screen
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperLightTheme}>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {!isLoggedIn ? (
              // 未登入：只渲染 auth group
              <Stack.Screen name="(auth)" />
            ) : (
              // 已登入：只渲染 main group
              <Stack.Screen name="(main)" />
            )}
          </Stack>
          <StatusBar style="auto" />
          <ToastContainer />
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
