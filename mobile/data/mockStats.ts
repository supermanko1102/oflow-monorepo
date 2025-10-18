export interface DailyStats {
  todayOrderCount: number;
  todayRevenue: number;
  pendingOrderCount: number;
}

export interface WeeklyStats {
  weekOrderCount: number;
  weekRevenue: number;
  lastWeekOrderCount: number;
  growthRate: number; // 成長率百分比
  aiAutoProcessed: number; // AI 自動處理的訂單數
  timeSaved: number; // 節省的時間（分鐘）
}

export const mockDailyStats: DailyStats = {
  todayOrderCount: 3,
  todayRevenue: 3450,
  pendingOrderCount: 4,
};

export const mockWeeklyStats: WeeklyStats = {
  weekOrderCount: 12,
  weekRevenue: 15680,
  lastWeekOrderCount: 10,
  growthRate: 20,
  aiAutoProcessed: 8,
  timeSaved: 40,
};

