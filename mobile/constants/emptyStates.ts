/**
 * 空狀態配置
 * 定義不同場景下的空狀態內容
 */

export interface EmptyStateConfig {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
}

export type EmptyStateType = 
  | 'noOrders'
  | 'noPendingOrders'
  | 'noCompletedOrders'
  | 'allCompleted'
  | 'noResults'
  | 'noReminders'
  | 'firstTime';

export const EMPTY_STATES: Record<EmptyStateType, EmptyStateConfig> = {
  noOrders: {
    icon: '📦',
    title: '還沒有訂單喔',
    description: 'AI 會自動從 LINE 對話生成訂單',
    actionLabel: '查看使用說明',
    actionRoute: '/(main)/(tabs)/settings',
  },
  noPendingOrders: {
    icon: '🎉',
    title: '太棒了！',
    description: '目前沒有待處理的訂單',
    actionLabel: '查看已完成訂單',
  },
  noCompletedOrders: {
    icon: '📋',
    title: '還沒有完成的訂單',
    description: '完成訂單後會顯示在這裡',
  },
  allCompleted: {
    icon: '✨',
    title: '全部完成！',
    description: '所有訂單都處理完畢了',
    actionLabel: '查看歷史記錄',
  },
  noResults: {
    icon: '🔍',
    title: '找不到符合的訂單',
    description: '試試調整篩選條件',
    actionLabel: '清除篩選',
  },
  noReminders: {
    icon: '🔔',
    title: '沒有提醒',
    description: '目前沒有需要提醒的訂單',
    actionLabel: '查看所有訂單',
    actionRoute: '/(main)/(tabs)/orders',
  },
  firstTime: {
    icon: '👋',
    title: '歡迎使用 OFlow！',
    description: '讓 AI 幫你自動處理 LINE 訂單\n開始與客戶對話，訂單會自動生成',
    actionLabel: '了解更多',
  },
};

