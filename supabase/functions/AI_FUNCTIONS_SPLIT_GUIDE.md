# AI Functions 拆分實施指南

## 概覽

已成功將 AI 解析功能拆分為兩個獨立的 Edge Functions，提升 AI 準確度並利於未來擴展：

- **ai-parse-message-goods**：商品型業務（bakery, flower, craft, other）
- **ai-parse-message-services**：服務型業務（beauty, massage, nail, pet）

## 架構說明

### 保持單一資料庫
- ✅ Teams, Users, Customers, Orders, Products 等表格完全共用
- ✅ 資料庫結構零變動
- ✅ 現有訂單和對話不受影響

### 拆分 AI Edge Functions
- ✅ 各自專注的業務邏輯
- ✅ 精簡的 AI Prompt
- ✅ 獨立的優化空間

### 智能路由
- ✅ `line-webhook` 根據 `business_type` 自動路由
- ✅ 未知類型預設使用商品型 AI

## 文件結構

```
supabase/functions/
├── _shared/                          # 共用模組 ⭐ NEW
│   ├── cors.ts                       # CORS headers
│   ├── types.ts                      # TypeScript 介面定義
│   ├── product-fetcher.ts            # 商品/服務查詢邏輯
│   └── date-utils.ts                 # 日期時間處理工具
│
├── ai-parse-message-goods/           # 商品型 AI ⭐ NEW
│   ├── deno.json
│   └── index.ts
│
├── ai-parse-message-services/        # 服務型 AI ⭐ NEW
│   ├── deno.json
│   └── index.ts
│
└── line-webhook/                     # 已更新路由邏輯 ⭐ UPDATED
    ├── deno.json
    └── index.ts
```

## 部署步驟

### 1. 部署新的 Edge Functions

使用 Supabase CLI 部署三個新的 functions：

```bash
# 部署共用模組（Supabase 會自動處理 _shared）
# 無需單獨部署 _shared

# 部署商品型 AI
supabase functions deploy ai-parse-message-goods

# 部署服務型 AI
supabase functions deploy ai-parse-message-services

# 重新部署 line-webhook（包含新的路由邏輯）
supabase functions deploy line-webhook
```

### 2. 驗證環境變數

確保以下環境變數已設定：

```bash
# OpenAI API Key（必須）
OPENAI_API_KEY=sk-...

# Supabase 環境變數（自動設定）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 測試驗證

### 測試商品型業務（烘焙店範例）

1. **設定團隊的 `business_type`**：
   ```sql
   UPDATE teams 
   SET business_type = 'bakery' 
   WHERE id = 'your-team-id';
   ```

2. **測試商品詢問**：
   - LINE 發送：「你們有什麼蛋糕？」
   - 預期：AI 回覆商品列表（從 products 表）

3. **測試訂單流程**：
   - LINE 發送：「我要訂 1 個巴斯克蛋糕，明天下午 3 點自取」
   - 預期：AI 解析出商品、時間、配送方式

4. **驗證路由**：
   - 檢查 Supabase Logs，應該看到：
     ```
     [LINE Webhook] 使用商品型 AI 解析
     [AI Parse Goods] 收到解析請求...
     ```

### 測試服務型業務（美容店範例）

1. **設定團隊的 `business_type`**：
   ```sql
   UPDATE teams 
   SET business_type = 'beauty' 
   WHERE id = 'your-team-id';
   ```

2. **測試服務詢問**：
   - LINE 發送：「你們有什麼服務？」
   - 預期：AI 回覆服務列表（從 products 表）

3. **測試預約流程**：
   - LINE 發送：「我要預約剪髮，這週六早上 10 點」
   - 預期：AI 解析出服務項目、預約時間，且 `delivery_method = "onsite"`

4. **驗證路由**：
   - 檢查 Supabase Logs，應該看到：
     ```
     [LINE Webhook] 使用服務型 AI 解析
     [AI Parse Services] 收到解析請求...
     ```

## 關鍵差異對照

### 商品型 AI (`ai-parse-message-goods`)

**專注領域**：
- ✅ 商品規格識別（尺寸、口味、顏色）
- ✅ 配送方式判斷（自取、超商、宅配）
- ✅ 冷凍需求識別
- ✅ 地址/店號提取

**Prompt 特色**：
- 強化「商品匹配與價格填入」
- 詳細的配送方式對應規則
- 超商/宅配的額外資訊要求

**適用行業**：
- bakery（烘焙）
- flower（花店）
- craft（手工藝）
- other（其他商品型）

### 服務型 AI (`ai-parse-message-services`)

**專注領域**：
- ✅ 時段語意理解（「這週六早上」「下午3點左右」）
- ✅ 服務時長識別
- ✅ 特殊需求記錄（過敏、頭髮狀況）
- ✅ 自動設定 `delivery_method = "onsite"`

**Prompt 特色**：
- 強化「時段理解」和日期計算
- 移除配送方式相關邏輯
- 增加特殊需求記錄提示

**適用行業**：
- beauty（美容美髮）
- massage（按摩 SPA）
- nail（美甲美睫）
- pet（寵物美容）

## 向後兼容性

### API 介面完全一致
- ✅ Request 格式：`{ message, team_context, conversation_history, collected_data }`
- ✅ Response 格式：`{ success, result }`
- ✅ 資料庫操作完全相同

## 監控與除錯

### 查看 Logs

**Supabase Dashboard**：
1. 前往 Edge Functions 頁面
2. 選擇對應的 function（goods 或 services）
3. 查看 Invocations 和 Logs

**關鍵 Log 訊息**：
```
[LINE Webhook] 使用商品型 AI 解析          # 路由到商品型
[LINE Webhook] 使用服務型 AI 解析          # 路由到服務型
[AI Parse Goods] 查詢團隊商品              # 商品查詢
[AI Parse Services] 查詢團隊服務           # 服務查詢
[AI Parse Goods] 解析完成                  # 解析結果
```

### 常見問題排查

**問題 1：AI 沒有推薦商品**
- 檢查：`products` 表是否有 `is_available = true` 的商品
- 檢查：`team_id` 是否正確

**問題 2：路由沒有切換到新的 function**
- 檢查：`teams.business_type` 是否設定正確
- 檢查：`line-webhook` 是否已重新部署

**問題 3：函數調用失敗**
- 檢查：環境變數（特別是 `OPENAI_API_KEY`）
- 檢查：Supabase Functions 的執行權限

## 未來擴展方向

### 商品型可以加入
- 📦 庫存檢查（訂單前檢查庫存）
- 🚚 物流追蹤整合（黑貓、超商 API）
- 📊 生產排程視覺化
- 🛒 電商平台同步

### 服務型可以加入
- 📅 Google Calendar 同步
- 👤 技師/房間排程管理
- 💳 會員儲值/包月方案
- 🔔 回訪提醒系統

### 各自優化
- 🎯 調整 GPT model（4o vs 4o-mini）
- 📈 獨立的錯誤監控
- 🔍 業態專屬的 A/B 測試

## 故障排除

如果遇到問題需要臨時切換：

```typescript
// 在 parseMessageWithAI 中可以臨時強制使用特定版本
let aiFunctionName = "ai-parse-message-goods"; // 強制使用商品型
// 或
let aiFunctionName = "ai-parse-message-services"; // 強制使用服務型
```

## 總結

✅ **完成項目**：
- 創建 `_shared` 共用模組
- 創建 `ai-parse-message-goods` 商品型 AI
- 創建 `ai-parse-message-services` 服務型 AI
- 更新 `line-webhook` 路由邏輯
- 保持資料庫架構不變
- 完全向後兼容

🎯 **效果**：
- AI Prompt 更精簡、更專注
- 各業態可獨立優化和迭代
- 降低 AI 混淆，提升準確度
- 為未來擴展打下良好基礎

---

**實施完成時間**：2025-11-01
**維護者**：OFlow Team

