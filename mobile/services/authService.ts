/**
 * Auth Service
 * 封裝認證相關的 API 呼叫（帳號刪除等）
 */

import { ApiClient } from "@/lib/apiClient";
import { config } from "@/lib/config";

// 建立 Auth API Client 實例
const authApi = new ApiClient(config.supabase.url + "/functions/v1/delete-account");

/**
 * 刪除用戶帳號（永久刪除）
 * 
 * ⚠️ 注意：
 * - 此操作無法復原
 * - 如果用戶是團隊唯一 owner，將自動刪除該團隊
 * - 符合 Apple App Store Guidelines 5.1.1(v) 要求
 */
export async function deleteAccount(): Promise<void> {
  await authApi.call<{ message: string }>("POST", "");
}

