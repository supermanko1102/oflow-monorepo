import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";

const authenticatedStatuses = [
  AuthStatus.NoTeam,
  AuthStatus.NoWebhook,
  AuthStatus.Active,
];

export default function MainLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = authenticatedStatuses.includes(status);

  const checkAccessible = useCallback(() => {
    if (isHydrated && isAuthenticated) {
      if (status === AuthStatus.NoTeam) {
        router.replace("/(main)/team-setup");
      } else if (status === AuthStatus.NoWebhook) {
        router.replace("/(main)/line-setup");
      } else {
        router.replace("/(main)/(tabs)/dashboard");
      }
    }
  }, [isHydrated, isAuthenticated, status, router]);

  useFocusEffect(checkAccessible);
  try {
    if (!isHydrated) throw new Error("Not hydrated");
    if (!isAuthenticated) throw new Error("Not authenticated");
    return <Stack />;
  } catch (e) {
    e instanceof Error && console.log(`MainLayout: Blocking [${e.message}]`);
    return <ActivityIndicator size="large" color="white" />;
  }
}
