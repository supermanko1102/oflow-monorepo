# LINE 多輪對話訂單系統 - 部署指南

## 📋 功能概述

此次更新實作了 LINE 多輪對話訂單系統，主要功能：

✅ **多輪對話建單**：客人可以分多次提供訂單資訊，AI 會累積並合併資訊  
✅ **對話記錄追蹤**：完整記錄客人與 AI 的對話歷史  
✅ **智能資訊收集**：AI 判斷資訊是否完整，自動詢問缺少的欄位  
✅ **對話氣泡 UI**：APP 訂單詳情頁顯示完整對話記錄（客人藍色右側、AI 灰色左側）  
✅ **無草稿訂單**：只有資訊完整才建立訂單，不會產生未完成的草稿訂單  

---

## 🗂️ 檔案清單

### 資料庫遷移
- ✅ `supabase/migrations/009_conversations_system.sql`
  - 新增 `conversations` 表
  - 修改 `orders` 表（新增 `conversation_id`）
  - 修改 `line_messages` 表（新增 `conversation_id` 和 `role`）
  - 6 個對話管理函數

### Edge Functions
- ✅ `supabase/functions/ai-parse-message/index.ts` - 升級 AI 解析支援對話歷史
- ✅ `supabase/functions/line-webhook/index.ts` - 升級 Webhook 支援多輪對話
- ✅ `supabase/functions/order-operations/index.ts` - 升級 API 支援對話記錄查詢

### 前端
- ✅ `mobile/types/order.ts` - 新增 `LineMessage` 介面
- ✅ `mobile/app/(main)/order/[id].tsx` - 更新 UI 顯示對話氣泡

---

## 🚀 部署步驟

### 1. 部署資料庫遷移

```bash
cd supabase

# 執行遷移
npx supabase migration up

# 或手動執行（如果自動遷移失敗）
psql -U postgres -h <your-supabase-host> -d postgres -f migrations/009_conversations_system.sql
```

**驗證遷移成功：**
```sql
-- 檢查 conversations 表是否存在
SELECT * FROM conversations LIMIT 1;

-- 檢查 orders.conversation_id 欄位
SELECT conversation_id FROM orders LIMIT 1;

-- 檢查 line_messages.role 欄位
SELECT role, conversation_id FROM line_messages LIMIT 1;

-- 檢查函數是否建立
SELECT proname FROM pg_proc WHERE proname LIKE '%conversation%';
```

### 2. 重新部署 Edge Functions

```bash
cd supabase/functions

# 部署 AI 解析函數
npx supabase functions deploy ai-parse-message

# 部署 LINE Webhook
npx supabase functions deploy line-webhook

# 部署訂單操作 API
npx supabase functions deploy order-operations
```

**驗證部署成功：**
- 檢查 Supabase Dashboard → Edge Functions
- 確認三個函數都顯示為「已部署」且沒有錯誤

### 3. 前端更新

```bash
cd mobile

# 安裝依賴（如果有更新）
npm install

# 重新啟動開發伺服器
npm start
```

---

## 🧪 測試場景

### 場景 1：單次完整訂單（現有功能不變）

**測試步驟：**
1. 客人在 LINE 發送：「我要訂 6 吋巴斯克蛋糕，明天下午 2 點取」
2. AI 應回覆：「✅ 訂單已確認！訂單編號：...」
3. 商家 APP 應顯示新訂單
4. 訂單詳情應顯示 1 條對話記錄（客人的訊息）

**預期結果：**
- ✅ 訂單立即建立（狀態：pending）
- ✅ 對話狀態：completed
- ✅ APP 顯示對話氣泡

---

### 場景 2：多輪補充訂單（新功能）

**測試步驟：**
1. **第 1 輪** - 客人：「我要訂蛋糕」
2. AI 應回覆：「好的！請問要訂什麼口味、尺寸，以及取貨日期和時間？」
3. **第 2 輪** - 客人：「6 吋巴斯克」
4. AI 應回覆：「收到！6 吋巴斯克蛋糕。請問取貨日期和時間？」
5. **第 3 輪** - 客人：「明天下午 2 點」
6. AI 應回覆：「✅ 訂單已確認！...」
7. 商家 APP 查看訂單詳情

**預期結果：**
- ✅ 前 2 輪：不建立訂單，只追蹤對話
- ✅ 第 3 輪：資訊完整，建立訂單
- ✅ APP 顯示完整 6 條對話記錄（3 條客人 + 3 條 AI）
- ✅ 對話氣泡：客人右側藍色、AI 左側灰色
- ✅ 顯示時間戳記

---

### 場景 3：訂單完成後再對話（新邏輯）

**測試步驟：**
1. 商家將訂單標記為「已完成」
2. 客人再發訊息：「我還要再訂一個」
3. AI 應回覆並開始新對話

**預期結果：**
- ✅ 舊對話狀態變為 `completed`
- ✅ 新訊息建立新的對話（不影響舊訂單）
- ✅ AI 正常回覆

---

## 📊 資料庫查詢範例

### 查看對話狀態
```sql
-- 查看所有進行中的對話
SELECT 
  c.id,
  c.line_user_id,
  c.status,
  c.collected_data,
  c.missing_fields,
  c.last_message_at,
  t.name AS team_name
FROM conversations c
JOIN teams t ON c.team_id = t.id
WHERE c.status = 'collecting_info'
ORDER BY c.last_message_at DESC;
```

### 查看訂單的對話記錄
```sql
-- 使用函數查詢
SELECT * FROM get_order_conversation('<order_id>');

-- 或直接查詢
SELECT 
  lm.role,
  lm.message_text,
  lm.created_at
FROM line_messages lm
JOIN orders o ON o.conversation_id = lm.conversation_id
WHERE o.id = '<order_id>'
ORDER BY lm.created_at ASC;
```

### 清理超過 24 小時無回應的對話
```sql
-- 手動執行清理
SELECT cleanup_abandoned_conversations();

-- 查看被放棄的對話
SELECT * FROM conversations WHERE status = 'abandoned';
```

---

## 🐛 常見問題排查

### 問題 1：對話記錄沒有顯示

**檢查：**
```sql
SELECT conversation_id FROM orders WHERE id = '<order_id>';
```

如果 `conversation_id` 為 NULL：
- 這是舊訂單（遷移前建立的）
- 只會顯示 `original_message`（舊格式）

### 問題 2：AI 無法合併多輪對話

**檢查：**
1. Edge Function Logs（Supabase Dashboard）
2. 搜尋：`[AI Parse] 對話歷史數量`
3. 如果數量為 0，表示對話歷史沒有正確傳遞

**可能原因：**
- `get_conversation_history` 函數有誤
- `conversation_id` 沒有正確儲存

### 問題 3：訂單完成後 AI 仍回覆舊對話

**檢查：**
```sql
-- 查看對話狀態
SELECT status FROM conversations WHERE line_user_id = '<line_user_id>';
```

應該是 `completed`，如果是 `collecting_info`：
- `complete_conversation` 函數沒有正確執行

---

## 🔐 安全性考量

### 1. 對話資料隱私
- 對話記錄只有團隊成員可查看（RLS 政策）
- LINE User ID 不會外洩

### 2. 清理機制
建議設定定時任務（Supabase Cron Job）：
```sql
-- 每天凌晨 2 點清理超過 24 小時的對話
SELECT cron.schedule(
  'cleanup-abandoned-conversations',
  '0 2 * * *',
  $$SELECT cleanup_abandoned_conversations();$$
);
```

---

## 📈 監控指標

### 建議追蹤的指標：
1. **多輪對話比例**：需要 2 輪以上才完成的訂單佔比
2. **對話完成率**：最終建立訂單的對話 / 總對話數
3. **平均對話輪數**：完成一筆訂單平均需要幾輪對話
4. **放棄對話數**：超過 24 小時無回應的對話數

### 查詢範例：
```sql
-- 多輪對話統計
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN conversation_id IS NOT NULL THEN 1 END) as with_conversation
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- 平均對話輪數
SELECT 
  AVG(message_count) as avg_turns
FROM (
  SELECT 
    conversation_id,
    COUNT(*) as message_count
  FROM line_messages
  WHERE role = 'customer'
    AND created_at > NOW() - INTERVAL '7 days'
  GROUP BY conversation_id
) subquery;
```

---

## ✅ 驗收檢查清單

部署完成後，請依序檢查：

- [ ] 資料庫遷移成功（`conversations` 表存在）
- [ ] 三個 Edge Functions 部署成功
- [ ] 場景 1 測試通過（單次完整訂單）
- [ ] 場景 2 測試通過（多輪補充訂單）
- [ ] 場景 3 測試通過（訂單完成後再對話）
- [ ] APP 顯示對話氣泡 UI
- [ ] 舊訂單仍可正常顯示（向下兼容）

---

## 🎉 完成！

恭喜！LINE 多輪對話訂單系統已成功部署。

如有任何問題，請檢查：
1. Supabase Dashboard → Edge Functions → Logs
2. Supabase Dashboard → Database → Query Editor（執行上述檢查 SQL）
3. Mobile APP → React Query DevTools

祝你使用順利！🚀

