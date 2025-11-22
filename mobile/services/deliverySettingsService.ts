/**
 * Delivery Settings Service
 * 封裝所有配送設定相關的 API 呼叫
 */

import { ApiClient } from "@/lib/apiClient";
import type { DeliverySettings } from "@/types/delivery-settings";

// 建立 Delivery Settings API Client 實例
const deliverySettingsApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delivery-settings`
);

// ==================== Queries ====================

/**
 * 查詢團隊的配送設定
 */
export async function getDeliverySettings(
  teamId: string
): Promise<DeliverySettings | null> {
  try {
    const { settings } = await deliverySettingsApi.call<{
      settings: DeliverySettings;
    }>("GET", "delivery-settings", { team_id: teamId });

    return settings;
  } catch (error) {
    console.error("[Service] 取得配送設定失敗:", error);
    return null;
  }
}

// ==================== Mutations ====================

/**
 * 更新團隊的配送設定
 */
export async function updateDeliverySettings(
  teamId: string,
  settings: Partial<DeliverySettings>
): Promise<boolean> {
  try {
    await deliverySettingsApi.call(
      "POST",
      "delivery-settings/update",
      undefined,
      { team_id: teamId, ...settings }
    );

    return true;
  } catch (error) {
    console.error("[Service] 更新配送設定失敗:", error);
    throw error;
  }
}
