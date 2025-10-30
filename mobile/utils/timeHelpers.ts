/**
 * 時間相關工具函數
 * 使用 date-fns 處理日期格式化、相對時間、緊急度計算等
 */

import {
  differenceInDays,
  format,
  isToday as isTodayFns,
  isTomorrow as isTomorrowFns,
  startOfDay,
} from "date-fns";
import { zhTW } from "date-fns/locale";

/**
 * 格式化日期為顯示格式
 * @param dateStr - 日期字串
 * @returns 格式化後的日期
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "M/d (EEEE)", { locale: zhTW });
}

/**
 * 檢查是否為今天
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isToday(dateStr: string): boolean {
  return isTodayFns(new Date(dateStr));
}

/**
 * 檢查是否為明天
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isTomorrow(dateStr: string): boolean {
  return isTomorrowFns(new Date(dateStr));
}

/**
 * 檢查日期是否在本週內（從今天開始算 7 天內）
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isThisWeek(dateStr: string): boolean {
  const date = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  const diffDays = differenceInDays(date, today);
  return diffDays >= 0 && diffDays <= 7;
}

/**
 * 檢查日期是否為未來日期（明天之後）
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isFuture(dateStr: string): boolean {
  const date = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  return differenceInDays(date, today) > 0;
}

/**
 * 根據配送方式取得動作文字
 * @param deliveryMethod - 配送方式
 * @returns 動作文字（寄出/取貨/服務）
 */
export function getDeliveryActionText(deliveryMethod: string): string {
  const actionMap: Record<string, string> = {
    black_cat: "寄出",
    convenience_store: "寄出",
    pickup: "取貨",
    onsite: "服務",
  };
  return actionMap[deliveryMethod] || "取貨";
}

/**
 * 判斷是否需要顯示具體時間
 * @param deliveryMethod - 配送方式
 * @returns boolean
 */
export function shouldShowTime(deliveryMethod: string): boolean {
  // 物流訂單不顯示具體時間，只顯示日期
  const shippingMethods = ["black_cat", "convenience_store"];
  return !shippingMethods.includes(deliveryMethod);
}

/**
 * 根據配送方式格式化訂單時間
 * @param dateStr - 日期字串
 * @param timeStr - 時間字串（可選）
 * @param deliveryMethod - 配送方式
 * @returns 格式化後的時間字串
 */
export function formatOrderTime(
  dateStr: string,
  timeStr?: string,
  deliveryMethod: string = "pickup"
): string {
  const date = new Date(dateStr);
  const today = startOfDay(new Date());
  const targetDate = startOfDay(date);
  const diffDays = differenceInDays(targetDate, today);

  const actionText = getDeliveryActionText(deliveryMethod);
  const showTime = shouldShowTime(deliveryMethod);

  // 格式化時間（如果需要顯示）
  const formattedTime =
    showTime && timeStr ? ` ${timeStr.substring(0, 5)}` : "";

  // 根據日期差異返回不同格式
  if (diffDays === 0) {
    return `今天${formattedTime} ${actionText}`;
  } else if (diffDays === 1) {
    return `明天${formattedTime} ${actionText}`;
  } else if (diffDays === 2) {
    return `後天${formattedTime} ${actionText}`;
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays} 天後${formattedTime} ${actionText}`;
  } else {
    return `${format(date, "M/d")}${formattedTime} ${actionText}`;
  }
}
