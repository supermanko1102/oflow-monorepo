// 配送設定查詢邏輯
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export interface PickupSettings {
  store_pickup: {
    enabled: boolean;
    address: string | null;
    business_hours: string | null;
  };
  meetup: {
    enabled: boolean;
    available_areas: string[];
    note: string | null;
  };
}

export interface DeliverySettings {
  pickup_settings: PickupSettings;
  enable_convenience_store: boolean;
  enable_black_cat: boolean;
}

// 查詢團隊的配送設定
export async function fetchTeamDeliverySettings(
  teamId: string
): Promise<DeliverySettings | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[Delivery Settings Fetcher] Supabase credentials not configured"
    );
    return null;
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabaseAdmin
      .from("team_settings")
      .select("pickup_settings, enable_convenience_store, enable_black_cat")
      .eq("team_id", teamId)
      .single();

    if (error) {
      console.error("[Delivery Settings Fetcher] 查詢設定失敗:", error);
      return null;
    }

    return data as DeliverySettings;
  } catch (error) {
    console.error("[Delivery Settings Fetcher] 查詢設定異常:", error);
    return null;
  }
}

// 生成配送方式說明（供 AI 參考）
export function generateDeliveryMethodsPrompt(
  settings: DeliverySettings | null
): string {
  if (!settings) {
    // 預設：全部開啟
    return `
配送方式（全部可用）：
1. **自取（pickup）**：
   - 「自取」「到店」「店取」→ pickup_type=store
   - 「面交」「當面交」「約面交」→ pickup_type=meetup
2. **超商取貨（convenience_store）**：「超商」「7-11」「全家」「萊爾富」「OK」
3. **宅配（black_cat）**：「宅配」「黑貓」「寄送」「配送」`;
  }

  const availableMethods: string[] = [];
  const pickupTypes: string[] = [];

  // 檢查店取
  if (settings.pickup_settings?.store_pickup?.enabled) {
    const address =
      settings.pickup_settings.store_pickup.address || "（商家地址）";
    const hours = settings.pickup_settings.store_pickup.business_hours;
    pickupTypes.push(
      `   - 店取（store）：到店取貨，地址：${address}${
        hours ? `，${hours}` : ""
      }`
    );
  }

  // 檢查面交
  if (settings.pickup_settings?.meetup?.enabled) {
    const areas = settings.pickup_settings.meetup.available_areas?.length
      ? ` 可面交區域：${settings.pickup_settings.meetup.available_areas.join(
          "、"
        )}`
      : "";
    const note = settings.pickup_settings.meetup.note
      ? ` (${settings.pickup_settings.meetup.note})`
      : "";
    pickupTypes.push(`   - 面交（meetup）：約定地點面交${areas}${note}`);
  }

  // 如果有任一種取貨方式
  if (pickupTypes.length > 0) {
    availableMethods.push(
      `1. **取貨（pickup）**：\n   同義詞：「自取」「到店」「店取」「面交」「當面交」「約面交」\n${pickupTypes.join(
        "\n"
      )}`
    );
  }

  // 檢查超商
  if (settings.enable_convenience_store) {
    availableMethods.push(
      `2. **超商取貨（convenience_store）**：\n   同義詞：「超商」「7-11」「全家」「萊爾富」「OK」「超商取貨」`
    );
  }

  // 檢查宅配
  if (settings.enable_black_cat) {
    availableMethods.push(
      `3. **宅配（black_cat）**：\n   同義詞：「宅配」「黑貓」「寄送」「配送」「送到家」`
    );
  }

  if (availableMethods.length === 0) {
    return `
配送方式：商家尚未設定配送方式，請引導客人提供需求。`;
  }

  return `
配送方式（商家已啟用以下方式）：
${availableMethods.join("\n\n")}`;
}
