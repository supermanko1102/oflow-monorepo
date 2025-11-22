/**
 * 商品管理類型定義
 */
import type { DeliveryMethod } from "./delivery-settings";

export interface Product {
  id: string;
  team_id: string;
  name: string;
  price: number; // 以元為單位（前端顯示）
  description?: string;
  category?: string;
  image_url?: string;
  is_available: boolean;
  stock?: number;
  unit?: string; // 單位（個、份、杯等）
  created_at: string;
  updated_at: string;
  // 配送設定
  delivery_override?: ProductDeliveryOverride;
  effective_delivery_methods?: DeliveryMethod[];
}

// 創建商品請求
export interface CreateProductRequest {
  team_id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image_url?: string;
  is_available?: boolean;
  stock?: number;
  unit?: string;
  delivery_override?: ProductDeliveryOverride;
}

// 更新商品請求
export interface UpdateProductRequest {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
  image_url?: string;
  is_available?: boolean;
  stock?: number;
  unit?: string;
  delivery_override?: ProductDeliveryOverride;
}

// 商品分類選項
export const PRODUCT_CATEGORIES = [
  "蛋糕",
  "麵包",
  "甜點",
  "餅乾",
  "飲品",
  "其他",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// 商品單位選項
export const PRODUCT_UNITS = [
  "個",
  "份",
  "杯",
  "盒",
  "條",
  "片",
  "包",
  "瓶",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface ProductDeliveryOverride {
  use_team_default: boolean;
  methods?: DeliveryMethod[];
}
