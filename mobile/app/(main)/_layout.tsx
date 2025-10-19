import { Stack } from 'expo-router';

/**
 * Main Group Layout
 * 
 * 此 layout 僅負責頁面結構配置
 * 認證守衛邏輯由 Root Layout 統一處理
 */
export default function MainLayout() {
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

