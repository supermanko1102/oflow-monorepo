import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Application from "expo-application";

import { requestNotificationPermissions } from "@/utils/notificationService";
import { registerPushToken } from "@/services/pushNotificationService";
import { AuthStatus, useAuthStore } from "@/stores/auth";

export function usePushRegistration() {
  const hasRegisteredRef = useRef(false);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    const shouldRegister =
      currentTeamId &&
      status !== AuthStatus.Unauthenticated &&
      status !== undefined;
    if (!shouldRegister || hasRegisteredRef.current) return;

    (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("[Push] Missing projectId; skip token registration");
        return;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const expoPushToken = tokenResponse.data;

      let deviceId: string | null = null;
      try {
        deviceId =
          Platform.OS === "ios"
            ? await Application.getIosIdForVendorAsync()
            : Platform.OS === "android"
              ? await Application.getAndroidId()
              : null;
      } catch (e) {
        console.log("[Push] get device id failed", e);
      }

      const runtimeVersion = Constants.expoConfig?.runtimeVersion;
      const appVersion =
        Constants.expoConfig?.version ||
        (typeof runtimeVersion === "object" && "policy" in runtimeVersion
          ? runtimeVersion.policy
          : typeof runtimeVersion === "string"
            ? runtimeVersion
            : null);

      await registerPushToken({
        expoPushToken,
        teamId: currentTeamId,
        platform: Platform.OS as "ios" | "android" | "web" | "unknown",
        deviceId,
        appVersion,
        projectId,
      });

      hasRegisteredRef.current = true;
    })().catch((err) => {
      console.error("[Push] register token failed", err);
    });
  }, [currentTeamId, status]);
}
