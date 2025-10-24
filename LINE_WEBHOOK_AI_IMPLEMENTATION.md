# LINE Webhook AI 訂單系統 - 實現摘要

## 🎉 實現完成日期
2025-10-24

## 📋 功能概述

實現了完整的 LINE Webhook 與 AI 自動生成訂單系統，讓商家能夠：
1. 將 LINE 官方帳號與團隊綁定
2. 自動接收顧客透過 LINE 傳送的訊息
3. 使用 OpenAI GPT-4 解析訊息內容
4. 自動生成訂單並儲存到資料庫
5. 透過 LINE 自動回覆確認訊息給顧客

## 🏗️ 架構說明

```
顧客 → LINE 官方帳號 → Webhook → line-webhook Edge Function
                                      ↓
                         呼叫 ai-parse-message Edge Function
                                      ↓
                              OpenAI GPT-4 解析
                                      ↓
                         create_order_from_ai() 建立訂單
                                      ↓
                        LINE Messaging API 回覆確認
```

## 📦 已實現的檔案

### 1. 資料庫 Migration
**檔案：** `supabase/migrations/007_order_functions.sql`

**內容：**
- `create_order_from_ai()` - 從 AI 解析結果建立訂單
  - 自動查找/建立顧客
  - 生成訂單編號
  - 更新統計資料
  - 建立提醒（7天、3天、1天、當天）
- `check_team_line_configured()` - 檢查團隊是否已設定 LINE 官方帳號

### 2. Edge Functions

#### **line-webhook** (接收 LINE 訊息)
**檔案：** `supabase/functions/line-webhook/index.ts`

**功能：**
- 接收 LINE Messaging API Webhook 事件
- 驗證 LINE 簽章（HMAC SHA256）
- 根據 Channel ID 找到對應團隊
- 儲存訊息到 `line_messages` 表
- 呼叫 AI 解析服務
- 自動建立訂單（信心度 >= 0.8）
- 透過 LINE API 回覆確認訊息

**處理邏輯：**
```typescript
if (intent === "order" && confidence >= 0.8) {
  // 檢查必要資訊（日期、時間）
  if (有完整資訊) {
    // 建立訂單
    // 回覆確認訊息（包含訂單編號、商品清單、取貨時間）
  } else {
    // 詢問缺少的資訊
  }
} else if (intent === "order" && confidence < 0.8) {
  // 回覆：我們會盡快為您處理
} else {
  // 一般回覆
}
```

#### **ai-parse-message** (AI 解析訊息)
**檔案：** `supabase/functions/ai-parse-message/index.ts`

**功能：**
- 使用 OpenAI GPT-4o-mini 解析訊息
- 提取訊息意圖（order/inquiry/other）
- 解析訂單資訊：
  - 顧客姓名、電話
  - 商品列表（名稱、數量、備註）
  - 取貨日期（智能解析「明天」「下週一」）
  - 取貨時間（24小時制）
  - 總金額
- 回傳信心度（0.0-1.0）

**Prompt 設計：**
- 系統角色：專業訂單解析助手
- 上下文：當前日期、團隊資訊
- 任務：結構化提取訂單資訊
- 輸出：嚴格的 JSON 格式

#### **team-operations** (擴展)
**檔案：** `supabase/functions/team-operations/index.ts`

**新增功能：**
- `update-line-settings` action
- 驗證用戶權限（owner/admin）
- 更新團隊的 LINE 設定：
  - line_channel_id
  - line_channel_secret
  - line_channel_access_token
  - line_channel_name
- 回傳 Webhook URL

### 3. Mobile App

#### **teamService.ts** (擴展)
**檔案：** `mobile/services/teamService.ts`

**新增 API：**
```typescript
interface UpdateLineSettingsParams {
  team_id: string;
  line_channel_id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
  line_channel_name?: string;
}

function updateLineSettings(params): Promise<{
  webhook_url: string;
  message: string;
}>
```

#### **設定頁面** (擴展)
**檔案：** `mobile/app/(main)/(tabs)/settings.tsx`

**新增功能：**
- LINE 官方帳號設定區塊（可展開/收合）
- 輸入欄位：
  - Channel ID
  - Channel Secret（隱藏輸入）
  - Access Token（隱藏輸入）
  - 官方帳號名稱（選填）
- 儲存按鈕（含載入狀態）
- Webhook URL 顯示與複製功能
- 說明提示

**權限控制：**
- 只有 owner 或 admin 可見
- 成功後顯示 Webhook URL
- 自動刷新團隊資料

## 🔐 安全性考量

### 1. Webhook 簽章驗證
```typescript
// 使用 HMAC SHA256 驗證請求來源
const isValid = await verifyLineSignature(
  body,
  signature,
  channelSecret
);
```

### 2. 權限控制
- 只有 owner/admin 可以更新 LINE 設定
- 使用 JWT token 驗證 API 請求
- Channel Secret 和 Access Token 安全儲存在資料庫

### 3. 敏感資料保護
- OpenAI API Key 存在 Supabase Secrets
- Channel Secret 在前端使用 secureTextEntry
- Webhook 回應必須是 200 狀態碼（避免重複發送）

## 📊 資料庫變更

### 新增函數
1. `create_order_from_ai()` - 從 AI 結果建立訂單
2. `check_team_line_configured()` - 檢查 LINE 設定狀態

### 使用的現有函數
1. `generate_order_number()` - 生成訂單編號
2. `get_user_teams()` - 查詢用戶團隊

### 涉及的表格
- `teams` - 儲存 LINE 官方帳號設定
- `line_messages` - 儲存所有 LINE 訊息
- `orders` - 自動建立的訂單
- `customers` - 自動建立/更新顧客
- `reminders` - 自動建立提醒

## 🚀 部署步驟

### 1. 執行資料庫 Migration
```bash
cd supabase
supabase db push
```

### 2. 設定 Supabase Secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-xxx
```

### 3. 部署 Edge Functions
```bash
# 部署 AI 解析服務
supabase functions deploy ai-parse-message

# 部署 LINE Webhook
supabase functions deploy line-webhook

# 重新部署 team-operations（已更新）
supabase functions deploy team-operations
```

### 4. 在 Mobile App 中設定 LINE 官方帳號
1. 登入 App
2. 進入「設定」頁面
3. 展開「LINE 官方帳號設定」
4. 輸入 LINE Developers Console 提供的：
   - Channel ID
   - Channel Secret
   - Channel Access Token
5. 點擊「儲存設定」
6. 複製顯示的 Webhook URL

### 5. 在 LINE Developers Console 設定 Webhook
1. 前往 https://developers.line.biz/
2. 選擇你的 Messaging API Channel
3. 進入 Messaging API 設定
4. 設定 Webhook URL（從 App 複製的 URL）
5. 啟用「Use webhook」
6. 關閉「Auto-reply messages」（避免衝突）
7. 測試 Webhook 連線

## 🧪 測試流程

### 1. 基本測試
```
顧客：我想訂一個巴斯克蛋糕 6吋，明天下午2點取
系統：✅ 訂單已確認！
      訂單編號：ORD-20251025-001
      商品：
      • 巴斯克蛋糕 6吋 x1
      取貨時間：2025-10-25 14:00
      感謝您的訂購！
```

### 2. 缺少資訊測試
```
顧客：我要訂蛋糕
系統：收到您的訂單！不過還需要確認以下資訊：
      • 取貨日期
      • 取貨時間
      請補充這些資訊，謝謝！
```

### 3. 低信心度測試
```
顧客：你們有賣什麼口味？
系統：感謝您的詢問！我們會盡快回覆您。
```

### 4. 檢查資料庫
- 訊息記錄在 `line_messages` 表
- AI 解析結果在 `ai_result` 欄位
- 訂單建立在 `orders` 表
- 提醒建立在 `reminders` 表

## 📝 重要設定提醒

### LINE Developers Console
- ✅ 設定 Webhook URL
- ✅ 啟用「Use webhook」
- ✅ 關閉「Auto-reply messages」
- ✅ 關閉「Greeting messages」（選擇性）
- ✅ 設定「Message type」為「Bot」

### OpenAI API
- 使用模型：`gpt-4o-mini`
- 成本：~$0.15 per 1M input tokens
- Temperature：0.3（低隨機性）
- Max tokens：500

### 團隊設定
- LINE 官方帳號每個團隊只能綁定一個
- 多個團隊可以有不同的官方帳號
- 需要 owner 或 admin 權限才能設定

## 🎯 AI 解析信心度說明

- **>= 0.8**：自動建立訂單
- **0.5 - 0.8**：標記為需要確認
- **< 0.5**：視為一般對話

## 🔄 自動提醒機制

訂單建立後自動生成：
- **7天前提醒**：「訂單 XXX 將於 7 天後取貨」
- **3天前提醒**：「訂單 XXX 將於 3 天後取貨」
- **1天前提醒**：「訂單 XXX 將於明天取貨」
- **當天提醒**：「訂單 XXX 今天要取貨」

提醒時間：預設為早上 8:00-9:00

## 🐛 已知限制與未來改進

### 目前限制
1. 只處理文字訊息（不處理圖片、貼圖）
2. 無法處理多輪對話（每則訊息獨立解析）
3. 商品價格需要手動補充或從價格表查詢
4. 不支援訂單修改（需要在 App 中手動修改）

### 未來改進方向
1. **對話上下文記憶**
   - 使用 LangChain Memory 記住對話歷史
   - 支援「我剛剛說的那個改成8吋」這類指令

2. **商品價格資料庫**
   - 建立 `products` 表
   - AI 自動查詢價格並計算總額

3. **圖片辨識**
   - 使用 GPT-4 Vision 解析商品圖片
   - 支援「這個我要兩個」+ 圖片

4. **多語言支援**
   - 偵測訊息語言
   - 自動切換 AI Prompt

5. **訂單確認機制**
   - 傳送確認按鈕（LINE Rich Menu）
   - 顧客點擊確認後才正式建立訂單

## 🎓 技術亮點

### 1. 智能日期解析
AI 能理解自然語言的日期：
- "明天" → 計算實際日期
- "下週一" → 計算下週一的日期
- "10/25" → 2025-10-25

### 2. 時間格式轉換
- "下午2點" → 14:00
- "早上10點半" → 10:30
- "晚上7點" → 19:00

### 3. 商品數量智能判斷
- "一個巴斯克" → quantity: 1
- "兩盒餅乾" → quantity: 2
- "巴斯克" → quantity: 1（預設）

### 4. 備註提取
AI 會自動提取備註資訊：
- "少糖" → notes: "少糖"
- "不要巧克力" → notes: "不要巧克力"
- "冰的" → notes: "冰的"

## 📞 支援與維護

### 監控與除錯
- Supabase Logs：查看 Edge Function 執行記錄
- LINE Developers Console：查看 Webhook 送達狀態
- 資料庫：檢查 `line_messages` 表的 `ai_result` 欄位

### 常見問題排查
1. **Webhook 沒有收到訊息**
   - 檢查 LINE Developers Console 的 Webhook URL
   - 確認「Use webhook」已啟用
   - 測試 Webhook 連線

2. **AI 解析錯誤**
   - 檢查 OPENAI_API_KEY 是否正確
   - 查看 Supabase Logs 的錯誤訊息
   - 檢查 OpenAI API 額度

3. **訂單沒有建立**
   - 檢查 AI 信心度是否 >= 0.8
   - 確認是否缺少必要資訊（日期、時間）
   - 檢查資料庫函數執行記錄

## ✅ 實現檢查清單

- [x] 資料庫 Migration（007_order_functions.sql）
- [x] ai-parse-message Edge Function
- [x] line-webhook Edge Function
- [x] team-operations Edge Function 擴展
- [x] teamService.ts 擴展
- [x] 設定頁面 UI
- [x] 簽章驗證
- [x] 自動回覆功能
- [x] 訂單自動建立
- [x] 提醒自動建立
- [x] 權限控制
- [x] 錯誤處理
- [x] 實現文件

## 🎉 總結

完整的 LINE Webhook AI 訂單系統已經實現！商家現在可以：
1. ✅ 在 App 中設定 LINE 官方帳號
2. ✅ 自動接收顧客訊息
3. ✅ AI 智能解析訂單
4. ✅ 自動建立訂單並回覆確認
5. ✅ 自動產生取貨提醒

系統已準備好進行測試和部署！🚀

