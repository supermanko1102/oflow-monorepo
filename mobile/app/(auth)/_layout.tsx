import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Auth Group Layout
 * 
 * 這個 layout 保護 auth 相關的頁面（如 login）
 * 如果用戶已登入，自動重定向到 main group
 */
export default function AuthLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 等待 hydration 完成
    if (!hasHydrated) return;

    // 如果已登入且在 auth group，重定向到 main
    const inAuthGroup = segments[0] === '(auth)';
    if (isLoggedIn && inAuthGroup) {
      router.replace('/(main)/(tabs)');
    }
  }, [hasHydrated, isLoggedIn, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

