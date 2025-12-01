import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator } from "react-native";

const authenticatedStatuses = [AuthStatus.NoTeam, AuthStatus.Active];
export default function AuthLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const status = useAuthStore((state) => state.status);
  const isCheckingSessionExpiration = useAuthStore(
    (state) => state.isCheckingSessionExpiration
  );
  const isAuthenticated = authenticatedStatuses.includes(status);

  const checkAccessible = useCallback(() => {
    if (isHydrated && isAuthenticated && !isCheckingSessionExpiration) {
      if (status === AuthStatus.NoTeam) {
        router.replace("/(onboarding)/team-setup");
      } else {
        router.replace("/(main)/(tabs)/inbox");
      }
    }
  }, [
    isHydrated,
    isAuthenticated,
    status,
    router,
    isCheckingSessionExpiration,
  ]);

  useFocusEffect(checkAccessible);
  try {
    if (!isHydrated || isCheckingSessionExpiration)
      throw new Error("Hydrating or checking session expiration");
    if (isAuthenticated) throw new Error("Already authenticated");
    return <Stack screenOptions={{ headerShown: false }} />;
  } catch (e) {
    e instanceof Error && console.log(`AuthLayout: Blocking [${e.message}]`);
    return <ActivityIndicator size="large" color="white" />;
  }
}
