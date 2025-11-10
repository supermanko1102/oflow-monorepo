// 商品/服務查詢邏輯
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { Product } from "./types.ts";

// 查詢團隊的上架商品/服務
export async function fetchTeamProducts(teamId: string): Promise<Product[]> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[Product Fetcher] Supabase credentials not configured, skipping product fetch"
    );
    return [];
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, category, unit, description")
      .eq("team_id", teamId)
      .eq("is_available", true) // 只查詢上架商品
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Product Fetcher] 查詢商品失敗:", error);
      return [];
    }

    return products || [];
  } catch (error) {
    console.error("[Product Fetcher] 查詢商品異常:", error);
    return [];
  }
}

// 生成商品目錄字串（供 AI 參考）
export function generateProductCatalog(products: Product[]): string {
  if (!products || products.length === 0) {
    return `
**【重要】商品目錄尚未建立**

商家目前尚未設定商品目錄。請遵循以下規則：

1. **當客人詢問「有什麼」「菜單」「價目表」時**：
   回覆：「您好！請問需要什麼商品呢？歡迎直接告訴我您的需求（如商品名稱、數量、規格），我會為您確認！」

2. **當客人說要訂購某商品時**：
   記錄客人提供的商品名稱和數量，不要自行編造價格

3. **絕對不要**：
   - 推薦或列出任何不存在的商品
   - 編造商品價格
   - 假裝有商品目錄

請以友善、專業的態度引導客人描述需求。
`;
  }

  let catalog = "\n**商品/服務目錄（僅上架項目）：**\n";

  // 按分類分組
  const categorizedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // 生成目錄
  Object.entries(categorizedProducts).forEach(([category, items]) => {
    catalog += `\n【${category}】\n`;
    items.forEach((product) => {
      catalog += `  - ${product.name} $${product.price}/${product.unit}`;
      if (product.description) {
        catalog += ` (${product.description})`;
      }
      catalog += `\n`;
    });
  });

  catalog +=
    "\n**重要**：當客人提到商品名稱時，請從上方目錄找到匹配的商品，並自動填入 price 欄位。\n";

  return catalog;
}
