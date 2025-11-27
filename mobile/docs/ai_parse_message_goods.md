# `ai-parse-message-goods` 說明（商品型業務解析器）

此 Edge Function 專門處理商品型業務（烘焙、花店、手工藝等）的 LINE 訊息解析，產出 AIParseResult（intent/order/is_complete/missing_fields/suggested_reply）。

## 路徑與入口
- 檔案：`supabase/functions/ai-parse-message-goods/index.ts`
- 呼叫方式：POST `/functions/v1/ai-parse-message-goods`
- 請求參數：
  - `message`: 客戶新訊息（必填）
  - `team_context`: 團隊資料（含 team_id、name、business_type、auto_mode 等）
  - `conversation_history`: 對話歷史（預設取 15 則）
  - `collected_data`: 已累積資料（對話收斂過程中）

## 主要步驟
1) 讀取團隊商品：`fetchTeamProducts(team_id)` → `generateProductCatalog`  
2) 讀取配送設定：`fetchTeamDeliverySettings(team_id)` → `generateDeliveryMethodsPrompt`  
3) 日期/上下文：`getCurrentDateContext`、`buildConversationContext`、`buildCollectedDataContext`  
4) 組 Prompt：`generateGoodsPrompt`（system） + `generateGoodsUserPrompt`（user）  
   - 目標：判斷 intent/stage、商品匹配、配送方式解析、缺漏判斷、給建議回覆  
5) 呼叫 OpenAI：`gpt-4o-mini`，`temperature=0.3`，`max_tokens=500`  
6) JSON 解析與校正：補齊欄位預設值、依缺漏推斷 stage（`inferStageFromResult`）  
7) 配送限制：`enforceAllowedDeliveryMethod` 清除未啟用的配送方式並更新 missing/suggested_reply  
8) 完整性強制：有商品且 `missing_fields` 為空 → `is_complete=true`、`intent=order`、`stage=done`  

## 完整度判斷（依配送方式）
- 店取：items + delivery_method=pickup + pickup_type=store + delivery_date + delivery_time
- 面交：items + delivery_method=pickup + pickup_type=meetup + pickup_location + delivery_date + delivery_time
- 超商：items + delivery_method=convenience_store + store_info（時間不必填）
- 宅配：items + delivery_method=black_cat + shipping_address（時間不必填）

## 常數/關鍵字
- 業務標籤：`businessTypeLabels`（bakery/flower/craft/other）
- 關鍵場景指引：商品推薦、配送方式解析、缺漏詢問策略、禁止未啟用配送方式

## 回傳結構（AIParseResult）
```json
{
  "intent": "order|inquiry|other",
  "stage": "inquiry|ordering|delivery|contact|done",
  "confidence": number,
  "is_continuation": boolean,
  "is_complete": boolean,
  "order": {
    "customer_name": string,
    "customer_phone": string,
    "items": [{ "name": string, "quantity": number, "price": number|null, "notes": string }],
    "delivery_date": "YYYY-MM-DD",
    "delivery_time": "HH:MM",
    "delivery_method": "pickup|convenience_store|black_cat",
    "pickup_type": "store|meetup",
    "pickup_location": string,
    "requires_frozen": boolean,
    "store_info": string,
    "shipping_address": string,
    "total_amount": number
  },
  "missing_fields": [ ... ],
  "suggested_reply": string,
  "raw_response": string
}
```

## 相關依賴
- 商品：`../_shared/product-fetcher.ts`
- 配送：`../_shared/delivery-settings-fetcher.ts`
- 日期/上下文：`../_shared/date-utils.ts`
- 型別：`../_shared/types.ts`

## 常見調整點
- Prompt 文案（`generateGoodsPrompt` / `generateGoodsUserPrompt`）  
- 模型/溫度/token 上限  
- 完整度判斷與缺漏欄位  
- 配送限制策略（允許/禁止未啟用方式）  
- 建議回覆語氣與內容  
