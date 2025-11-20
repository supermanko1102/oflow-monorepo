/**
 * Customers Query Hooks
 *
 * 使用 React Query 管理所有顧客相關的 server state
 */

import { queryKeys } from "@/hooks/queries/queryKeys";
import * as customerService from "@/services/customerService";
import type { CustomerFilters } from "@/types/customer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ==================== Queries ====================

/**
 * 查詢團隊的顧客列表
 *
 * @param teamId - 團隊 ID
 * @param filters - 篩選條件（搜尋、標籤、排序）
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * Cache 策略：
 * - staleTime: 2 分鐘（顧客資料變動頻率較低）
 */
export function useCustomers(
  teamId: string | null,
  filters?: CustomerFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.customers.list(teamId || "", filters),
    queryFn: () => {
      if (!teamId) {
        throw new Error("Team ID is required");
      }
      return customerService.getCustomers(teamId, filters);
    },
    enabled: enabled && !!teamId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  });
}

/**
 * 查詢單一顧客詳情
 *
 * @param customerId - 顧客 ID
 * @param enabled - 是否啟用查詢（預設為 true）
 *
 * Cache 策略：
 * - staleTime: 3 分鐘（詳情頁較少變動）
 */
export function useCustomerDetail(
  customerId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId || ""),
    queryFn: () => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }
      return customerService.getCustomerById(customerId);
    },
    enabled: enabled && !!customerId,
    staleTime: 3 * 60 * 1000, // 3 分鐘
  });
}

// ==================== Mutations ====================

/**
 * 建立顧客
 *
 * 成功後：
 * - 自動 invalidate 顧客列表
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerService.createCustomer,
    onSuccess: () => {
      // 重新載入所有顧客列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
    },
  });
}

/**
 * 更新顧客資料
 *
 * 成功後：
 * - 自動 invalidate 該顧客的詳情
 * - 自動 invalidate 顧客列表
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      updates,
    }: {
      customerId: string;
      updates: {
        name?: string;
        phone?: string;
        email?: string;
        notes?: string;
        tags?: string[];
      };
    }) => customerService.updateCustomer(customerId, updates),
    onSuccess: (_, variables) => {
      // 重新載入該顧客詳情
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      });

      // 重新載入所有顧客列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
    },
  });
}

/**
 * 刪除顧客
 *
 * 成功後：
 * - 自動 invalidate 顧客列表
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerService.deleteCustomer,
    onSuccess: () => {
      // 重新載入所有顧客列表
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
    },
  });
}

/**
 * 新增標籤
 *
 * 成功後：
 * - 自動 invalidate 該顧客的詳情
 * - 自動 invalidate 顧客列表
 */
export function useAddCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, tag }: { customerId: string; tag: string }) =>
      customerService.addCustomerTag(customerId, tag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
    },
  });
}

/**
 * 移除標籤
 *
 * 成功後：
 * - 自動 invalidate 該顧客的詳情
 * - 自動 invalidate 顧客列表
 */
export function useRemoveCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, tag }: { customerId: string; tag: string }) =>
      customerService.removeCustomerTag(customerId, tag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
    },
  });
}
