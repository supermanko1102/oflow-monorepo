export type PushPlatform = "ios" | "android" | "web" | "unknown";

export type PushTokenStatus = "active" | "revoked";

export interface PushTokenRecord {
  id: string;
  user_id?: string;
  team_id?: string | null;
  expo_push_token: string;
  platform?: PushPlatform;
  device_id?: string | null;
  app_version?: string | null;
  project_id?: string | null;
  status: PushTokenStatus;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterPushTokenInput {
  expoPushToken: string;
  teamId?: string | null;
  platform?: PushPlatform;
  deviceId?: string | null;
  appVersion?: string | null;
  projectId?: string | null;
}
