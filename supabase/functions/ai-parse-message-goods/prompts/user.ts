import type { AIParseResult } from "../../_shared/types.ts";

type Stage = NonNullable<AIParseResult["stage"]>;

const stageGuides: Record<Stage, string> = {
  inquiry:
    "口語友善、簡短，一次只問 1 件事。若明確拒絕/沒興趣→intent=other，禮貌收尾、不推銷；若像閒聊可 1~2 句輕鬆回覆，最多提 1~2 個熱銷項但不強推；未表態也先不問配送/聯絡。",
  ordering:
    "口語友善、拆短句，目標是商品+數量收斂：客人回「好/可以/ok」→請他選商品/口味與數量，可列 2~3 個熱銷項；客人已提商品名或問「有更多資訊嗎/多少錢」→給該商品簡短介紹與價格（不要列整份菜單），直接問數量或配送，不要再問「有興趣嗎」；若明確拒絕/沒興趣→intent=other，禮貌收尾。僅詢問配送方式起點，先不要問姓名電話。",
  delivery:
    "保持輕鬆語氣，只詢問配送/取貨欄位：店取/面交要日期+時間；超商要店號/店名+寄達日期（不需時間）、宅配要地址+寄達日期（不需時間）。不要再問商品或聯絡資料，一次問一件。",
  contact:
    "語氣輕鬆，只詢問姓名/電話/備註；缺哪問哪，不重複，也不要再問配送/商品，一次問一件。",
  done:
    "資訊齊全，語氣友善可簡短收尾，直接回傳已填好的欄位，勿再提問。",
};

// 生成商品型的 User Prompt（分階段版：呼叫端提供 stage hint）
export function generateGoodsUserPrompt(
  message: string,
  stage: AIParseResult["stage"]
): string {
  const resolvedStage: Stage = (stage as Stage) || "ordering";
  const stageGuide = stageGuides[resolvedStage] || stageGuides.ordering;
  return `請解析這個訊息（如果有對話歷史，請合併資訊）：

**客人的新訊息：** ${message}

當前建議階段：${stage}
階段指引：${stageGuide}

回傳 JSON 格式（不要有其他文字）：
{
  "intent": "order" | "inquiry" | "other",  // 盡力填，系統會重算
  "stage": "inquiry" | "ordering" | "delivery" | "contact" | "done",
  "confidence": 0.0-1.0,
  "is_continuation": true/false,
  "is_complete": true/false, // 系統會依缺漏重算
  "order": {
    "customer_name": "顧客姓名（有就填，沒有留空）",
    "customer_phone": "電話（有就填，沒有留空）",
    "items": [
      {
        "name": "商品名稱（含規格，如：巴斯克蛋糕 6吋）",
        "quantity": 數量（缺則填 1）,
        "price": 價格（僅從商品目錄填，無則留空/null）,
        "notes": "備註（如果有，如：少糖、不要堅果）"
      }
    ],
    "delivery_date": "YYYY-MM-DD（有就填，沒有留空）",
    "delivery_time": "HH:MM（僅店取/面交需要，其他留空）",
    "delivery_method": "pickup|convenience_store|black_cat（未提及留空）",
    "pickup_type": "store|meetup（僅當 delivery_method=pickup 時填）",
    "pickup_location": "取貨/面交地點（有就填，沒有留空）",
    "requires_frozen": true/false（若未提及填 false）,
    "store_info": "超商店號/店名（超商時填，否則留空）",
    "shipping_address": "寄送地址（宅配時填，否則留空）",
    "total_amount": 金額（僅目錄可算時填，否則留空）
  },
  "missing_fields": ["items", "delivery_date", "delivery_time", "delivery_method", "pickup_type", "pickup_location", "store_info", "shipping_address"] 中缺少的（超商/宅配不要把時間當成缺失，但需要寄達日期）,
  "suggested_reply": "給客人的回覆訊息"
}

說明：
- intent/is_complete/缺漏會由系統重算，你只需盡力填欄位，無資訊就留空。
- 價格請僅用商品目錄，無法確認時留空，不要編造。
- 配送方式僅填啟用的（已在系統提示中列出），未提及就留空。
- suggested_reply 依階段提示，保持簡短、禮貌，避免一次問太多；若客人選超商/宅配，請在回覆中提醒「超商到店約3天、黑貓約1天，遇例假日順延」。`;
}
