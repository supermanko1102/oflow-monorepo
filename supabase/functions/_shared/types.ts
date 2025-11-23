// 共用的 TypeScript 介面定義

// 對話歷史訊息介面
export interface ConversationMessage {
  role: "customer" | "ai";
  message: string;
}

// AI 解析結果介面
export interface AIParseResult {
  intent: "order" | "inquiry" | "other";
  confidence: number;
  is_continuation: boolean; // 是否延續之前的對話
  is_complete: boolean; // 資訊是否完整可建單
  stage?: "inquiry" | "ordering" | "delivery" | "contact" | "done"; // 甜點 4 階段（附上完成態）
  order?: {
    customer_name?: string;
    customer_phone?: string;
    items: Array<{
      name: string;
      quantity: number;
      price?: number; // 商品價格（從商品資料庫自動填入）
      notes?: string;
    }>;
    delivery_date?: string; // YYYY-MM-DD (通用：交付/預約日期)
    delivery_time?: string; // HH:MM (通用：交付/預約時間)
    delivery_method?: "pickup" | "convenience_store" | "black_cat" | "onsite";
    pickup_type?: "store" | "meetup";
    pickup_location?: string;

    // 商品型專屬
    requires_frozen?: boolean;
    store_info?: string;
    shipping_address?: string;
    customer_notes?: string;

    // 服務型專屬
    service_duration?: number;
    service_notes?: string;

    total_amount?: number;

    // 向後兼容
    pickup_date?: string;
    pickup_time?: string;
  };
  missing_fields?: string[]; // 缺少的欄位
  suggested_reply?: string; // 建議的回覆訊息
  raw_response?: string;
}

// 商品介面
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  description?: string;
}

// 團隊上下文
export interface TeamContext {
  team_id: string;
  name: string;
  business_type: string;
}
