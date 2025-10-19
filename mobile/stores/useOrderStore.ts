import { create } from 'zustand';
import { Order } from '@/types/order';
import { mockOrders } from '@/data/mockOrders';

interface OrderStore {
  orders: Order[];
  
  // 根據 ID 取得訂單
  getOrderById: (id: string) => Order | undefined;
  
  // 標記訂單完成
  markOrderCompleted: (orderId: string) => void;
  
  // 標記訂單待處理
  markOrderPending: (orderId: string) => void;
  
  // 更新訂單
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: mockOrders,
  
  getOrderById: (id: string) => {
    return get().orders.find(order => order.id === id);
  },
  
  markOrderCompleted: (orderId: string) => {
    set(state => ({
      orders: state.orders.map(order =>
        order.id === orderId
          ? { ...order, status: 'completed' }
          : order
      ),
    }));
  },
  
  markOrderPending: (orderId: string) => {
    set(state => ({
      orders: state.orders.map(order =>
        order.id === orderId
          ? { ...order, status: 'pending' }
          : order
      ),
    }));
  },
  
  updateOrder: (orderId: string, updates: Partial<Order>) => {
    set(state => ({
      orders: state.orders.map(order =>
        order.id === orderId
          ? { ...order, ...updates }
          : order
      ),
    }));
  },
}));

