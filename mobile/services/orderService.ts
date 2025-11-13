/**
 * Order Operations Service
 * 封裝所有訂單相關的 API 呼叫
 *
 * 使用統一的 ApiClient，消除重複程式碼
 */

import { ApiClient } from "@/lib/apiClient";
import type {
  Order,
  OrderFilters,
  UpdateOrderParams,
  UpdateOrderStatusParams,
} from "@/types/order";

// 建立 Order API Client 實例
const orderApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/order-operations`
);

// ==================== Order Queries ====================

/**
 * 查詢團隊的訂單列表
 */
export async function getOrders(
  teamId: string,
  filters?: OrderFilters
): Promise<Order[]> {
  const params: Record<string, string> = {
    team_id: teamId,
  };

  if (filters?.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters?.dateFrom) {
    params.date_from = filters.dateFrom;
  }
  if (filters?.dateTo) {
    params.date_to = filters.dateTo;
  }
  if (filters?.search) {
    params.search = filters.search;
  }

  const { orders } = await orderApi.call<{ orders: Order[] }>(
    "GET",
    "list",
    params
  );
  return orders;
}

/**
 * 查詢單一訂單詳情
 */
export async function getOrderById(orderId: string): Promise<Order> {
  const { order } = await orderApi.call<{ order: Order }>("GET", "detail", {
    order_id: orderId,
  });
  return order;
}

// ==================== Order Mutations ====================

/**
 * 更新訂單狀態
 */
export async function updateOrderStatus(
  params: UpdateOrderStatusParams
): Promise<void> {
  await orderApi.call<{ message: string }>(
    "POST",
    "update-status",
    undefined,
    params
  );
}

/**
 * 更新訂單資料
 */
export async function updateOrder(params: UpdateOrderParams): Promise<void> {
  await orderApi.call<{ message: string }>("POST", "update", undefined, params);
}

/**
 * 確認收款
 */
export async function confirmPayment(
  orderId: string,
  paymentMethod: "cash" | "transfer" | "other"
): Promise<void> {
  await orderApi.call<{ message: string }>(
    "POST",
    "confirm-payment",
    undefined,
    {
      order_id: orderId,
      payment_method: paymentMethod,
    }
  );
}
