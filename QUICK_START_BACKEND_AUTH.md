# 🚀 Backend Authentication 快速開始

本指南幫助你在 5 分鐘內完成新架構的設定與測試。

## 📋 前置需求

- ✅ Supabase 專案已建立
- ✅ LINE Developers Console 帳號
- ✅ Vercel 帳號（website 部署）
- ✅ 已安裝 Supabase CLI

## ⚡ 5 步驟快速設定

### 步驟 1: 設定環境變數（2 分鐘）

#### 1.1 Supabase Edge Function Secrets

在 [Supabase Dashboard](https://app.supabase.com) → Settings → Edge Functions → Add new secret:

```bash
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[從 Supabase Dashboard → Settings → API 取得]
LINE_CHANNEL_ID=[從 LINE Console 取得]
LINE_CHANNEL_SECRET=[從 LINE Console 取得]
```

#### 1.2 Website 環境變數

在 Vercel Dashboard 或 `website/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
```

### 步驟 2: 部署 Edge Function（1 分鐘）

```bash
cd supabase

# 登入（如果還沒登入）
npx supabase login

# 連結專案
npx supabase link --project-ref [your-project-ref]

# 部署
npx supabase functions deploy auth-line-callback

# ✅ 看到 "Function deployed successfully" 即成功
```

### 步驟 3: 執行資料庫 Migration（1 分鐘）

```bash
cd supabase

# 推送 migrations
npx supabase db push

# ✅ 看到 "Migrations applied successfully" 即成功
```

或在 Supabase Dashboard → SQL Editor 執行 `migrations/005_link_auth_users.sql`。

### 步驟 4: 部署 Website（30 秒）

```bash
cd website

# 部署到 Vercel
vercel --prod

# ✅ 看到部署 URL 即成功
```

### 步驟 5: 測試（1 分鐘）

在 Mobile App 中：

1. 點擊「使用 LINE 登入」
2. 完成 LINE 授權
3. 檢查 console logs：

```
✅ [Auth] Session 建立成功
✅ [Login] Supabase session 設定成功
✅ [Login] 載入團隊資料...
```

## 🧪 驗證部署

### 驗證 Edge Function

```bash
# 檢查是否部署成功
npx supabase functions list

# 應該看到：
# auth-line-callback | [version] | [timestamp]

# 檢查 logs（即時）
npx supabase functions logs auth-line-callback --tail
```

### 驗證 Database Migration

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 1. 檢查 auth_user_id 欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'auth_user_id';

-- 應該看到：
-- auth_user_id | uuid | YES

-- 2. 檢查 RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'users';

-- 應該看到使用 auth_user_id = auth.uid() 的 policies
```

### 驗證 RLS 運作

登入後，在 app 中執行：

```typescript
// 檢查 auth.uid() 有值
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("✅ Auth User ID:", user?.id);

// 測試 RLS（應該只能看到自己）
const { data: users } = await supabase.from("users").select("*");
console.log("✅ 可見使用者數量:", users?.length); // 應該是 1
```

## 🎯 成功指標

部署成功後，你應該看到：

### ✅ Edge Function

```bash
$ npx supabase functions list
auth-line-callback | v1 | 2025-10-23
```

### ✅ Database

```sql
SELECT auth_user_id FROM users LIMIT 1;
-- 回傳 UUID（不是 NULL）
```

### ✅ Mobile App Console

```
[Auth] 收到 LINE callback 請求
[Auth] 交換 LINE access token...
[Auth] 取得使用者: XXX
[Auth] Session 建立成功
[Login] Supabase session 設定成功
```

### ✅ RLS 測試

```typescript
// 嘗試存取不存在的資料
const { data } = await supabase
  .from("orders")
  .select("*")
  .eq("team_id", "00000000-0000-0000-0000-000000000000");

console.log(data); // [] (空陣列，不是錯誤)
```

## 🚨 常見問題

### Q: Edge Function 回傳 500 錯誤

**檢查**：

```bash
npx supabase functions logs auth-line-callback
```

**常見原因**：

- 環境變數未設定
- LINE_CHANNEL_SECRET 不正確

### Q: "Session 設定失敗"

**檢查**：

- Website 的 `NEXT_PUBLIC_SUPABASE_URL` 是否正確
- Edge Function 是否成功回傳 tokens

**除錯**：

```typescript
console.log(
  "Edge Function URL:",
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-line-callback`
);
```

### Q: RLS 還是不生效

**檢查步驟**：

1. 確認 migration 已執行：

```sql
SELECT * FROM users WHERE auth_user_id IS NOT NULL LIMIT 1;
```

2. 確認當前有 session：

```typescript
const { data } = await supabase.auth.getSession();
console.log("Session:", !!data.session);
```

3. 重新登入（清除舊 session）

## 📞 需要幫助？

- 📖 [完整部署指南](./BACKEND_AUTH_SETUP.md)
- 📖 [架構遷移指南](./ARCHITECTURE_MIGRATION_GUIDE.md)
- 📖 [Supabase Auth 文件](https://supabase.com/docs/guides/auth)

## 🎉 下一步

部署完成後：

1. ✅ 測試完整登入流程
2. ✅ 驗證 RLS 保護
3. ✅ 測試 token refresh
4. ✅ 測試登出功能
5. ✅ 在多個裝置測試

恭喜！你的系統現在使用安全的 backend authentication 架構了！🚀
