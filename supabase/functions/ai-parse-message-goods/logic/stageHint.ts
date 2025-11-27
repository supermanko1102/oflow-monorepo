import type { AIParseResult } from "../../_shared/types.ts";

export type StageHint = Exclude<AIParseResult["stage"], undefined>;

export function deriveStageHint(collectedData: any): StageHint {
  const hasItems =
    Array.isArray(collectedData?.items) && collectedData.items.length > 0;
  if (!hasItems) return "inquiry";

  const method = collectedData?.delivery_method;
  if (!method) return "ordering";

  if (method === "pickup") {
    if (!collectedData?.pickup_type) return "delivery";
    if (collectedData.pickup_type === "meetup" && !collectedData?.pickup_location) {
      return "delivery";
    }
    if (!collectedData?.delivery_date || !collectedData?.delivery_time) {
      return "delivery";
    }
  }

  if (method === "convenience_store" && !collectedData?.store_info) {
    return "delivery";
  }
  if (method === "black_cat" && !collectedData?.shipping_address) {
    return "delivery";
  }

  if (!collectedData?.customer_name || !collectedData?.customer_phone) {
    return "contact";
  }

  return "done";
}
