import Line, {
  LoginPermission,
  LoginResult,
} from "@xmartlabs/react-native-line";

// 取得 LINE Channel ID
const getLineChannelId = (): string => {
  const channelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("請在 .env 檔案中設定 EXPO_PUBLIC_LINE_CHANNEL_ID");
  }
  return channelId;
};

// Supabase Session 介面（從 backend 回傳）
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  teams?: any[]; // 團隊列表（從登入回應中取得）
}

let lineSetupPromise: Promise<void> | null = null;

const ensureLineSdkSetup = async () => {
  if (!lineSetupPromise) {
    lineSetupPromise = Line.setup({
      channelId: getLineChannelId(),
    });
  }
  return lineSetupPromise;
};

/**
 * 使用官方 LINE SDK 走 App-to-App 登入並交換 Supabase session
 */
export const loginWithNativeLine = async (): Promise<SupabaseSession> => {
  await ensureLineSdkSetup();

  let loginResult: LoginResult;
  try {
    loginResult = await Line.login({
      scopes: [
        LoginPermission.Profile,
        LoginPermission.OpenId,
        LoginPermission.Email,
      ],
    });
  } catch (error) {
    console.warn("[LINE Native] Login 失敗", error);
    throw error;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("環境變數缺少 SUPABASE 設定");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/auth-line-callback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        access_token: loginResult.accessToken.accessToken,
        expires_in: Number(loginResult.accessToken.expiresIn) || undefined,
        id_token: loginResult.accessToken.idToken,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "LINE 登入交換 session 失敗");
  }

  const data = await response.json();
  if (!data.success || !data.session) {
    throw new Error("未收到有效的 Supabase session");
  }

  return data.session as SupabaseSession;
};
