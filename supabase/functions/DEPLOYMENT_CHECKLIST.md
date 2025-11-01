# AI Functions 拆分 - 部署清單

## ✅ 已完成的變更

### 1. 新增檔案
- ✅ `_shared/cors.ts` - 共用 CORS headers
- ✅ `_shared/types.ts` - 共用 TypeScript 介面
- ✅ `_shared/product-fetcher.ts` - 商品/服務查詢邏輯
- ✅ `_shared/date-utils.ts` - 日期時間工具
- ✅ `ai-parse-message-goods/index.ts` - 商品型 AI
- ✅ `ai-parse-message-goods/deno.json` - 商品型 AI 設定
- ✅ `ai-parse-message-services/index.ts` - 服務型 AI
- ✅ `ai-parse-message-services/deno.json` - 服務型 AI 設定

### 2. 修改檔案
- ✅ `line-webhook/index.ts` - 加入智能路由邏輯

### 3. 移除檔案
- ✅ `ai-parse-message/index.ts` - 已刪除（被拆分）
- ✅ `ai-parse-message/deno.json` - 已刪除（被拆分）

### 4. 文件檔案
- ✅ `AI_FUNCTIONS_SPLIT_GUIDE.md` - 完整實施指南
- ✅ `DEPLOYMENT_CHECKLIST.md` - 本檔案

## 📦 部署步驟（重要！）

### Step 1: 確認環境變數

在 Supabase Dashboard 檢查以下環境變數：

```bash
OPENAI_API_KEY=sk-...  # 必須設定
SUPABASE_URL=https://...  # 自動設定
SUPABASE_ANON_KEY=eyJ...  # 自動設定
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 自動設定
```

### Step 2: 部署 Edge Functions

```bash
# 進入專案目錄
cd /Users/yuna/oflow-monorepo

# 部署商品型 AI（新）
supabase functions deploy ai-parse-message-goods

# 部署服務型 AI（新）
supabase functions deploy ai-parse-message-services

# 重新部署 line-webhook（包含新路由邏輯）
supabase functions deploy line-webhook
```

### Step 3: 刪除舊的 Edge Function（可選）

如果舊的 `ai-parse-message` 還在 Supabase 上運行，可以在 Dashboard 手動刪除：

1. 前往 Supabase Dashboard > Edge Functions
2. 找到 `ai-parse-message`
3. 點擊刪除（或保留作為備份）

## 🧪 測試驗證

### 測試商品型（烘焙店）

```sql
-- 設定團隊為烘焙業
UPDATE teams 
SET business_type = 'bakery' 
WHERE id = 'YOUR_TEAM_ID';
```

**測試訊息**：
1. 「你們有什麼蛋糕？」
2. 「我要訂 1 個巴斯克蛋糕，明天下午 3 點自取」

**預期結果**：
- Logs 顯示：`[LINE Webhook] 使用商品型 AI 解析`
- AI 能推薦商品列表
- AI 能解析商品、時間、配送方式

### 測試服務型（美容店）

```sql
-- 設定團隊為美容業
UPDATE teams 
SET business_type = 'beauty' 
WHERE id = 'YOUR_TEAM_ID';
```

**測試訊息**：
1. 「你們有什麼服務？」
2. 「我要預約剪髮，這週六早上 10 點」

**預期結果**：
- Logs 顯示：`[LINE Webhook] 使用服務型 AI 解析`
- AI 能推薦服務列表
- AI 能解析服務、預約時間
- `delivery_method` 自動設為 `onsite`

## 📊 監控檢查點

部署後檢查以下項目：

- [ ] 商品型 AI 能成功調用
- [ ] 服務型 AI 能成功調用
- [ ] line-webhook 能正確路由
- [ ] 商品詢問能推薦商品列表
- [ ] 訂單流程能正常完成
- [ ] 預約流程能正常完成
- [ ] 對話歷史功能正常
- [ ] 多輪對話能正確合併資訊

## 🔍 查看 Logs

**Supabase Dashboard 路徑**：
1. Edge Functions > 選擇 function
2. Invocations > 查看最近調用
3. Logs > 查看詳細日誌

**關鍵 Log 訊息**：
```
✅ [LINE Webhook] 使用商品型 AI 解析
✅ [AI Parse Goods] 查詢團隊商品
✅ [AI Parse Goods] 找到商品數量: X
✅ [AI Parse Goods] 解析完成

✅ [LINE Webhook] 使用服務型 AI 解析
✅ [AI Parse Services] 查詢團隊服務
✅ [AI Parse Services] 找到服務數量: X
✅ [AI Parse Services] 解析完成
```

## ⚠️ 常見問題

### Q1: 部署失敗「Module not found」
**A**: 確保 `_shared` 資料夾也一起部署了。Supabase 會自動處理共用模組。

### Q2: AI 沒有推薦商品/服務
**A**: 檢查 `products` 表是否有 `is_available = true` 的項目。

### Q3: 路由沒有切換
**A**: 
1. 確認 `teams.business_type` 設定正確
2. 確認 `line-webhook` 已重新部署
3. 查看 Logs 確認路由邏輯

### Q4: 舊的 ai-parse-message 還在
**A**: 在 Supabase Dashboard 手動刪除即可，不影響新版本運行。

## 🎯 業務類型對應

**商品型** → `ai-parse-message-goods`
- bakery（烘焙）
- flower（花店）
- craft（手工藝）
- other（其他）
- **未知類型預設使用商品型**

**服務型** → `ai-parse-message-services`
- beauty（美容美髮）
- massage（按摩 SPA）
- nail（美甲美睫）
- pet（寵物美容）

## 📈 效能提升預期

- ✅ AI Prompt 精簡 40-50%
- ✅ 商品匹配準確度提升
- ✅ 時段理解準確度提升
- ✅ 獨立優化與迭代能力

## ✅ 部署完成確認

部署完成後，在此檢查清單打勾：

- [ ] ai-parse-message-goods 部署成功
- [ ] ai-parse-message-services 部署成功
- [ ] line-webhook 重新部署成功
- [ ] 環境變數確認無誤
- [ ] 商品型測試通過
- [ ] 服務型測試通過
- [ ] Logs 無錯誤訊息
- [ ] 生產環境驗證完成

---

**部署日期**：___________
**部署者**：___________
**驗證者**：___________

