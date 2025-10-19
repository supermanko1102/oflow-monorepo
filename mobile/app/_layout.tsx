import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
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
 */
export default function RootLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hasHydrated) return;

    // 當 hydration 完成後，根據 auth 狀態進行初始導航
    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    if (!isLoggedIn && !inAuthGroup) {
      // 未登入且不在 auth group → 導向登入
      router.replace('/(auth)/login');
    } else if (isLoggedIn && !inMainGroup) {
      // 已登入且不在 main group → 導向主頁
      router.replace('/(main)/(tabs)');
    }

    // Hydration 完成後隱藏 splash screen
    SplashScreen.hideAsync();
  }, [hasHydrated, isLoggedIn, segments, router]);

  return (
    <PaperProvider theme={paperLightTheme}>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen 
            name="modal" 
            options={{ 
              presentation: 'modal',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
        <ToastContainer />
      </ThemeProvider>
    </PaperProvider>
  );
}
