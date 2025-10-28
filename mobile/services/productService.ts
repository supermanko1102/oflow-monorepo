/**
 * Product Service
 * 封裝所有商品相關的 API 呼叫
 *
 * 注意：此服務需要後端實作以下 Edge Function endpoints
 */

import type {
  CreateProductRequest,
  Product,
  UpdateProductRequest,
} from "@/types/product";

// 建立 Product API Client 實例
// TODO: 需要在 config.ts 中添加 productOperations endpoint
// const productApi = new ApiClient(config.api.productOperations);

// ==================== Product Queries ====================

/**
 * 查詢團隊的商品列表
 *
 * Backend: GET /products?team_id={team_id}
 */
export async function getProducts(teamId: string): Promise<Product[]> {
  // TODO: 實作後端 API
  // const { products } = await productApi.call<{ products: Product[] }>(
  //   "GET",
  //   "list",
  //   { team_id: teamId }
  // );
  // return products;

  // 暫時返回空陣列（開發階段）
  console.warn("⚠️ getProducts: 需要實作後端 API");
  return [];
}

/**
 * 查詢單一商品詳情
 *
 * Backend: GET /products/{id}
 */
export async function getProduct(productId: string): Promise<Product> {
  // TODO: 實作後端 API
  // return await productApi.call<Product>("GET", productId);

  throw new Error("getProduct: 需要實作後端 API");
}

// ==================== Product Mutations ====================

/**
 * 創建新商品
 *
 * Backend: POST /products
 */
export async function createProduct(
  data: CreateProductRequest
): Promise<Product> {
  // TODO: 實作後端 API
  // return await productApi.call<Product>("POST", "", undefined, data);

  throw new Error("createProduct: 需要實作後端 API");
}

/**
 * 更新商品資訊
 *
 * Backend: PATCH /products/{id}
 */
export async function updateProduct(
  productId: string,
  data: UpdateProductRequest
): Promise<Product> {
  // TODO: 實作後端 API
  // return await productApi.call<Product>("PATCH", productId, undefined, data);

  throw new Error("updateProduct: 需要實作後端 API");
}

/**
 * 刪除商品
 *
 * Backend: DELETE /products/{id}
 */
export async function deleteProduct(productId: string): Promise<void> {
  // TODO: 實作後端 API
  // await productApi.call<void>("DELETE", productId);

  throw new Error("deleteProduct: 需要實作後端 API");
}

/**
 * 切換商品可用狀態
 *
 * Backend: PATCH /products/{id}
 */
export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<Product> {
  // TODO: 實作後端 API
  // return await productApi.call<Product>("PATCH", productId, undefined, {
  //   is_available: isAvailable,
  // });

  throw new Error("toggleProductAvailability: 需要實作後端 API");
}
