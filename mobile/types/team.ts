/**
 * Team 相關型別定義
 * 包含業務類別、團隊資訊等
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";

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
