import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import '../global.css';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';

export const unstable_settings = {
  initialRouteName: 'login',
};

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00B900',
    primaryContainer: '#C8F5C8',
  },
};

export default function RootLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(tabs)';

    if (!isLoggedIn && inAuthGroup) {
      // 未登入但在受保護路由，重定向到登入頁
      router.replace('/login');
    } else if (isLoggedIn && !inAuthGroup) {
      // 已登入但不在受保護路由，重定向到首頁
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments]);

  return (
    <PaperProvider theme={paperLightTheme}>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen 
            name="login" 
            options={{ 
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="order" 
            options={{ headerShown: false }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
