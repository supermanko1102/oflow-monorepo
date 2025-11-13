import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

// LINE Login 端點
const LINE_AUTHORIZE_ENDPOINT = "https://access.line.me/oauth2/v2.1/authorize";

// 取得 LINE Channel ID
const getLineChannelId = (): string => {
  const channelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("請在 .env 檔案中設定 EXPO_PUBLIC_LINE_CHANNEL_ID");
  }
  return channelId;
};

// 產生 PKCE code_verifier 與 code_challenge
const generatePKCE = async () => {
  // 產生 code_verifier (43-128 個字元的隨機字串)
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64URLEncode(randomBytes);

  // 產生 code_challenge (SHA256 hash 後再 base64url encode)
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier
  );
  const codeChallenge = base64URLEncode(hexToBytes(digest));

  return { codeVerifier, codeChallenge };
};

// Base64 URL encode
const base64URLEncode = (bytes: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

// Hex string 轉 Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

// 產生隨機 state (防止 CSRF)
const generateState = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return base64URLEncode(randomBytes);
};

// Supabase Session 介面（從 backend 回傳）
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  teams?: any[]; // 團隊列表（從登入回應中取得）
}

/**
 * 啟動 LINE Login OAuth 流程
 * 使用 Authorization Code Flow with PKCE
 *
 * 使用 openAuthSessionAsync 會自動攔截 redirect URL 並返回
 * 返回的 URL 需要由調用方處理（不會觸發 deep link listener）
 */
export const initiateLineLogin = async (): Promise<string | null> => {
  try {
    const channelId = getLineChannelId();

    // 產生 PKCE 參數
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // 產生 state
    const state = await generateState();

    // 儲存 code_verifier 到 AsyncStorage（供 callback 使用）
    await AsyncStorage.setItem("line_pkce_code_verifier", codeVerifier);
    await AsyncStorage.setItem("line_pkce_state", state);

    // 使用 Vercel 作為 OAuth callback 端點
    const redirectUri = "https://oflow-website.vercel.app/auth/line-callback";

    console.log("[LINE Login] Redirect URI:", redirectUri);

    // 構建授權 URL（將 code_verifier 附加到 redirect_uri）
    // Backend 會需要這個來交換 token
    const redirectUriWithVerifier = `${redirectUri}?code_verifier=${encodeURIComponent(
      codeVerifier
    )}`;

    const authUrl = `${LINE_AUTHORIZE_ENDPOINT}?${new URLSearchParams({
      response_type: "code",
      client_id: channelId,
      redirect_uri: redirectUriWithVerifier,
      state: state,
      scope: "profile openid email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent", // 強制顯示同意畫面
    }).toString()}`;

    console.log("[LINE Login] 啟動 OAuth 流程...");

    // 開啟授權會話（OAuth 專用，會在重定向後自動關閉）
    // 使用 Universal Link 而非 URL Scheme，避免 iOS 安全限制
    // 當重定向到 /auth/callback 時，瀏覽器會自動關閉
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      "https://oflow-website.vercel.app/auth/callback" // 使用 Universal Link
    );

    console.log("[LINE Login] Auth session 結果:", result.type);

    // 處理返回結果
    if (result.type === "success" && result.url) {
      console.log("[LINE Login] 成功取得 redirect URL");
      return result.url;
    } else if (result.type === "cancel") {
      console.log("[LINE Login] 用戶取消授權");
      await AsyncStorage.removeItem("line_pkce_code_verifier");
      await AsyncStorage.removeItem("line_pkce_state");
      return null;
    } else {
      throw new Error(`授權失敗: ${result.type}`);
    }
  } catch (error) {
    // 清除儲存的 PKCE 參數
    await AsyncStorage.removeItem("line_pkce_code_verifier");
    await AsyncStorage.removeItem("line_pkce_state");
    console.error("[LINE Login] 錯誤:", error);
    throw error;
  }
};

/**
 * 處理 Auth callback（由 deep link 觸發）
 * 新架構：直接接收 Supabase session tokens（不再處理 LINE code）
 */
export const handleAuthCallback = async (
  url: string
): Promise<SupabaseSession> => {
  try {
    console.log("[Auth] 處理 callback:", url);

    // 解析 URL 參數
    const urlParams = new URL(url);
    const accessToken = urlParams.searchParams.get("access_token");
    const refreshToken = urlParams.searchParams.get("refresh_token");
    const teamsData = urlParams.searchParams.get("teams");
    const error = urlParams.searchParams.get("error");

    // 檢查是否有錯誤
    if (error) {
      throw new Error(`授權失敗: ${error}`);
    }

    // 檢查必要參數
    if (!accessToken || !refreshToken) {
      throw new Error("未收到有效的 session tokens");
    }

    // 解析團隊資料
    let teams: any[] = [];
    if (teamsData) {
      try {
        teams = JSON.parse(decodeURIComponent(teamsData));
      } catch (e) {
        console.warn("[Auth] 團隊資料解析失敗:", e);
      }
    }

    // 清除儲存的 PKCE 參數
    await AsyncStorage.removeItem("line_pkce_code_verifier");
    await AsyncStorage.removeItem("line_pkce_state");

    console.log("[Auth] Session tokens 接收成功，團隊數:", teams.length);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      teams,
    };
  } catch (error) {
    // 清除儲存的 PKCE 參數
    await AsyncStorage.removeItem("line_pkce_code_verifier");
    await AsyncStorage.removeItem("line_pkce_state");
    console.error("[Auth] Callback 處理錯誤:", error);
    throw error;
  }
};
