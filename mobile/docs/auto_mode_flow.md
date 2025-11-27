# 自動模式與半自動模式流程說明

以下分別說明 auto 模式（`auto_mode = true`）與半自動模式（`auto_mode = false`）下，從收到 LINE 訊息到建單/不建單的流程與關鍵節點。

## 共通前置：訊息入口與資料更新
- 入口檔：`supabase/functions/line-webhook/index.ts`
- 主要步驟：
  1. 接收 LINE 文字訊息（忽略非文字）。
  2. 取得 `team`（含 `auto_mode`）與 LINE Profile。
  3. 儲存訊息到 `line_messages`（`saveIncomingMessage`）。
  4. 取得/建立對話 `ensureConversation`，同步顯示名稱 `ensureConversationDisplayName`。
  5. 更新訊息關聯到對話 `updateMessageConversation`。
  6. 呼叫 AI 解析 `callAIParser`，並以 `mergeCollectedData` 更新 `conversations.collected_data` / `missing_fields`。

## Auto 模式（auto_mode = true）
- 判斷條件：`intent === "order"` 且 `is_complete === true`
- 動作：
  1. `createOrderFromAIResult` → RPC `create_order_from_ai` 建立訂單。
  2. `complete_conversation` 標記對話完成（`completed`）並寫入 `order_id`。
  3. 回覆客戶確認訊息（含訂單編號、日期時間、金額），並寫入 `line_messages`（role = "ai"）。
- 資料不完整或非訂單：
  - 使用 `suggested_reply`（或預設「已收到…」）回覆客戶，不建單，持續累積缺漏。

## 半自動模式（auto_mode = false）
- 仍會解析並更新 `collected_data` / `missing_fields`，但不自動回覆客戶。
- 觸發條件：訊息來自「商家」且包含確認關鍵字（預設 `ok`/`確認`/`訂單成立`/`建單` 等）。
  - 商家判定：team_members 中 owner/admin 或 can_manage_orders 的成員，其 `users.line_user_id` 會被視為商家。
- 建單條件：商家觸發且 `intent === "order"` 且 `is_complete === true`
  1. `createOrderFromAIResult` → RPC `create_order_from_ai` 建立訂單。
  2. `complete_conversation` 標記完成並寫入 `order_id`。
  3. 寫一筆系統訊息「系統已依商家確認建單」（不回覆客戶）。
- 若商家觸發但資料不完整：不建單，維持缺漏待補（可在 Inbox 提示商家）。

## 前端資料與同步
- 列表 API：`conversation-operations?action=list` → `useConversations`（含 `lastMessage`、`order_number`）。
- 詳情 API：`conversation-operations?action=detail` → `useConversationDetail`。
- Realtime：`useConversationsRealtime` 監聽 `conversations`，事件發生時 debounce invalidate cache，Inbox 自動更新。

## 手動建單路徑（補充）
- Inbox 例外卡片/詳情/表單 → `useConfirmConversation` → `conversation-operations?action=confirm` → RPC `create_order_from_ai` + `complete_conversation`。

## 關鍵檔案一覽
- Webhook / 模式判斷：`supabase/functions/line-webhook/index.ts`
- 對話 API：`supabase/functions/conversation-operations/index.ts`
- Hooks：`mobile/hooks/queries/useConversations.ts`, `mobile/hooks/queries/useTeams.ts`
- Inbox UI：`mobile/app/(main)/(tabs)/inbox.tsx`
