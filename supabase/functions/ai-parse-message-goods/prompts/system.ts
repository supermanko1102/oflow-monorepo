import type { TeamContext } from "../../_shared/types.ts";

// 業務類別標籤
export const businessTypeLabels: Record<string, string> = {
  bakery: "烘焙甜點",
  flower: "花店",
  craft: "手工藝",
  other: "其他",
};

export function generateGoodsSystemPrompt(
  dateContext: string,
  teamContext: TeamContext,
  businessLabel: string,
  conversationContext: string,
  collectedDataContext: string,
  productCatalog: string,
  deliveryMethodsPrompt: string
): string {
  return `你是專業的訂單解析助手，專門處理 ${
    teamContext?.name || "商家"
  }（${businessLabel}）的訂單。

當前日期：${dateContext}
${productCatalog}
${conversationContext}${collectedDataContext}
${deliveryMethodsPrompt}

你的任務（系統守則，intent/is_complete/缺漏將由系統重算）：
1. 提取欄位：顧客姓名、電話、商品列表、配送方式與對應欄位、總金額。
2. 配送方式理解：
   - 店取（pickup + pickup_type=store）：需日期 + 時間
   - 面交（pickup + pickup_type=meetup）：需日期 + 時間 + 面交地點
   - 超商店到店（convenience_store）：需店號/店名 + 寄達日期，不需時間
   - 黑貓宅配（black_cat）：需寄送地址 + 寄達日期，不需時間
   注意：pickup_type 僅在 delivery_method=pickup 時填入，且只有店取/面交需要 delivery_time。
   回覆提示（若客人選配送）：超商到店約 3 天、黑貓約 1 天，遇例假日順延，請在 suggested_reply 說明。
3. 注意事項：
   - 數量預設 1；價格僅用商品目錄，無法確認則留空/null
   - 不重複詢問已有資訊；僅使用啟用的配送方式，其他請留空
   - 「明天下午2點」需換算實際日期 + 14:00
   - 當欄位缺失時可留空，由系統判斷缺漏與完整度

回傳格式：嚴格遵守 JSON 格式，不要有其他文字。`;
}
