# Backend Authentication 設定指南

本文件說明如何設定和部署新的 LINE Login Backend 架構。

## 🎯 架構概述

```
User → LINE 授權
  → Vercel Callback (/auth/line-callback)
  → Supabase Edge Function (/auth-line-callback)
  → 驗證 LINE code + 建立 Supabase Auth user
  → 回傳 session tokens
  → Deep link 回 App (oflow://auth?access_token=xxx)
  → App 設定 supabase.auth.setSession()
  → ✅ RLS policies 開始運作
```

## 📋 部署步驟

### 1. 設定 Supabase Edge Function 環境變數

在 Supabase Dashboard → Settings → Edge Functions → Secrets，新增以下變數：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ⚠️ 重要：使用 service_role，不是 anon key
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret  # ⚠️ 首次使用，從 LINE Console 取得
```

### 2. 部署 Supabase Edge Function

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase

# 登入 Supabase CLI（如果還沒登入）
npx supabase login

# 連結到你的專案
npx supabase link --project-ref your-project-ref

# 部署 Edge Function
npx supabase functions deploy auth-line-callback

# 驗證部署
npx supabase functions list
```

### 3. 執行資料庫 Migration

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase

# 方法 A：使用 Supabase CLI（推薦）
npx supabase db push

# 方法 B：在 Supabase Dashboard 手動執行
# 1. 進入 SQL Editor
# 2. 複製 migrations/005_link_auth_users.sql 內容
# 3. 執行
```

驗證 migration：

```sql
-- 檢查 auth_user_id 欄位是否存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'auth_user_id';

-- 檢查 RLS policies 是否更新
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'users';
```

### 4. 設定 Website 環境變數

在 Vercel Dashboard 或本地 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 5. 部署 Website

```bash
cd /Users/alex/Desktop/OFlow-monorepo/website

# 部署到 Vercel
vercel --prod

# 或使用 Git push（如果有設定 Vercel Git Integration）
git add .
git commit -m "feat: 實作 backend authentication"
git push origin main
```

### 6. 測試流程

#### 測試 Edge Function

```bash
# 使用 curl 測試（需要先從 LINE 取得真實的 code）
curl -X POST https://your-project.supabase.co/functions/v1/auth-line-callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test-code",
    "state": "test-state",
    "code_verifier": "test-verifier",
    "redirect_uri": "https://oflow-website.vercel.app/auth/line-callback"
  }'
```

#### 測試完整流程

1. 在 Mobile App 點擊「使用 LINE 登入」
2. 在 LINE 授權頁面授權
3. 觀察 console logs：

```
[LINE Login] 啟動 OAuth 流程...
[LINE Callback] 呼叫 Edge Function...
[Auth] 收到 LINE callback 請求
[Auth] 交換 LINE access token...
[Auth] 取得使用者: XXX
[Auth] Supabase Auth user ID: xxx-xxx-xxx
[Auth] public.users 同步成功
[Auth] Session 建立成功
[LINE Callback] 取得 session 成功
[Login] 收到 deep link callback
[Login] 設定 Supabase session...
[Login] Supabase session 設定成功
```

4. 驗證 RLS：

```typescript
// 在 app 中執行
const { data, error } = await supabase.auth.getUser();
console.log("當前使用者:", data.user?.id);

// 嘗試查詢資料（應該只能看到自己的資料）
const { data: teams } = await supabase.from("teams").select("*");
console.log("可見團隊:", teams);
```

## 🔧 故障排除

### 問題 1: Edge Function 回傳 400/500 錯誤

**可能原因**：

- 環境變數未設定
- LINE credentials 不正確

**解決方法**：

```bash
# 檢查 Edge Function logs
npx supabase functions logs auth-line-callback --tail

# 重新部署
npx supabase functions deploy auth-line-callback
```

### 問題 2: "Session 設定失敗"

**可能原因**：

- access_token 格式不正確
- Supabase URL 設定錯誤

**解決方法**：

```typescript
// 在 mobile app 中檢查
console.log("Session tokens:", {
  access_token: session.access_token.substring(0, 20),
  refresh_token: session.refresh_token.substring(0, 20),
});
```

### 問題 3: RLS policies 仍然不生效

**檢查步驟**：

1. 確認 migration 已執行：

```sql
SELECT * FROM users LIMIT 1;
-- 應該看到 auth_user_id 欄位
```

2. 確認當前 session：

```typescript
const { data } = await supabase.auth.getSession();
console.log("Session:", data.session?.user?.id);
```

3. 測試 auth.uid()：

```sql
SELECT auth.uid();
-- 如果回傳 NULL，表示沒有 session
```

### 問題 4: "未收到有效的 session tokens"

**可能原因**：

- Edge Function URL 不正確
- CORS 問題

**解決方法**：
檢查 website callback 頁面的 Edge Function URL：

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log(
  "Edge Function URL:",
  `${supabaseUrl}/functions/v1/auth-line-callback`
);
```

## 🚨 重要提醒

### 安全性

1. ⚠️ **絕對不要**將 `SUPABASE_SERVICE_ROLE_KEY` 暴露在 client 端
2. ⚠️ **絕對不要**將 `LINE_CHANNEL_SECRET` 暴露在 client 端
3. ✅ 這些敏感資訊現在只存在於 Supabase Edge Function 環境變數中

### Breaking Changes

1. **所有使用者需要重新登入**

   - 舊的 local storage session 不相容
   - 建議在 app 啟動時檢查並清除

2. **fetchUserTeams 參數改變**

   - 之前：`fetchUserTeams(supabaseUserId)` - public.users.id
   - 現在：`fetchUserTeams(authUserId)` - auth.users.id
   - 需要檢查所有呼叫處

3. **RLS Policies 現在會真正運作**
   - 確保所有 API 呼叫都有正確的 session
   - 測試各種權限情境

## 📊 監控與日誌

### Supabase Edge Function Logs

```bash
# 即時監看
npx supabase functions logs auth-line-callback --tail

# 檢查最近 100 筆
npx supabase functions logs auth-line-callback --limit 100
```

### Vercel Logs

在 Vercel Dashboard → Deployments → View Function Logs

### Mobile App Logs

使用 Expo Dev Tools 或 React Native Debugger：

```bash
npx expo start
# 按 j 開啟 debugger
```

## ✅ 驗收清單

部署完成後，確認以下項目：

- [ ] Supabase Edge Function 已部署
- [ ] 環境變數已設定（4 個變數）
- [ ] 資料庫 migration 已執行
- [ ] Website 已部署到 Vercel
- [ ] LINE Login 完整流程可以運作
- [ ] `auth.uid()` 有值（不是 NULL）
- [ ] RLS policies 正確阻擋未授權存取
- [ ] Token refresh 自動運作
- [ ] 登出後無法存取資料
- [ ] 多裝置登入正確處理

## 🎉 完成！

架構遷移完成後，你的系統將具備：

✅ 真正的 Supabase Auth 整合
✅ 運作中的 RLS policies
✅ Backend-side token 交換
✅ 安全的 credentials 管理
✅ 自動的 session 管理

有任何問題請參考 [Supabase Auth 文件](https://supabase.com/docs/guides/auth)。
