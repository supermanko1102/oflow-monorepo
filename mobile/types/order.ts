export type OrderSource = 'auto' | 'semi-auto' | 'manual';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

// LINE 對話訊息介面
export interface LineMessage {
  role: 'customer' | 'ai';
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
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:MM:SS
  status: OrderStatus;
  source: OrderSource;
  notes?: string; // 商家內部備註
  customerNotes?: string; // 顧客備註
  conversationId?: string; // 對話 ID
  lineConversation?: LineMessage[] | string[]; // LINE 對話記錄（支援新舊格式）
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
}

