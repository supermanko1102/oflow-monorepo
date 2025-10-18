import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Main Group Layout
 * 
 * 這個 layout 保護所有需要登入的頁面
 * 如果用戶未登入，自動重定向到 auth group
 */
export default function MainLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 等待 hydration 完成
    if (!hasHydrated) return;

    // 如果未登入且在 main group，重定向到 auth
    const inMainGroup = segments[0] === '(main)';
    if (!isLoggedIn && inMainGroup) {
      router.replace('/(auth)/login');
    }
  }, [hasHydrated, isLoggedIn, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="order"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

