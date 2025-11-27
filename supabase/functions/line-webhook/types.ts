import type { TeamContext } from "../_shared/types.ts";

export function isServiceBasedBusiness(businessType: string): boolean {
  return ["beauty", "massage", "nail", "pet"].includes(businessType);
}

export type LineProfile = { displayName?: string; pictureUrl?: string } | null;

export const ORDER_CONFIRMATION_KEYWORDS = ["/訂單確認", "/建單", "/order"];
export const MERCHANT_CONFIRM_KEYWORDS = [
  "ok",
  "OK",
  "Ok",
  "確認",
  "訂單成立",
  "成立",
  "建單",
  "開單",
];

export type Team = TeamContext & {
  id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
  line_bot_user_id: string;
  auto_mode: boolean;
};
