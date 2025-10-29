/**
 * 環境變數配置管理
 *
 * 集中管理所有環境變數，避免在多個檔案中重複讀取 Constants.expoConfig
 * 提供類型安全的配置存取
 */

import Constants from "expo-constants";

// 從 expo config 讀取環境變數
const expoConfig = Constants.expoConfig?.extra;

/**
 * 驗證必要的環境變數
 */
function validateConfig() {
  const requiredVars = {
    supabaseUrl: expoConfig?.supabaseUrl,
    supabaseAnonKey: expoConfig?.supabaseAnonKey,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `缺少必要的環境變數: ${missing.join(", ")}\n` +
        `請確認 .env 檔案中已設定 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY`
    );
  }
}

// 啟動時驗證配置
validateConfig();

/**
 * 應用程式配置
 */
export const config = {
  /**
   * Supabase 配置
   */
  supabase: {
    url: expoConfig?.supabaseUrl as string,
    anonKey: expoConfig?.supabaseAnonKey as string,
  },

  /**
   * LINE 配置
   */
  line: {
    channelId: expoConfig?.lineChannelId as string | undefined,
  },

  /**
   * Edge Functions URLs
   */
  api: {
    teamOperations: `${expoConfig?.supabaseUrl}/functions/v1/team-operations`,
    orderOperations: `${expoConfig?.supabaseUrl}/functions/v1/order-operations`,
    productOperations: `${expoConfig?.supabaseUrl}/functions/v1/product-operations`,
    lineWebhook: `${expoConfig?.supabaseUrl}/functions/v1/line-webhook`,
    aiParseMessage: `${expoConfig?.supabaseUrl}/functions/v1/ai-parse-message`,
    authLineCallback: `${expoConfig?.supabaseUrl}/functions/v1/auth-line-callback`,
  },

  /**
   * 應用程式設定
   */
  app: {
    scheme: "oflow",
    bundleId: "com.oflow.app",
  },
} as const;

/**
 * 判斷是否為開發環境
 */
export const isDevelopment = __DEV__;

/**
 * 判斷是否為生產環境
 */
export const isProduction = !__DEV__;

/**
 * Config type export for type safety
 */
export type AppConfig = typeof config;
