import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";

const authenticatedStatuses = [
  AuthStatus.NoTeam,
  AuthStatus.NoWebhook,
  AuthStatus.Active,
];
export default function AuthLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = authenticatedStatuses.includes(status);
  const checkAccessible = useCallback(() => {
    if (isHydrated && isAuthenticated)
      router.replace("/(main)/(tabs)/dashboard");
  }, [isHydrated, isAuthenticated, router]);

  useFocusEffect(checkAccessible);
  try {
    if (!isHydrated) throw new Error("Hydrating");
    if (isAuthenticated) throw new Error("Already authenticated");
    return <Stack />;
  } catch (e) {
    e instanceof Error && console.log(`AuthLayout: Blocking [${e.message}]`);
    return <ActivityIndicator size="large" color="white" />;
  }
}
