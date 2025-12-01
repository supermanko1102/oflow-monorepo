import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";

const authenticatedStatuses = [AuthStatus.NoTeam, AuthStatus.Active];

export default function MainLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const status = useAuthStore((state) => state.status);
  const isAuthenticated = authenticatedStatuses.includes(status);

  const checkAccessible = useCallback(() => {
    if (isHydrated && !isAuthenticated) router.replace("/landing");
  }, [isHydrated, isAuthenticated, router]);

  useFocusEffect(checkAccessible);
  try {
    if (!isHydrated)
      throw new Error("Not hydrated or checking session expiration");
    if (!isAuthenticated) throw new Error("Not authenticated");
    return <Stack screenOptions={{ headerShown: false }} />;
  } catch (e) {
    e instanceof Error && console.log(`MainLayout: Blocking [${e.message}]`);
    return <ActivityIndicator size="large" color="white" />;
  }
}
