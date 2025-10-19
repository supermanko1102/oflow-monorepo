export type OrderSource = 'auto' | 'semi-auto';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  pickupDate: string;
  pickupTime: string;
  status: OrderStatus;
  source: OrderSource;
  createdAt: string;
  lineConversation?: string[];
  notes?: string;
}

