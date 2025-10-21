import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

// LINE Login 端點
const LINE_AUTHORIZE_ENDPOINT = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_ENDPOINT = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_ENDPOINT = "https://api.line.me/v2/profile";

// 取得 LINE Channel ID
const getLineChannelId = (): string => {
  const channelId = Constants.expoConfig?.extra?.lineChannelId;
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

// LINE 使用者資料介面
export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
}

// OAuth 結果介面
export interface LineAuthResult {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * 啟動 LINE Login OAuth 流程
 * 使用 Authorization Code Flow with PKCE
 */
export const initiateLineLogin = async (): Promise<LineAuthResult> => {
  try {
    const channelId = getLineChannelId();

    // 產生 PKCE 參數
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // 產生 state
    const state = await generateState();

    // 建立 redirect URI（使用 HTTPS URL）
    // LINE Login 要求使用 HTTPS，不接受 custom scheme
    const redirectUri =
      Constants.expoConfig?.extra?.lineRedirectUri ||
      "https://YOUR_VERCEL_DOMAIN.vercel.app/auth/line-callback";

    console.log("[LINE Login] Redirect URI:", redirectUri);

    // 構建授權 URL
    const authUrl = `${LINE_AUTHORIZE_ENDPOINT}?${new URLSearchParams({
      response_type: "code",
      client_id: channelId,
      redirect_uri: redirectUri,
      state: state,
      scope: "profile openid email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent", // 強制顯示同意畫面
    }).toString()}`;

    console.log("[LINE Login] 啟動 OAuth 流程...");

    // 開啟瀏覽器進行授權
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    // 檢查結果
    if (result.type !== "success") {
      if (result.type === "cancel") {
        throw new Error("使用者取消登入");
      }
      throw new Error(`授權失敗: ${result.type}`);
    }

    // 從回傳的 URL 解析參數
    if (!result.url) {
      throw new Error("未收到回傳 URL");
    }

    const urlParams = new URL(result.url);
    const code = urlParams.searchParams.get("code");
    const returnedState = urlParams.searchParams.get("state");

    if (!code) {
      throw new Error("未收到授權碼");
    }

    // 驗證 state (防止 CSRF)
    if (returnedState !== state) {
      throw new Error("State 不符，可能遭受 CSRF 攻擊");
    }

    console.log("[LINE Login] 授權成功，開始交換 token...");

    // 交換 access token
    const tokenResult = await exchangeCodeForToken(
      code,
      codeVerifier,
      redirectUri
    );

    console.log("[LINE Login] Token 交換成功");

    return tokenResult;
  } catch (error) {
    console.error("[LINE Login] 錯誤:", error);
    throw error;
  }
};

/**
 * 使用授權碼交換 access token
 */
const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<LineAuthResult> => {
  try {
    const channelId = getLineChannelId();

    const response = await fetch(LINE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: channelId,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Token 交換失敗: ${errorData.error_description || errorData.error}`
      );
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("[LINE Login] Token 交換錯誤:", error);
    throw error;
  }
};

/**
 * 取得 LINE 使用者資料
 */
export const getLineUserProfile = async (
  accessToken: string
): Promise<LineUserProfile> => {
  try {
    console.log("[LINE Login] 取得使用者資料...");

    const response = await fetch(LINE_PROFILE_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`取得使用者資料失敗: ${response.status}`);
    }

    const data = await response.json();

    console.log("[LINE Login] 使用者資料:", {
      userId: data.userId,
      displayName: data.displayName,
    });

    return {
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      email: data.email, // 需要 email scope
    };
  } catch (error) {
    console.error("[LINE Login] 取得使用者資料錯誤:", error);
    throw error;
  }
};

/**
 * 驗證 ID Token (可選)
 * 若需要更高安全性，可以驗證 ID Token 的簽章
 */
export const verifyIdToken = async (idToken: string): Promise<any> => {
  // 這裡可以實作 JWT 驗證
  // 1. 解析 JWT
  // 2. 驗證簽章
  // 3. 驗證 exp, iat, aud, iss 等欄位
  // 目前先簡單解析
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ID Token");
  }

  const payload = JSON.parse(
    atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
  );

  return payload;
};
