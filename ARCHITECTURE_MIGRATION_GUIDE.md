# 架構遷移指南：從 Client-Side 到 Backend Authentication

## 📊 架構對比

### 舊架構（不安全）

```
┌─────────────────────────┐
│      Mobile App         │
│                         │
│  1. LINE Login (PKCE)   │
│  2. 直接交換 token      │
│  3. 呼叫 LINE API       │
│  4. 直接寫入 users 表   │
│                         │
│  ⚠️ 未使用 Auth         │
│  ⚠️ RLS 無效            │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│   Supabase Database     │
│                         │
│  🔴 anon key 可存取所有  │
│  🔴 auth.uid() = null   │
└─────────────────────────┘
```

### 新架構（安全）

```
┌─────────────────────────┐
│      Mobile App         │
│                         │
│  1. LINE Login          │
│  2. 開啟授權頁面        │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│    LINE Platform        │
│                         │
│  用戶授權               │
└─────────────────────────┘
         ↓ 回傳 code
┌─────────────────────────┐
│  Vercel Callback Page   │
│                         │
│  接收 code + verifier   │
└─────────────────────────┘
         ↓ 呼叫 Edge Function
┌─────────────────────────┐
│  Supabase Edge Function │
│                         │
│  1. 驗證 LINE code      │
│  2. 建立 Auth user      │
│  3. 同步 public.users   │
│  4. 產生 session token  │
└─────────────────────────┘
         ↓ 回傳 tokens
┌─────────────────────────┐
│      Mobile App         │
│                         │
│  setSession(tokens)     │
│  ✅ auth.uid() 有值      │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│   Supabase Database     │
│                         │
│  ✅ RLS 保護運作中       │
│  ✅ JWT 驗證             │
└─────────────────────────┘
```

## 🔑 關鍵變更

### 1. 認證流程

| 項目               | 舊架構                | 新架構                               |
| ------------------ | --------------------- | ------------------------------------ |
| **Token 交換位置** | Client                | Backend (Edge Function)              |
| **User 建立**      | 手動寫入 public.users | Edge Function 建立 auth.users + sync |
| **Session 管理**   | Zustand (local only)  | Supabase Auth (persistent + secure)  |
| **RLS 狀態**       | 🔴 無效               | ✅ 運作中                            |

### 2. 資料庫 Schema 變更

```sql
-- 新增欄位
ALTER TABLE users ADD COLUMN auth_user_id UUID;

-- 舊架構
users {
  id: UUID                    -- 自動產生
  line_user_id: TEXT          -- LINE ID
  -- 沒有連結到 auth.users
}

-- 新架構
users {
  id: UUID                    -- 自動產生
  auth_user_id: UUID          -- ✅ 連結到 auth.users(id)
  line_user_id: TEXT          -- LINE ID (保留作為業務識別)
}
```

### 3. RLS Policies 變更

```sql
-- 舊 Policy（無效）
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid()::text = line_user_id);
  -- ❌ auth.uid() 永遠是 null

-- 新 Policy（有效）
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid());
  -- ✅ auth.uid() 來自 JWT token
```

### 4. API 呼叫變更

```typescript
// 舊架構：需要手動帶 user_id
const { data } = await supabase
  .from("orders")
  .select("*")
  .eq("team_id", currentTeamId)
  .eq("created_by", userId); // 容易偽造

// 新架構：RLS 自動過濾
const { data } = await supabase
  .from("orders")
  .select("*")
  .eq("team_id", currentTeamId);
// RLS 自動確保只能看到自己團隊的訂單
```

## 📝 檔案變更清單

### 新增檔案

- ✅ `supabase/functions/auth-line-callback/index.ts` - Edge Function
- ✅ `supabase/functions/auth-line-callback/deno.json` - Deno 配置
- ✅ `supabase/migrations/005_link_auth_users.sql` - 資料庫 migration
- ✅ `BACKEND_AUTH_SETUP.md` - 部署指南
- ✅ `ARCHITECTURE_MIGRATION_GUIDE.md` - 本文件

### 修改檔案

#### Backend

- ✅ `website/app/auth/line-callback/page.tsx`
  - 新增呼叫 Edge Function
  - 回傳 Supabase tokens (不是 LINE code)

#### Mobile App

- ✅ `mobile/services/lineLoginService.ts`

  - 移除 `exchangeCodeForToken()` - 改在 backend
  - 移除 `getLineUserProfile()` - 改在 backend
  - 簡化 `handleAuthCallback()` - 只解析 tokens
  - 新增將 code_verifier 附加到 redirect_uri

- ✅ `mobile/app/(auth)/login.tsx`

  - 使用 `supabase.auth.setSession()` 設定 session
  - 從 user metadata 取得 LINE 資料
  - 移除手動 `syncUserWithSupabase()` 呼叫

- ✅ `mobile/services/userSyncService.ts`

  - 標記 `syncUserWithSupabase()` 為 deprecated
  - 保留其他查詢函數

- ✅ `mobile/lib/supabase.ts`
  - 已正確配置 auth storage（之前就有）

## 🚨 Breaking Changes 與遷移策略

### 1. 現有使用者需要重新登入

**原因**：舊 session 在 local storage，不包含 Supabase Auth token

**遷移策略**：

```typescript
// 在 app 啟動時檢查並清除舊 session
// 例如在 _layout.tsx 或 App.tsx

useEffect(() => {
  const checkAndMigrateAuth = async () => {
    // 檢查是否有舊的 auth state（沒有 auth session）
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const hasLocalAuth = useAuthStore.getState().isLoggedIn;

    if (hasLocalAuth && !session) {
      // 有舊的 local auth，但沒有 Supabase session
      console.log("[Migration] 清除舊的 auth state");
      useAuthStore.getState().logout();

      Alert.alert("需要重新登入", "系統已升級，請重新使用 LINE 登入", [
        { text: "確定" },
      ]);
    }
  };

  checkAndMigrateAuth();
}, []);
```

### 2. fetchUserTeams 參數類型改變

**之前**：使用 `public.users.id`（自動產生的 UUID）

```typescript
// 舊架構
const supabaseUser = await syncUserWithSupabase(lineProfile);
await fetchUserTeams(supabaseUser.id); // public.users.id
```

**現在**：使用 `auth.users.id`（Supabase Auth UUID）

```typescript
// 新架構
const { data } = await supabase.auth.setSession(tokens);
await fetchUserTeams(data.user.id); // auth.users.id
```

**遷移策略**：

檢查所有呼叫 `fetchUserTeams` 的地方，確保傳入正確的 ID。

### 3. 開發模式 Mock 登入

**問題**：Mock 登入現在也需要 Supabase session

**選項 A**：為 Mock 登入建立測試用 Auth user

```typescript
const handleMockLogin = async () => {
  // 使用固定的測試帳號登入
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "test@oflow.local",
    password: "test-password-123",
  });

  if (error) {
    console.error("Mock 登入失敗:", error);
    return;
  }

  // 更新 local store
  // ...
};
```

**選項 B**：在開發環境暫時停用 RLS

```sql
-- 在 Supabase Dashboard 執行（僅開發環境）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
-- 等等...

-- ⚠️ 記得在生產環境啟用！
```

**推薦**：選項 A 更安全

## 🧪 測試清單

### Edge Function 測試

```bash
# 1. 測試 Edge Function 部署
npx supabase functions list

# 2. 檢查 logs
npx supabase functions logs auth-line-callback --tail

# 3. 測試環境變數
npx supabase functions invoke auth-line-callback \
  --body '{"test": true}'
```

### RLS 測試

```typescript
// 1. 測試 auth.uid() 有值
const {
  data: { user },
} = await supabase.auth.getUser();
console.assert(user?.id, "auth.uid() should have value");

// 2. 測試只能看到自己的資料
const { data: users } = await supabase.from("users").select("*");
console.assert(users?.length === 1, "Should only see own user");

// 3. 測試無法存取其他團隊資料
const { data: otherTeamOrders } = await supabase
  .from("orders")
  .select("*")
  .eq("team_id", "other-team-id");
console.assert(otherTeamOrders?.length === 0, "RLS should block access");
```

### 完整流程測試

- [ ] LINE Login 授權流程
- [ ] Edge Function 成功回傳 tokens
- [ ] App 成功設定 Supabase session
- [ ] 使用者資料同步到 public.users
- [ ] auth_user_id 正確關聯
- [ ] RLS policies 阻擋未授權存取
- [ ] Token 自動 refresh
- [ ] 登出後無法存取資料
- [ ] 重新登入後資料正確載入

## 📚 相關文件

- [BACKEND_AUTH_SETUP.md](./BACKEND_AUTH_SETUP.md) - 詳細部署步驟
- [Supabase Auth 文件](https://supabase.com/docs/guides/auth)
- [Supabase Edge Functions 文件](https://supabase.com/docs/guides/functions)
- [LINE Login 文件](https://developers.line.biz/en/docs/line-login/)

## 🎯 預期結果

架構遷移完成後：

✅ **安全性提升**

- RLS policies 真正運作
- 敏感 credentials 不在 client
- JWT-based 認證

✅ **最佳實踐**

- OAuth token 交換在 backend
- Supabase Auth 統一管理 session
- 正確的 auth 架構

✅ **使用者體驗**

- 登入流程不變（使用者無感）
- 自動 token refresh
- 多裝置同步

✅ **開發體驗**

- RLS 簡化查詢邏輯
- 不需手動管理 session
- 更容易測試權限
