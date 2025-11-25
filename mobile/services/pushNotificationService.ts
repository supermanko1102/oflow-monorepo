import { ApiClient } from "@/lib/apiClient";
import type {
  PushTokenRecord,
  RegisterPushTokenInput,
} from "@/types/notification";

const notificationApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notification-operations`
);

/**
 * 註冊 / 更新 Expo Push Token
 */
export async function registerPushToken(
  input: RegisterPushTokenInput
): Promise<void> {
  await notificationApi.call<{ success: boolean }>("POST", "register", undefined, {
    expo_push_token: input.expoPushToken,
    team_id: input.teamId ?? null,
    platform: input.platform ?? "unknown",
    device_id: input.deviceId ?? null,
    app_version: input.appVersion ?? null,
    project_id: input.projectId ?? null,
  });
}

/**
 * 註銷 Expo Push Token（登出或關閉推播時呼叫）
 */
export async function unregisterPushToken(expoPushToken: string): Promise<void> {
  await notificationApi.call<{ success: boolean }>(
    "POST",
    "unregister",
    undefined,
    { expo_push_token: expoPushToken }
  );
}

/**
 * 取得目前使用者的 tokens（除錯/設定頁可用）
 */
export async function listPushTokens(): Promise<PushTokenRecord[]> {
  const { tokens } = await notificationApi.call<{ tokens: PushTokenRecord[] }>(
    "GET",
    "list"
  );
  return tokens;
}
