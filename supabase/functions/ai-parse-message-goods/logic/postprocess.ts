import type { AIParseResult } from "../../_shared/types.ts";
import type { DeliverySettings } from "../../_shared/delivery-settings-fetcher.ts";
import { inferStageFromResult } from "./stage.ts";

export function getAllowedDeliveryMethods(
  settings: DeliverySettings | null
): string[] {
  const allowed = new Set<string>();

  if (
    settings?.pickup_settings?.store_pickup?.enabled ||
    settings?.pickup_settings?.meetup?.enabled
  ) {
    allowed.add("pickup");
  }
  if (settings?.enable_convenience_store) {
    allowed.add("convenience_store");
  }
  if (settings?.enable_black_cat) {
    allowed.add("black_cat");
  }

  return Array.from(allowed);
}

export function enforceAllowedDeliveryMethod(
  result: AIParseResult,
  allowed: string[]
): AIParseResult {
  if (!result.order || allowed.length === 0) return result;
  const deliveryMethod = result.order.delivery_method;
  if (!deliveryMethod) return result;
  if (allowed.includes(deliveryMethod)) return result;

  // 移除不允許的配送方式，要求重新選擇
  result.order.delivery_method = undefined;
  (result.order as any).pickup_type = undefined;
  (result.order as any).pickup_location = undefined;
  (result.order as any).store_info = undefined;
  (result.order as any).shipping_address = undefined;
  (result.order as any).delivery_time = undefined;

  result.is_complete = false;
  result.missing_fields = Array.from(
    new Set([...(result.missing_fields || []), "delivery_method"])
  );

  const methodLabelMap: Record<string, string> = {
    pickup: "店取/面交",
    convenience_store: "超商取貨",
    black_cat: "宅配",
  };
  const allowedText = allowed.map((m) => methodLabelMap[m] || m).join("、");
  result.suggested_reply = `目前提供的配送方式：${allowedText}。請問您要選擇哪一種呢？`;
  return result;
}

export function computeMissingFields(order: any): string[] {
  const missing = new Set<string>();
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    missing.add("items");
    return Array.from(missing);
  }

  const method = order.delivery_method;
  if (!method) {
    missing.add("delivery_method");
  }

  if (method === "pickup") {
    if (!order.pickup_type) {
      missing.add("pickup_type");
    } else if (order.pickup_type === "meetup" && !order.pickup_location) {
      missing.add("pickup_location");
    }
    if (!order.delivery_date) {
      missing.add("delivery_date");
    }
    if (!order.delivery_time) {
      missing.add("delivery_time");
    }
  }

  if (method === "convenience_store") {
    if (!order.store_info) {
      missing.add("store_info");
    }
    if (!order.delivery_date) {
      missing.add("delivery_date");
    }
  }

  if (method === "black_cat") {
    if (!order.shipping_address) {
      missing.add("shipping_address");
    }
    if (!order.delivery_date) {
      missing.add("delivery_date");
    }
  }

  if (!order.customer_name) {
    missing.add("customer_name");
  }
  if (!order.customer_phone) {
    missing.add("customer_phone");
  }

  return Array.from(missing);
}

export function normalizeAIResult(
  result: AIParseResult,
  deliverySettings: DeliverySettings | null
): AIParseResult {
  // 預設值補齊
  if (!result.intent) result.intent = "other";
  if (typeof result.confidence !== "number") result.confidence = 0.5;
  if (typeof result.is_continuation !== "boolean") result.is_continuation = false;

  const allowedMethods = getAllowedDeliveryMethods(deliverySettings);
  let updated = enforceAllowedDeliveryMethod(result, allowedMethods);

  // 由系統計算缺漏與完整度
  updated.missing_fields = computeMissingFields(updated.order);
  const hasItems =
    !!updated.order && Array.isArray(updated.order.items) && updated.order.items.length > 0;
  if (hasItems) {
    updated.intent = "order";
  }
  updated.is_complete = hasItems && updated.missing_fields.length === 0;
  updated.stage = inferStageFromResult(updated);

  return updated;
}
