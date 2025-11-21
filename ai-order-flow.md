## AI 建單流程修正提案（半自動 / 全自動）

### 目標
一勞永逸修正 AI 產生訂單的前後端落差，確保：
- AI 無法完成的訂單會落到 Inbox 供商家確認。
- 半自動模式有 App 端的「確認建單」入口。
- 前端狀態與後端一致。

---

### 後端狀態對齊
- `collecting_info`: 進行中
- `awaiting_merchant_confirmation`: 半自動資料已完整，等商家確認
- `requires_manual_handling`: AI 放棄/超過 3 輪，需人工
- `completed`: 已完成
- `abandoned`: 已忽略
- **Orders 狀態**：`pending/paid/completed/cancelled`（沒有 `confirmed`）

---

### 前端必修
1) **Inbox**
   - 撈取 `collecting_info`、`awaiting_merchant_confirmation`、`requires_manual_handling` 於「例外/待確認」區；`completed` 於「已完成」區。
   - 卡片顯示 `missing_fields`、`lastMessage`、`last_message_at`。
   - 按鈕：「確認建單」→ `useConfirmConversation`；「忽略」→ `useIgnoreConversation`。缺欄位時要求商家補齊（姓名/電話/品項/時間/金額）。

2) **Orders**
   - 狀態篩選改為 `pending/paid/completed/cancelled`。

3) **LINE 連接守門**
   - 以 `line_channel_id` 判斷是否進 AI 流；未連接時可直接顯示連接提示。

---

### 後端建議微調
- **自動模式缺資料**：選擇其一
  - A) 立即標記 `requires_manual_handling` 並停止追問 → 商家介入。
  - B) 保留 3 輪追問，但前端要撈 `requires_manual_handling`，避免漏掉。
- **半自動模式完成判斷**：AI 判定完整後標記 `awaiting_merchant_confirmation`，不要直接完成；由商家在 App 確認建單。
- **半自動關鍵字直建**：如要安全，改為待確認或檢查必填欄位，缺漏時禁止直建。
- 確保 `missing_fields`/`collected_data` 寫入 `conversations`，供前端顯示。

---

### 驗證路徑
1. LINE 訊息不完整 → Inbox 例外區可見對話＋缺欄位。
2. 商家按「確認建單」→ Orders 出現新訂單，對話轉 completed。
3. 自動模式訊息完整 → 直接建單、完成對話。
4. 亂訊息 >3 輪（或選方案 A）→ 標記 `requires_manual_handling`，商家介入。

---

### 實作優先序
1. Inbox 撈狀態＋新增「確認建單」入口（對應 `useConfirmConversation`）。  
2. Orders 狀態篩選對齊後端。  
3. 選定 AI 未完成的處理方案（A 立即轉人工 / B 3 輪後轉人工）。  
4. 決定半自動 `/訂單確認` 是否改為待確認或加檢查。  

