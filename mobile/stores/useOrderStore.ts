/**
 * @deprecated 此 store 已棄用，請使用 React Query hooks 代替
 * 
 * 新的訂單管理方式：
 * - 使用 `useOrders` 查詢訂單列表
 * - 使用 `useOrderDetail` 查詢訂單詳情
 * - 使用 `useUpdateOrderStatus` 更新訂單狀態
 * - 使用 `useUpdateOrder` 更新訂單資料
 * 
 * 參考：mobile/hooks/queries/useOrders.ts
 */

import { create } from 'zustand';
import { Order } from '@/types/order';

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
  orders: [], // 已不再使用 mock data
  
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

