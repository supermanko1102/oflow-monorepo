# LINE Webhook AI 訂單系統 - 部署指南

## 📋 前置需求

### 1. Supabase Project
- 已建立 Supabase 專案
- 已執行所有 migrations（001-006）
- 已設定 Supabase CLI

### 2. OpenAI API Key
- 註冊 OpenAI 帳號
- 取得 API Key：https://platform.openai.com/api-keys
- 確認有足夠的額度

### 3. LINE Developers 帳號
- 註冊 LINE Developers：https://developers.line.biz/
- 建立 Messaging API Channel
- 取得以下資訊：
  - Channel ID
  - Channel Secret
  - Channel Access Token

## 🚀 部署步驟

### 步驟 1: 執行資料庫 Migration

```bash
cd /Users/yuna/oflow-monorepo/supabase
supabase db push
```

這會執行 `007_order_functions.sql`，建立必要的資料庫函數。

### 步驟 2: 設定 Supabase Secrets

設定 OpenAI API Key：

```bash
# 替換 sk-xxx 為你的實際 API Key
supabase secrets set OPENAI_API_KEY=sk-xxx
```

驗證設定：

```bash
supabase secrets list
```

### 步驟 3: 部署 Edge Functions

部署所有相關的 Edge Functions：

```bash
# 部署 AI 解析服務
supabase functions deploy ai-parse-message

# 部署 LINE Webhook 處理器
supabase functions deploy line-webhook

# 重新部署 team-operations（已擴展支援 LINE 設定）
supabase functions deploy team-operations
```

### 步驟 4: 驗證部署

檢查 Edge Functions 是否部署成功：

```bash
supabase functions list
```

你應該看到：
- ✅ ai-parse-message
- ✅ line-webhook
- ✅ team-operations
- ✅ auth-line-callback

### 步驟 5: 在 Mobile App 中設定 LINE 官方帳號

1. 啟動 Mobile App（確保已安裝所有依賴）
2. 使用 LINE Login 登入
3. 進入「設定」頁面
4. 找到「LINE 官方帳號設定」區塊
5. 點擊展開
6. 輸入從 LINE Developers Console 取得的資訊：
   - **Channel ID**：例如 `1234567890`
   - **Channel Secret**：例如 `abcdef1234567890abcdef1234567890`
   - **Channel Access Token**：例如 `ABC123...` (長字串)
   - **官方帳號名稱**（選填）：例如 `@ocake`
7. 點擊「儲存設定」
8. 記下顯示的 **Webhook URL**（長按文字可複製）

### 步驟 6: 在 LINE Developers Console 設定 Webhook

1. 前往 https://developers.line.biz/console/
2. 選擇你的 **Messaging API Channel**
3. 進入「Messaging API」分頁
4. 找到「Webhook settings」區塊
5. 設定 **Webhook URL**（從 App 複製的 URL）：
   ```
   https://your-project.supabase.co/functions/v1/line-webhook
   ```
6. 點擊「Update」
7. 點擊「Verify」測試連線
8. 啟用「Use webhook」開關
9. **重要設定**（避免衝突）：
   - ❌ 關閉「Auto-reply messages」
   - ❌ 關閉「Greeting messages」（選擇性）
10. 儲存變更

## ✅ 驗證測試

### 測試 1: 基本訂單
從你的手機傳送訊息給 LINE 官方帳號：

```
我想訂一個巴斯克蛋糕 6吋，明天下午2點取
```

**預期回應：**
```
✅ 訂單已確認！

訂單編號：ORD-20251025-001

商品：
• 巴斯克蛋糕 6吋 x1

取貨時間：2025-10-25 14:00

感謝您的訂購！
```

### 測試 2: 檢查資料庫

在 Supabase Dashboard 中檢查：

1. **line_messages 表**：
   - 應該有一筆新記錄
   - `ai_parsed` = true
   - `ai_result` 包含解析結果
   - `ai_confidence` >= 0.8

2. **orders 表**：
   - 應該有一筆新訂單
   - `order_number` = ORD-YYYYMMDD-XXX
   - `status` = pending
   - `source` = auto

3. **customers 表**：
   - 應該自動建立顧客記錄
   - `line_user_id` 與傳送訊息的用戶 ID 對應

4. **reminders 表**：
   - 應該有 1-4 筆提醒（依取貨日期而定）

### 測試 3: 檢查 Logs

在 Supabase Dashboard → Edge Functions → line-webhook → Logs：

```
[LINE Webhook] 收到 Webhook 請求
[LINE Webhook] Channel ID: 1234567890
[LINE Webhook] 找到團隊: OCake
[LINE Webhook] 簽章驗證通過
[LINE Webhook] 處理事件: message
[LINE Webhook] 訊息內容: 我想訂一個...
[LINE Webhook] AI 解析結果: { intent: 'order', confidence: 0.95 }
[LINE Webhook] 信心度足夠，開始建立訂單...
[LINE Webhook] 訂單建立成功: xxx-xxx-xxx
[LINE Webhook] 回覆訊息成功
```

## 🐛 常見問題排查

### 問題 1: Webhook 沒有收到訊息

**檢查清單：**
- [ ] Webhook URL 是否正確設定
- [ ] 「Use webhook」是否已啟用
- [ ] 在 LINE Developers Console 測試 Webhook 連線
- [ ] 檢查 Edge Function 的 Logs

**解決方法：**
```bash
# 檢查 line-webhook Edge Function 的 logs
supabase functions logs line-webhook
```

### 問題 2: AI 解析失敗

**檢查清單：**
- [ ] OPENAI_API_KEY 是否正確設定
- [ ] OpenAI 帳戶是否有足夠額度
- [ ] 檢查 ai-parse-message 的 Logs

**解決方法：**
```bash
# 檢查 ai-parse-message Edge Function 的 logs
supabase functions logs ai-parse-message

# 驗證 Secrets
supabase secrets list
```

### 問題 3: 訂單沒有建立

**檢查清單：**
- [ ] AI 信心度是否 >= 0.8
- [ ] 訊息是否包含必要資訊（日期、時間）
- [ ] 檢查資料庫函數是否正確執行

**檢查方法：**
在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 檢查最近的 LINE 訊息
SELECT 
  id, 
  message_text, 
  ai_parsed, 
  ai_confidence, 
  ai_result->>'intent' as intent,
  order_id
FROM line_messages
ORDER BY created_at DESC
LIMIT 5;
```

### 問題 4: 簽章驗證失敗

**檢查清單：**
- [ ] Channel Secret 是否正確
- [ ] teams 表中的 line_channel_secret 是否正確

**解決方法：**
重新在 App 中設定 LINE 官方帳號資訊。

### 問題 5: 權限錯誤

**檢查清單：**
- [ ] 用戶是否為 owner 或 admin
- [ ] RLS 政策是否正確

## 📊 監控與維護

### 定期檢查事項

1. **每週檢查 OpenAI 使用量**
   - 前往 https://platform.openai.com/usage
   - 確認成本在預算內

2. **每月檢查 Edge Function 執行狀況**
   ```bash
   supabase functions logs line-webhook --tail
   supabase functions logs ai-parse-message --tail
   ```

3. **監控資料庫大小**
   - line_messages 表會持續增長
   - 建議定期清理舊訊息（保留 30-90 天）

### 效能優化建議

1. **AI 解析快取**（未來改進）
   - 對相似訊息使用快取結果
   - 減少 OpenAI API 呼叫次數

2. **訊息批次處理**（未來改進）
   - 將多個訊息合併處理
   - 提高處理效率

## 🎯 下一步

系統部署完成後，你可以：

1. **測試更多場景**
   - 多商品訂單
   - 不同日期格式
   - 特殊需求備註

2. **調整 AI Prompt**
   - 根據實際使用情況優化 Prompt
   - 提高解析準確度

3. **擴展功能**
   - 訂單修改
   - 訂單取消
   - 多輪對話

4. **整合其他服務**
   - 金流串接
   - 發票系統
   - 物流追蹤

## 🎉 完成！

恭喜！你已經成功部署 LINE Webhook AI 訂單系統！

如有任何問題，請參考：
- [實現摘要](./LINE_WEBHOOK_AI_IMPLEMENTATION.md)
- [Supabase 文件](https://supabase.com/docs)
- [OpenAI API 文件](https://platform.openai.com/docs)
- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)

