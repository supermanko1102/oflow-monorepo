/**
 * 時間相關工具函數
 * 處理日期格式化、相對時間、緊急度計算等
 */

export type UrgencyLevel = "urgent" | "soon" | "normal";

/**
 * 計算訂單的緊急程度
 * @param pickupDate - 取貨日期字串 (YYYY-MM-DD)
 * @returns 'urgent' | 'soon' | 'normal'
 */
export function getUrgencyLevel(pickupDate: string): UrgencyLevel {
  const now = new Date();
  const pickup = new Date(pickupDate);

  // 設定為當天開始時間，忽略小時分鐘
  now.setHours(0, 0, 0, 0);
  pickup.setHours(0, 0, 0, 0);

  const diffTime = pickup.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "urgent"; // 今天或已過期
  } else if (diffDays === 1) {
    return "soon"; // 明天
  } else {
    return "normal"; // 2天後以上
  }
}

/**
 * 格式化相對時間
 * @param pickupDate - 取貨日期字串
 * @param pickupTime - 取貨時間字串 (HH:mm)
 * @returns 友善的相對時間文字
 */
export function formatRelativeTime(
  pickupDate: string,
  pickupTime?: string
): string {
  const now = new Date();
  const pickup = new Date(pickupDate);

  now.setHours(0, 0, 0, 0);
  pickup.setHours(0, 0, 0, 0);

  const diffTime = pickup.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const timeStr = pickupTime ? ` ${pickupTime}` : "";

  if (diffDays === 0) {
    // 今天 - 計算小時差
    if (pickupTime) {
      const [hours, minutes] = pickupTime.split(":").map(Number);
      const pickupDateTime = new Date();
      pickupDateTime.setHours(hours, minutes, 0, 0);

      const currentTime = new Date();
      const hoursDiff = Math.floor(
        (pickupDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
      );
      const minutesDiff = Math.floor(
        (pickupDateTime.getTime() - currentTime.getTime()) / (1000 * 60)
      );

      if (hoursDiff < 0) {
        return `今天${timeStr}`;
      } else if (hoursDiff === 0) {
        return `${minutesDiff} 分鐘後`;
      } else if (hoursDiff < 3) {
        return `${hoursDiff} 小時後`;
      } else {
        return `今天${timeStr}`;
      }
    }
    return "今天";
  } else if (diffDays === 1) {
    return `明天${timeStr}`;
  } else if (diffDays === 2) {
    return `後天${timeStr}`;
  } else if (diffDays <= 7) {
    return `${diffDays} 天後`;
  } else {
    // 顯示日期
    const month = pickup.getMonth() + 1;
    const date = pickup.getDate();
    return `${month}/${date}`;
  }
}

/**
 * 獲取緊急度對應的顏色
 * @param level - 緊急程度
 * @returns 顏色值
 */
export function getUrgencyColor(level: UrgencyLevel): string {
  const colors = {
    urgent: "#EF4444", // 紅色
    soon: "#F59E0B", // 橘色
    normal: "#10B981", // 綠色
  };
  return colors[level];
}

/**
 * 獲取緊急度對應的 emoji
 * @param level - 緊急程度
 * @returns emoji
 */
export function getUrgencyEmoji(level: UrgencyLevel): string {
  const emojis = {
    urgent: "🔴",
    soon: "🟡",
    normal: "🟢",
  };
  return emojis[level];
}

/**
 * 獲取緊急度對應的文字
 * @param level - 緊急程度
 * @returns 文字描述
 */
export function getUrgencyText(level: UrgencyLevel): string {
  const texts = {
    urgent: "今天取貨",
    soon: "明天取貨",
    normal: "未來取貨",
  };
  return texts[level];
}

/**
 * 格式化日期為顯示格式
 * @param dateStr - 日期字串
 * @returns 格式化後的日期
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[date.getDay()];

  return `${month}/${day} (${weekday})`;
}

/**
 * 檢查是否為今天
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * 檢查是否為明天
 * @param dateStr - 日期字串
 * @returns boolean
 */
export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = new Date(dateStr);

  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}
