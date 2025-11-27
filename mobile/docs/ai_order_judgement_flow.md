# AI 判斷訂單流程

本文聚焦 AI 在 LINE Webhook 中判斷並建立訂單的邏輯，涵蓋自動模式與半自動模式的分支與關鍵條件。

## 入口與共用步驟
1. 收到 LINE 文字訊息（忽略非文字）。
2. 取得 team（含 `auto_mode`）與 LINE Profile。
3. 儲存訊息至 `line_messages`（`saveIncomingMessage`）。
4. 取得/建立對話 `ensureConversation`，同步顯示名稱 `ensureConversationDisplayName`。
5. 更新訊息關聯 `updateMessageConversation`。
6. 取得近期對話紀錄 `fetchConversationHistory`（預設 15 則）。
7. 呼叫 AI 解析 `callAIParser`：
   - 回傳：`intent`、`order`、`is_complete`、`suggested_reply` 等。
8. 合併解析結果 `mergeCollectedData` → 更新 `conversations.collected_data` 與 `missing_fields`（`updateConversationData`）。

## 自動模式（auto_mode = true）
判斷條件：
- `intent === "order"` 且 `is_complete === true` 且 `aiResult.order` 存在。

動作：
1. 呼叫 `createOrderFromAIResult`（RPC `create_order_from_ai`）建立訂單。
2. 呼叫 `complete_conversation` 標記對話完成並寫入 `order_id`。
3. 回覆客戶確認訊息（含訂單編號、日期時間、金額），並寫入 `line_messages`（role = "ai"）。

資料不完整 / 非訂單：
- 使用 `suggested_reply`（若無則預設「已收到…」）回覆客戶，不建單，持續累積缺漏。

## 半自動模式（auto_mode = false）
解析與資料合併照常進行，但不自動回覆客戶。建單觸發改由「商家關鍵字 + 完整資料」：

1. 商家判定：team_members 中 owner/admin 或 can_manage_orders 成員的 `users.line_user_id`。
2. 觸發關鍵字：預設 `ok`/`確認`/`訂單成立`/`建單`/`開單` 等（見 `MERCHANT_CONFIRM_KEYWORDS`）。
3. 建單條件：商家訊息 + 觸發關鍵字 + `intent === "order"` + `is_complete === true` + `aiResult.order`。
   - 若成立：
     - `createOrderFromAIResult` 建單 → `complete_conversation` 完成對話。
     - 寫一筆系統訊息「系統已依商家確認建單」（不回覆客戶）。
   - 若缺資料：不建單，留待商家/系統補齊。

## 手動建單（補充）
- Inbox 例外卡片/詳情/表單 → `useConfirmConversation` → `conversation-operations?action=confirm` → RPC `create_order_from_ai` + `complete_conversation`。

## 主要程式碼位置
- Webhook + AI 流程：`supabase/functions/line-webhook/index.ts`
- 對話 API：`supabase/functions/conversation-operations/index.ts`
- 前端 hooks/UI：`mobile/hooks/queries/useConversations.ts`, `mobile/app/(main)/(tabs)/inbox.tsx`
