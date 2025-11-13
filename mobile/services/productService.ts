/**
 * Product Service
 * 封裝所有商品相關的 API 呼叫
 */

import { ApiClient } from "@/lib/apiClient";
import type {
  CreateProductRequest,
  Product,
  UpdateProductRequest,
} from "@/types/product";

// 建立 Product API Client 實例
const productApi = new ApiClient(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/product-operations`
);

// ==================== Product Queries ====================

/**
 * 查詢團隊的商品列表
 *
 * Backend: GET /product-operations?action=list&team_id={team_id}
 */
export async function getProducts(
  teamId: string,
  options?: {
    category?: string;
    search?: string;
    availableOnly?: boolean;
  }
): Promise<Product[]> {
  const params: Record<string, string> = {
    team_id: teamId,
  };

  if (options?.category) {
    params.category = options.category;
  }

  if (options?.search) {
    params.search = options.search;
  }

  if (options?.availableOnly) {
    params.available_only = "true";
  }

  const { products } = await productApi.call<{ products: Product[] }>(
    "GET",
    "list",
    params
  );

  return products;
}

/**
 * 查詢單一商品詳情
 *
 * Backend: GET /product-operations?action=detail&product_id={product_id}
 */
export async function getProduct(productId: string): Promise<Product> {
  const { product } = await productApi.call<{ product: Product }>(
    "GET",
    "detail",
    { product_id: productId }
  );

  return product;
}

// ==================== Product Mutations ====================

/**
 * 創建新商品
 *
 * Backend: POST /product-operations?action=create
 */
export async function createProduct(
  data: CreateProductRequest
): Promise<Product> {
  const { product } = await productApi.call<{ product: Product }>(
    "POST",
    "create",
    undefined,
    data
  );

  return product;
}

/**
 * 更新商品資訊
 *
 * Backend: PUT /product-operations?action=update
 */
export async function updateProduct(
  productId: string,
  data: UpdateProductRequest
): Promise<Product> {
  const { product } = await productApi.call<{ product: Product }>(
    "PUT",
    "update",
    undefined,
    {
      product_id: productId,
      ...data,
    }
  );

  return product;
}

/**
 * 刪除商品
 *
 * Backend: DELETE /product-operations?action=delete&product_id={product_id}
 */
export async function deleteProduct(productId: string): Promise<void> {
  await productApi.call<{ success: true; message: string }>("DELETE", "", {
    product_id: productId,
  });
}

/**
 * 切換商品可用狀態
 *
 * Backend: PUT /product-operations?action=toggle-availability
 */
export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<Product> {
  const { product } = await productApi.call<{ product: Product }>(
    "PUT",
    "toggle-availability",
    undefined,
    {
      product_id: productId,
      is_available: isAvailable,
    }
  );

  return product;
}

// ==================== Helper Functions ====================

/**
 * 從商品列表中提取常用分類
 *
 * @param teamId - 團隊 ID
 * @returns 去重後的分類列表
 */
export async function getProductCategories(teamId: string): Promise<string[]> {
  const products = await getProducts(teamId);

  // 提取所有分類並去重
  const categories = products
    .map((p) => p.category)
    .filter((c): c is string => !!c && c !== "未分類") // 過濾空值和預設值
    .filter((c, index, self) => self.indexOf(c) === index); // 去重

  return categories;
}
