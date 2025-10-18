/**
 * Emoji 系統
 * 統一管理應用中使用的 Emoji
 */

export const EMOJI = {
  // 問候語
  greeting: {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙',
    night: '🌙',
    wave: '👋',
  },

  // 訂單狀態
  order: {
    pending: '⏳',
    processing: '🔄',
    completed: '✅',
    cancelled: '❌',
    urgent: '🔴',
    normal: '🟡',
    relaxed: '🟢',
  },

  // 業務類型
  business: {
    orders: '📦',
    revenue: '💰',
    customers: '👥',
    stats: '📊',
    calendar: '📅',
    time: '⏰',
    location: '📍',
  },

  // 動作
  actions: {
    add: '➕',
    edit: '✏️',
    delete: '🗑️',
    search: '🔍',
    filter: '🔽',
    refresh: '🔄',
    settings: '⚙️',
    notification: '🔔',
    phone: '📞',
    message: '💬',
  },

  // 情緒/反饋
  feedback: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    celebrate: '🎉',
    thumbsUp: '👍',
    fire: '🔥',
  },

  // 功能區域
  features: {
    ai: '🤖',
    schedule: '📆',
    analytics: '📈',
    reminders: '⏰',
    chat: '💬',
    qrCode: '📱',
  },

  // 空狀態
  empty: {
    noOrders: '📭',
    noReminders: '🔕',
    noData: '📊',
    noResults: '🔍',
    completed: '🎉',
  },

  // 時間相關
  time: {
    today: '📅',
    tomorrow: '📆',
    week: '📅',
    month: '📆',
    clock: '🕐',
  },

  // 業態
  businessType: {
    pickup: '🛍️',
    appointment: '📅',
    delivery: '🚚',
  },

  // 來源
  source: {
    line: '💚',
    web: '🌐',
    manual: '✍️',
    api: '🔌',
  },
};

/**
 * 獲取問候 Emoji
 */
export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return EMOJI.greeting.night;
  if (hour < 12) return EMOJI.greeting.morning;
  if (hour < 18) return EMOJI.greeting.afternoon;
  if (hour < 22) return EMOJI.greeting.evening;
  return EMOJI.greeting.night;
}

/**
 * 獲取訂單狀態 Emoji
 */
export function getOrderStatusEmoji(status: string): string {
  switch (status) {
    case 'pending':
      return EMOJI.order.pending;
    case 'processing':
      return EMOJI.order.processing;
    case 'completed':
      return EMOJI.order.completed;
    case 'cancelled':
      return EMOJI.order.cancelled;
    default:
      return EMOJI.order.pending;
  }
}

