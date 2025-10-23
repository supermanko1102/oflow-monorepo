# 如何取得 Supabase URL

## 方法 1: 從 Supabase Dashboard 取得（推薦）

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. 點擊左側選單的 **Settings**（設定圖示 ⚙️）
4. 選擇 **API** 分頁
5. 在 **Project URL** 區塊，您會看到：

   ```
   Project URL
   https://abcdefghijklmnop.supabase.co
   ```

6. **複製這個完整的 URL**（包含 `https://`）

## 方法 2: 從瀏覽器 URL 取得

當您在 Supabase Dashboard 中時，瀏覽器的 URL 會是：

```
https://supabase.com/dashboard/project/abcdefghijklmnop/...
```

其中 `abcdefghijklmnop` 就是您的 Project Reference ID，您的 Supabase URL 就是：

```
https://abcdefghijklmnop.supabase.co
```

## ✅ 正確格式範例

```bash
# 正確 ✅
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# 正確 ✅（不同的 project ref）
NEXT_PUBLIC_SUPABASE_URL=https://xyzwabcdefghijk.supabase.co
```

## ❌ 錯誤格式範例

```bash
# 錯誤 ❌ - 結尾有斜線
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co/

# 錯誤 ❌ - 缺少 https://
NEXT_PUBLIC_SUPABASE_URL=abcdefghijklmnop.supabase.co

# 錯誤 ❌ - 使用了預設值
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# 錯誤 ❌ - 包含了額外的路徑
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co/functions/v1
```

## 在 Vercel 中設定

### 步驟 1: 前往 Vercel 專案設定

1. 登入 [Vercel Dashboard](https://vercel.com)
2. 選擇您的 `oflow-website` 專案
3. 點擊上方的 **Settings** 分頁

### 步驟 2: 新增環境變數

1. 在左側選單選擇 **Environment Variables**
2. 點擊右上角的 **Add New** 按鈕
3. 填寫：
   - **Name (變數名稱)**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value (值)**: `https://[your-project-ref].supabase.co`（從 Supabase Dashboard 複製）
   - **Environments (環境)**: 勾選所有三個 ✓
     - ✓ Production
     - ✓ Preview
     - ✓ Development

### 步驟 3: 儲存並重新部署

1. 點擊 **Save**
2. 前往 **Deployments** 分頁
3. 找到最新的 deployment
4. 點擊右側的 **⋯** → **Redeploy**
5. **不要** 勾選 "Use existing Build Cache"
6. 點擊 **Redeploy**

## 驗證設定是否正確

### 方法 1: 使用 Vercel CLI

```bash
cd /Users/alex/Desktop/OFlow-monorepo/website
npx vercel env ls
```

應該會看到：

```
NEXT_PUBLIC_SUPABASE_URL  (Production, Preview, Development)
```

### 方法 2: 檢查部署後的網站

1. 部署完成後，訪問您的網站
2. 開啟瀏覽器開發者工具（F12）
3. 在 Console 中輸入：

```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

應該會顯示您設定的 URL（不是 undefined）。

### 方法 3: 測試 LINE 登入流程

當 URL 設定正確後，LINE 登入流程應該會在 console 顯示：

```
[LINE Callback] Supabase URL: https://abcdefghijklmnop.supabase.co
[LINE Callback] 呼叫 Edge Function...
```

而不是：

```
❌ [Login] Callback 處理失敗: Load failed
```

## 常見問題

### Q: 我找不到 Supabase URL

**A**: 確保您已經在 Supabase 建立了專案。如果還沒有，請先建立專案。

### Q: 設定後還是看到 "Load failed"

**A**: 確認以下事項：

1. 變數名稱完全正確：`NEXT_PUBLIC_SUPABASE_URL`（區分大小寫）
2. 已勾選所有環境（Production, Preview, Development）
3. 已重新部署 Vercel（設定環境變數後必須重新部署）

### Q: URL 結尾要不要加斜線？

**A**: **不要**加斜線。正確格式是 `https://xxx.supabase.co`

### Q: 我可以在本地測試嗎？

**A**: 可以！在 `website/.env.local` 新增：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
```

然後執行 `npm run dev`

## 完整設定範例

假設您的 Supabase Project Reference ID 是 `abcdefghijklmnop`：

### Vercel 環境變數

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

### 本地開發 (website/.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

### Mobile app (mobile/.env)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...（從 Supabase Dashboard 的 API 頁面取得）
```

## 下一步

設定完成後：

1. ✅ 重新部署 Vercel
2. ✅ 測試 LINE 登入流程
3. ✅ 檢查是否還有 "Load failed" 錯誤

如果仍有問題，請提供：

- Vercel 環境變數的截圖
- 完整的 console log
