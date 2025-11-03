/**
 * Team 相關型別定義
 * 包含業務類別、團隊資訊、團隊成員等
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";

// ==================== API Types ====================

/**
 * 團隊資訊（從 API 返回）
 */
export interface Team {
  team_id: string;
  team_name: string;
  team_slug: string;
  role: string;
  member_count: number;
  order_count: number;
  subscription_status: string;
  line_channel_name: string | null;
  line_channel_id: string | null; // 用於判斷是否已完成 LINE 設定
}

/**
 * 團隊角色
 */
export type TeamRole = "owner" | "admin" | "member";

/**
 * 團隊成員資訊
 */
export interface TeamMember {
  member_id: string;
  user_id: string;
  user_name: string;
  user_picture_url: string | null;
  role: string;
  joined_at: string;
  can_manage_orders: boolean;
  can_manage_customers: boolean;
  can_manage_settings: boolean;
  can_view_analytics: boolean;
  can_invite_members: boolean;
}

/**
 * 使用者的團隊（簡化版，用於列表顯示）
 * Alias for Team interface for backward compatibility
 */
export type UserTeam = Team;

/**
 * 建立團隊參數
 */
export interface CreateTeamParams {
  team_name: string;
  line_channel_id?: string | null;
  business_type?: string;
}

/**
 * 建立團隊回應
 */
export interface CreateTeamResponse {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
}

/**
 * 更新 LINE 設定參數
 */
export interface UpdateLineSettingsParams {
  team_id: string;
  line_channel_id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
  line_channel_name?: string;
}

/**
 * 更新 LINE 設定回應
 */
export interface UpdateLineSettingsResponse {
  webhook_url: string;
  message: string;
}

/**
 * 驗證 LINE Channel 參數
 */
export interface ValidateLineChannelParams {
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
}

/**
 * 驗證 LINE Channel 回應
 */
export interface ValidateLineChannelResponse {
  valid: boolean;
  bot_name?: string;
  bot_picture_url?: string;
  error?: string;
}

/**
 * 測試 Webhook 參數
 */
export interface TestWebhookParams {
  team_id: string;
}

/**
 * 測試 Webhook 回應
 */
export interface TestWebhookResponse {
  success: boolean;
  webhook_configured: boolean;
  webhook_test_success: boolean;
  webhook_url: string;
  error?: string;
  message: string;
}

// ==================== Business Type ====================

// 業務類別
export type BusinessType =
  | "bakery" // 烘焙
  | "beauty" // 美容美髮
  | "massage" // 按摩 SPA
  | "nail" // 美甲美睫
  | "flower" // 花店
  | "craft" // 手工藝
  | "pet" // 寵物美容
  | "other"; // 其他

// 業務類別分類
export type BusinessCategory = "product" | "service";

// 業務類別選項
export interface BusinessTypeOption {
  value: BusinessType;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  description: string;
  category: BusinessCategory; // 用於 AI 判斷業務類型
}

// 業務類別選項列表
export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  {
    value: "bakery",
    label: "烘焙甜點",
    icon: "cake-variant",
    description: "蛋糕、麵包、甜點",
    category: "product",
  },
  {
    value: "beauty",
    label: "美容美髮",
    icon: "content-cut",
    description: "剪髮、染髮、護髮",
    category: "service",
  },
  {
    value: "massage",
    label: "按摩 SPA",
    icon: "spa",
    description: "按摩、芳療、美體",
    category: "service",
  },
  {
    value: "nail",
    label: "美甲美睫",
    icon: "hand-heart",
    description: "美甲、接睫毛",
    category: "service",
  },
  {
    value: "flower",
    label: "花店",
    icon: "flower-tulip",
    description: "花束、盆栽、花藝",
    category: "product",
  },
  {
    value: "pet",
    label: "寵物美容",
    icon: "dog",
    description: "寵物洗澡、美容",
    category: "service",
  },
  {
    value: "craft",
    label: "手工藝品",
    icon: "palette",
    description: "客製禮品、手作",
    category: "product",
  },
  {
    value: "other",
    label: "其他",
    icon: "package-variant",
    description: "其他類型業務",
    category: "product",
  },
];

// 根據業務類別取得標籤
export function getBusinessTypeLabel(type: BusinessType): string {
  const option = BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label || "其他";
}

// 根據業務類別取得分類（商品型/服務型）
export function getBusinessCategory(type: BusinessType): BusinessCategory {
  const option = BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.category || "product";
}

// 判斷是否為商品型業務
export function isProductBased(type: BusinessType): boolean {
  return getBusinessCategory(type) === "product";
}

// 判斷是否為服務型業務
export function isServiceBased(type: BusinessType): boolean {
  return getBusinessCategory(type) === "service";
}

// ==================== Form Data Types ====================

/**
 * 團隊建立表單資料
 */
export interface TeamCreateFormData {
  teamName: string;
  businessType: BusinessType;
}

/**
 * 加入團隊表單資料
 */
export interface TeamJoinFormData {
  inviteCode: string;
}

/**
 * LINE 設定表單資料
 */
export interface LineSettingsFormData {
  channelId: string;
  channelSecret: string;
  accessToken: string;
  channelName?: string;
}

/**
 * 刪除團隊確認表單資料
 */
export interface DeleteTeamConfirmFormData {
  teamName: string;
}
