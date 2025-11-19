import { syncAuthStatus } from "@/services/auth";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Palette } from "@/constants/palette";

export default function LineSetupOnboardingLayout() {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const status = useAuthStore((state) => state.status);

  const checkAccessible = useCallback(() => {
    if (!isHydrated || status === AuthStatus.Unauthenticated) {
      router.replace("/landing");
      return;
    }

    if (status === AuthStatus.Active) {
      router.replace("/(main)/(tabs)/inbox");
      return;
    }

    if (status === AuthStatus.NoTeam) {
      router.replace("/(onboarding)/team-setup");
      return;
    }
  }, [isHydrated, status, router]);

  useFocusEffect(checkAccessible);
  useEffect(() => {
    syncAuthStatus();
  }, []);

  if (!isHydrated) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color={Palette.brand.primary} />
      </View>
    );
  }

  if (status === AuthStatus.NoWebhook) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color={Palette.brand.slate} />
    </View>
  );
}
