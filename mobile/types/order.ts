// ==================== Order Types ====================

export type OrderSource = "auto" | "semi-auto" | "manual";
export type OrderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "completed"
  | "cancelled";
export type PaymentMethod = "cash" | "transfer" | "other";

// 配送/服務方式
export type DeliveryMethod =
  | "pickup" // 自取（商品型）
  | "convenience_store" // 超商取貨（商品型）
  | "black_cat" // 黑貓宅配（商品型）
  | "onsite"; // 到店服務（服務型）

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

// LINE 對話訊息介面
export interface LineMessage {
  role: "customer" | "ai";
  message: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string; // 訂單編號（如 ORD-20251020-001）
  customerId?: string; // 客戶 ID
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;

  // 通用時間欄位（語意：預約/交付）
  appointmentDate: string; // 預約/交付日期 (YYYY-MM-DD)
  appointmentTime: string; // 預約/交付時間 (HH:MM:SS)
  deliveryMethod: DeliveryMethod; // 配送/服務方式

  // 商品型專屬（選填）
  requiresFrozen?: boolean; // 是否需要冷凍配送
  storeInfo?: string; // 超商店號/店名
  shippingAddress?: string; // 寄送地址

  // 服務型專屬（選填）
  serviceDuration?: number; // 服務時長（分鐘）
  serviceNotes?: string; // 服務備註（如：頭髮長度、過敏）

  status: OrderStatus;
  source: OrderSource;
  paymentMethod?: PaymentMethod; // 付款方式（確認收款時記錄）
  paidAt?: string; // 付款確認時間
  notes?: string; // 商家內部備註
  customerNotes?: string; // 顧客備註
  conversationId?: string; // 對話 ID
  lineConversation?: LineMessage[] | string[]; // LINE 對話記錄（支援新舊格式）
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;

  // 向後兼容（標記為棄用）
  /** @deprecated 使用 appointmentDate */
  pickupDate?: string;
  /** @deprecated 使用 appointmentTime */
  pickupTime?: string;
}

// 配送方式標籤對應
export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  pickup: "自取",
  convenience_store: "超商取貨",
  black_cat: "黑貓宅配",
  onsite: "到店服務",
};

// 配送方式 icon 對應
export const DELIVERY_METHOD_ICONS: Record<DeliveryMethod, string> = {
  pickup: "store",
  convenience_store: "store",
  black_cat: "truck",
  onsite: "map-marker",
};

// 付款方式標籤對應
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "現金",
  transfer: "轉帳",
  other: "其他",
};

// 付款方式 icon 對應
export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: "cash",
  transfer: "bank-transfer",
  other: "dots-horizontal",
};

// ==================== API Types ====================

/**
 * 訂單查詢篩選條件
 */
export interface OrderFilters {
  status?: OrderStatus | "all";
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  search?: string;
}

/**
 * 訂單狀態更新參數
 */
export interface UpdateOrderStatusParams {
  order_id: string;
  status: OrderStatus;
  payment_method?: PaymentMethod; // 完成訂單時的付款方式
}

/**
 * 訂單資料更新參數
 */
export interface UpdateOrderParams {
  order_id: string;
  notes?: string;
  customer_notes?: string;
}

/**
 * Dashboard 摘要回應
 */
export interface DashboardSummary {
  todayPending: Order[];
  todayCompleted: Order[];
  future: Order[];
  recentOrders?: Order[];
}

export interface DashboardActivityPage {
  items: Order[];
  nextCursor: string | null;
}

// ==================== Revenue Stats Types ====================

/**
 * 時間範圍類型
 */
export type TimeRange = "day" | "week" | "month" | "year";

/**
 * 時間範圍標籤對應
 */
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  day: "今日",
  week: "本週",
  month: "本月",
  year: "本年",
};

/**
 * 付款方式統計
 */
export interface PaymentStats {
  cash: number;
  transfer: number;
  other: number;
}

/**
 * 營收統計回應
 */
export interface RevenueStats {
  timeRange: TimeRange;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  orderCount: number;
  paymentStats: PaymentStats;
}
