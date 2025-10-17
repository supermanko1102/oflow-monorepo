// OFlow 系統型別定義

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";
export type DeliveryMethod = "pickup" | "delivery" | "service";
export type CatalogItemType = "product" | "service";
export type PaymentMethod = "transfer" | "cash" | "credit_card";
export type PaymentStatus = "pending" | "confirmed";
export type CustomerTag = "VIP" | "returning" | "new" | "frequent";

export interface Organization {
  id: string;
  name: string;
  businessType: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone?: string;
  tags: CustomerTag[];
  channelUserId?: string;
  lastSeenAt: Date;
  avatar?: string;
  totalOrders?: number;
  totalSpent?: number;
}

export interface CatalogItem {
  id: string;
  orgId: string;
  type: CatalogItemType;
  name: string;
  price: number;
  options?: Record<string, string[]>;
  active: boolean;
  description?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: Record<string, string[]>;
}

export interface Suborder {
  id: string;
  orderId: string;
  scheduleAt: Date;
  quantity?: number;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  proofUrl?: string;
  recognized?: Record<string, string[]>;
  confirmedAt?: Date;
}

export interface Order {
  id: string;
  orgId: string;
  customerId: string;
  customer?: Customer;
  type: "order" | "appointment";
  total: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  notes?: string;
  createdAt: Date;
  items: OrderItem[];
  suborders?: Suborder[];
  payment?: Payment;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  weeklyReturnRate: number;
  revenueChange: number;
  ordersChange: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface TodoItem {
  id: string;
  title: string;
  type: "order" | "reminder" | "alert";
  orderId?: string;
  completed: boolean;
  time?: string;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

export interface AnalyticsData {
  revenue: RevenueData[];
  topProducts: TopProduct[];
  customerStats: {
    new: number;
    returning: number;
    vip: number;
  };
}
