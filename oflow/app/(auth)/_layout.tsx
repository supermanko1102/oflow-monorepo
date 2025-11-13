import { Stack } from "expo-router";

/**
 * 認證相關頁面的 Layout
 * 包含登入、註冊等頁面
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 隱藏導航列
        animation: "slide_from_right", // 頁面切換動畫
      }}
    >
      {/* 著陸頁面 */}
      <Stack.Screen name="landing" />
    </Stack>
  );
}
