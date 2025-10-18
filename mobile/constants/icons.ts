/**
 * 圖標系統
 * 統一管理 MaterialCommunityIcons 圖標名稱
 */

export const ICONS = {
  // 訂單相關
  order: {
    list: 'file-document-multiple-outline',
    detail: 'file-document-outline',
    new: 'file-plus-outline',
    completed: 'check-circle-outline',
    cancelled: 'close-circle-outline',
  },

  // 客戶相關
  customer: {
    list: 'account-multiple-outline',
    detail: 'account-outline',
    add: 'account-plus-outline',
    phone: 'phone-outline',
    message: 'message-text-outline',
    email: 'email-outline',
  },

  // 導航
  navigation: {
    home: 'home-outline',
    orders: 'clipboard-list-outline',
    reminders: 'bell-outline',
    settings: 'cog-outline',
    explore: 'compass-outline',
    schedule: 'calendar-month-outline',
  },

  // 動作
  actions: {
    add: 'plus',
    edit: 'pencil-outline',
    delete: 'delete-outline',
    search: 'magnify',
    filter: 'filter-outline',
    sort: 'sort',
    refresh: 'refresh',
    save: 'content-save-outline',
    close: 'close',
    back: 'arrow-left',
    forward: 'arrow-right',
    check: 'check',
    cancel: 'close',
    more: 'dots-vertical',
  },

  // 時間
  time: {
    calendar: 'calendar-outline',
    clock: 'clock-outline',
    today: 'calendar-today',
    week: 'calendar-week',
    month: 'calendar-month',
  },

  // 狀態
  status: {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert',
    info: 'information',
    pending: 'clock-outline',
  },

  // 聯繫方式
  contact: {
    phone: 'phone',
    message: 'message-text',
    email: 'email',
    line: 'chat',
  },

  // 統計
  stats: {
    chart: 'chart-line',
    barChart: 'chart-bar',
    pieChart: 'chart-pie',
    trending: 'trending-up',
    analytics: 'google-analytics',
  },

  // 設定
  settings: {
    general: 'cog',
    notification: 'bell',
    account: 'account-circle',
    security: 'shield-check',
    help: 'help-circle',
    logout: 'logout',
  },

  // 業務功能
  business: {
    revenue: 'cash',
    products: 'package-variant',
    inventory: 'cube-outline',
    schedule: 'calendar-clock',
    ai: 'robot',
  },

  // 其他
  misc: {
    empty: 'inbox-outline',
    loading: 'loading',
    wifi: 'wifi',
    qrCode: 'qrcode',
    camera: 'camera',
    image: 'image',
    file: 'file',
    link: 'link',
    share: 'share-variant',
  },
};

/**
 * 根據訂單狀態獲取圖標
 */
export function getOrderStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return ICONS.status.pending;
    case 'processing':
      return ICONS.status.info;
    case 'completed':
      return ICONS.status.success;
    case 'cancelled':
      return ICONS.status.error;
    default:
      return ICONS.order.detail;
  }
}

