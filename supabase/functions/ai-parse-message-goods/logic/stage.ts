import type { AIParseResult } from "../../_shared/types.ts";

export const deliveryMissingFields = new Set([
  "delivery_method",
  "pickup_type",
  "pickup_location",
  "delivery_date",
  "delivery_time",
  "store_info",
  "shipping_address",
]);

export const contactMissingFields = new Set(["customer_name", "customer_phone"]);

export function inferStageFromResult(result: AIParseResult): AIParseResult["stage"] {
  if (result.is_complete) return "done";
  const missing = result.missing_fields || [];
  const hasItems =
    Array.isArray(result.order?.items) && result.order?.items.length > 0;

  if (!hasItems) return "inquiry";

  const needsDelivery = missing.some((f) => deliveryMissingFields.has(f));
  if (needsDelivery) return "delivery";

  const needsContact = missing.some((f) => contactMissingFields.has(f));
  if (needsContact) return "contact";

  return "ordering";
}
