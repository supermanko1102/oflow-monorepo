/**
 * Products React Query Hooks
 */

import {
  createProduct,
  deleteProduct,
  getProductCategories,
  getProducts,
  toggleProductAvailability,
  updateProduct,
} from "@/services/productService";
import type {
  CreateProductRequest,
  UpdateProductRequest,
} from "@/types/product";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

// ==================== Queries ====================

/**
 * 查詢團隊商品列表
 */
export function useProducts(teamId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.products.list(teamId || ""),
    queryFn: () => getProducts(teamId!),
    enabled: enabled && !!teamId,
    staleTime: 1000 * 60 * 5, // 5 分鐘
  });
}

/**
 * 查詢團隊商品的常用分類
 */
export function useProductCategories(
  teamId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.products.categories(teamId || ""),
    queryFn: () => getProductCategories(teamId!),
    enabled: enabled && !!teamId,
    staleTime: 1000 * 60 * 10, // 10 分鐘
  });
}

/**
 * 查詢單一商品詳情
 */
export function useProduct(productId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId || ""),
    queryFn: () => getProducts(productId!),
    enabled: enabled && !!productId,
  });
}

// ==================== Mutations ====================

/**
 * 創建商品
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductRequest) => createProduct(data),
    onSuccess: (newProduct) => {
      // 更新商品列表 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.list(newProduct.team_id),
      });
    },
  });
}

/**
 * 更新商品
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: UpdateProductRequest;
    }) => updateProduct(productId, data),
    onSuccess: (updatedProduct) => {
      // 更新商品列表 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.list(updatedProduct.team_id),
      });
      // 更新商品詳情 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(updatedProduct.id),
      });
    },
  });
}

/**
 * 刪除商品
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      teamId,
    }: {
      productId: string;
      teamId: string;
    }) => deleteProduct(productId),
    onSuccess: (_, variables) => {
      // 更新商品列表 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.list(variables.teamId),
      });
    },
  });
}

/**
 * 切換商品可用狀態
 */
export function useToggleProductAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      isAvailable,
    }: {
      productId: string;
      isAvailable: boolean;
    }) => toggleProductAvailability(productId, isAvailable),
    onSuccess: (updatedProduct) => {
      // 更新商品列表 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.list(updatedProduct.team_id),
      });
      // 更新商品詳情 cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(updatedProduct.id),
      });
    },
  });
}
