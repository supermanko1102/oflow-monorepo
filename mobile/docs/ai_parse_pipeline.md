# AI 訂單解析管線說明

本文整理 AI 在 LINE Webhook 中判斷與解析訂單的流程與組件。

## 主要入口
- 檔案：`supabase/functions/line-webhook/index.ts`
- 入口函式：`callAIParser(message, team, history, collectedData)`
  - 依 `team.business_type` 選擇 function：`ai-parse-message-services` 或 `ai-parse-message-goods`
  - 請求內容：
    - `message`: 本次訊息
    - `team_context`: 團隊資料（含 business_type、auto_mode 等）
    - `conversation_history`: 近期對話紀錄（預設 15 則）
    - `collected_data`: 已累積的對話資料
  - 回傳型別 `AIParseResult`（含 `intent`, `order`, `is_complete`, `missing_fields`, `suggested_reply` 等）

## 資料合併
- 函式：`mergeCollectedData(current, aiResult)`
  - 合併順序：`current` → `aiResult.order`
  - 回傳：`collected`（新的資料）與 `missing`（缺漏欄位，源自 AI `missing_fields`）
- 函式：`updateConversationData`
  - RPC：`update_conversation_data`
  - 更新 `conversations.collected_data` 與 `missing_fields`

## 建單邏輯（與 AI 解析結果的關聯）
- 判斷核心：`intent === "order"`, `is_complete === true`, `aiResult.order` 存在。
- 自動模式 (`auto_mode = true`)：
  - 條件成立 → `createOrderFromAIResult`（RPC `create_order_from_ai`）→ `complete_conversation` → 回覆客戶確認訊息。
  - 不完整 → 回覆 `suggested_reply`（或預設文案），不建單。
- 半自動模式 (`auto_mode = false`)：
  - 仍執行 AI 解析與資料合併，但不回覆客戶。
  - 需商家訊息 + 關鍵字（`MERCHANT_CONFIRM_KEYWORDS`）+ 條件成立 (`intent === "order" && is_complete && aiResult.order`) 才建單；否則不建單。

## 相關常數與判斷
- Service vs Goods：`isServiceBasedBusiness(team.business_type)` 決定呼叫的 AI function。
- 關鍵字：
  - `ORDER_CONFIRMATION_KEYWORDS`：客戶端確認用（原本自動模式回覆邏輯）。
  - `MERCHANT_CONFIRM_KEYWORDS`：半自動模式商家觸發建單用。
- 商家身份：`fetchMerchantLineUserIds` 取出 owner/admin 或 `can_manage_orders` 的 `line_user_id`。

## 延伸檔案
- Edge function API（解析器）：`supabase/functions/v1/ai-parse-message-services` / `ai-parse-message-goods`（外部函式，這裡只呼叫）
- 建單 RPC：`create_order_from_ai`（DB 端）
- 對話資料更新 RPC：`update_conversation_data`

## 行為差異總結
- AI 解析/合併：自動、半自動皆執行。
- 建單＆回覆：
  - 自動：AI 判斷完整→建單＋回覆；不完整→回覆建議、不建單。
  - 半自動：商家關鍵字＋完整→建單（不回覆客戶）；其餘不建單、不回覆。 
