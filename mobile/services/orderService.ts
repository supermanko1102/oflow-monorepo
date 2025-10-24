/**
 * Order Operations Service
 * 封裝所有訂單相關的 Edge Function API 呼叫
 */

import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import { Order } from "@/types/order";

/**
 * 動態取得 Order Operations Edge Function URL
 * 確保使用與 Supabase client 相同的設定
 */
function getOrderOperationsUrl(): string {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured in app.config.js");
  }
  return `${supabaseUrl}/functions/v1/order-operations`;
}

/**
 * 訂單查詢篩選條件
 */
export interface OrderFilters {
  status?: 'all' | 'pending' | 'completed' | 'cancelled';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  search?: string;
}

/**
 * 訂單狀態更新參數
 */
export interface UpdateOrderStatusParams {
  order_id: string;
  status: 'pending' | 'completed' | 'cancelled';
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
 * 取得使用者的 access token
 */
async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("未登入或 session 已過期");
  }

  return session.access_token;
}

/**
 * 呼叫 Order Operations API
 */
async function callOrderAPI<T>(
  method: "GET" | "POST",
  action: string,
  params?: Record<string, string>,
  body?: any
): Promise<T> {
  try {
    const accessToken = await getAccessToken();
    
    // 動態取得 Edge Function URL
    const baseUrl = getOrderOperationsUrl();

    // 建立 URL
    const url = new URL(baseUrl);
    url.searchParams.set("action", action);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    console.log(`[Order Service] ${method} ${action}`, {
      url: url.toString(),
      params: params || {},
      body: body || {},
    });

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 檢查 HTTP status
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Order Service] HTTP ${response.status}:`, errorText);
      throw new Error(
        `API 請求失敗 (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "API 呼叫失敗");
    }

    console.log(`[Order Service] ${method} ${action} 成功`);
    return data;
  } catch (error) {
    // 加強錯誤訊息
    if (error instanceof TypeError && error.message === "Network request failed") {
      console.error("[Order Service] Network 錯誤 - 可能原因:");
      console.error("  1. Edge Function 尚未部署");
      console.error("  2. Supabase URL 設定錯誤");
      console.error("  3. 網路連線問題");
      console.error("  4. CORS 設定問題");
      throw new Error(
        "無法連線到伺服器，請檢查網路連線或聯絡管理員"
      );
    }
    throw error;
  }
}

/**
 * 查詢團隊的訂單列表
 */
export async function getOrders(
  teamId: string,
  filters?: OrderFilters
): Promise<Order[]> {
  try {
    const params: Record<string, string> = {
      team_id: teamId,
    };

    if (filters?.status && filters.status !== 'all') {
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

    const response = await callOrderAPI<{ orders: Order[] }>(
      "GET",
      "list",
      params
    );
    return response.orders;
  } catch (error) {
    console.error("[Order Service] 查詢訂單失敗:", error);
    throw error;
  }
}

/**
 * 查詢單一訂單詳情
 */
export async function getOrderById(orderId: string): Promise<Order> {
  try {
    const response = await callOrderAPI<{ order: Order }>(
      "GET",
      "detail",
      { order_id: orderId }
    );
    return response.order;
  } catch (error) {
    console.error("[Order Service] 查詢訂單詳情失敗:", error);
    throw error;
  }
}

/**
 * 更新訂單狀態
 */
export async function updateOrderStatus(
  params: UpdateOrderStatusParams
): Promise<void> {
  try {
    await callOrderAPI<{ message: string }>(
      "POST",
      "update-status",
      undefined,
      params
    );
  } catch (error) {
    console.error("[Order Service] 更新訂單狀態失敗:", error);
    throw error;
  }
}

/**
 * 更新訂單資料
 */
export async function updateOrder(params: UpdateOrderParams): Promise<void> {
  try {
    await callOrderAPI<{ message: string }>(
      "POST",
      "update",
      undefined,
      params
    );
  } catch (error) {
    console.error("[Order Service] 更新訂單失敗:", error);
    throw error;
  }
}

