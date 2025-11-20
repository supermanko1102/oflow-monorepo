/**
 * Customer Service
 * 封裝顧客管理相關的 API 呼叫
 */

import { ApiClient } from "@/lib/apiClient";
import type { Customer, CustomerFilters } from "@/types/customer";

// 建立 Customer API Client 實例
const customerApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/customer-operations`
);

/**
 * 查詢顧客列表
 *
 * @param teamId - 團隊 ID
 * @param filters - 篩選條件（搜尋、標籤、排序）
 * @returns 顧客列表
 */
export async function getCustomers(
  teamId: string,
  filters?: CustomerFilters
): Promise<Customer[]> {
  const params: Record<string, string> = {
    team_id: teamId,
  };

  if (filters?.search) {
    params.search = filters.search;
  }

  if (filters?.tag) {
    params.tag = filters.tag;
  }

  if (filters?.sortBy) {
    params.sort_by = filters.sortBy;
  }

  if (filters?.sortOrder) {
    params.sort_order = filters.sortOrder;
  }

  const response = await customerApi.call<{
    success: boolean;
    customers: Customer[];
  }>("GET", "list", params);

  return response.customers;
}

/**
 * 查詢單一顧客詳情
 *
 * @param customerId - 顧客 ID
 * @returns 顧客詳情（含最近訂單）
 */
export async function getCustomerById(customerId: string): Promise<{
  customer: Customer;
  recentOrders: any[];
}> {
  const response = await customerApi.call<{
    success: boolean;
    customer: Customer;
    recentOrders: any[];
  }>("GET", "detail", {
    customer_id: customerId,
  });

  return {
    customer: response.customer,
    recentOrders: response.recentOrders,
  };
}

/**
 * 建立顧客
 *
 * @param data - 顧客資料
 * @returns 新建立的顧客
 */
export async function createCustomer(data: {
  team_id: string;
  name: string;
  phone?: string;
  email?: string;
  line_user_id?: string;
  notes?: string;
  tags?: string[];
}): Promise<Customer> {
  const response = await customerApi.call<{
    success: boolean;
    customer: Customer;
  }>("POST", "create", undefined, data);

  return response.customer;
}

/**
 * 更新顧客資料
 *
 * @param customerId - 顧客 ID
 * @param updates - 要更新的欄位
 */
export async function updateCustomer(
  customerId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<void> {
  await customerApi.call<{ success: boolean }>("PUT", "update", undefined, {
    customer_id: customerId,
    ...updates,
  });
}

/**
 * 刪除顧客
 *
 * @param customerId - 顧客 ID
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await customerApi.call<{ success: boolean }>("DELETE", "delete", {
    customer_id: customerId,
  });
}

/**
 * 新增標籤
 *
 * @param customerId - 顧客 ID
 * @param tag - 標籤名稱
 * @returns 更新後的標籤列表
 */
export async function addCustomerTag(
  customerId: string,
  tag: string
): Promise<string[]> {
  const response = await customerApi.call<{
    success: boolean;
    tags: string[];
  }>("POST", "add-tag", undefined, {
    customer_id: customerId,
    tag,
  });

  return response.tags;
}

/**
 * 移除標籤
 *
 * @param customerId - 顧客 ID
 * @param tag - 標籤名稱
 * @returns 更新後的標籤列表
 */
export async function removeCustomerTag(
  customerId: string,
  tag: string
): Promise<string[]> {
  const response = await customerApi.call<{
    success: boolean;
    tags: string[];
  }>("POST", "remove-tag", undefined, {
    customer_id: customerId,
    tag,
  });

  return response.tags;
}
