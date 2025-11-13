import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter, useSegments } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";

const authenticatedStatuses = [
  AuthStatus.NoTeam,
  AuthStatus.NoWebhook,
  AuthStatus.Active,
];

export default function MainLayout() {
  const router = useRouter();
  const segments = useSegments();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = authenticatedStatuses.includes(status);

  const checkAccessible = useCallback(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace("/landing");
      return;
    }

    const inTeamSetup = segments.some((s) => s === "team-setup");
    if (status === AuthStatus.NoTeam && !inTeamSetup) {
      router.replace("/(main)/team-setup");
      return;
    }

    const inLineSetup = segments.some((s) => s === "line-setup");
    if (status === AuthStatus.NoWebhook && !inLineSetup) {
      router.replace("/(main)/line-setup");
      return;
    }
  }, [isHydrated, isAuthenticated, status, segments, router]);

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
