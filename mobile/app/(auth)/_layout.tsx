import { Stack } from "expo-router";

/**
 * Auth Group Layout
 *
 * 此 layout 負責：
 * 1. 定義所有 auth 相關頁面
 * 2. 路由控制由 Root Layout 統一處理
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="team-setup" />
      <Stack.Screen name="team-select" />
      <Stack.Screen name="team-create" />
      <Stack.Screen name="team-join" />
      <Stack.Screen name="team-line-setup" />
    </Stack>
  );
}
