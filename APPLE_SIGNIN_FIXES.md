# Apple Sign In 修復總結

## 🐛 發現的問題

你的觀察非常正確！雖然 Database migration 已經執行成功（支援 `apple_user_id` 和 `auth_provider`），但是 **3 個 Edge Functions 還在用 `line_user_id` 查詢用戶**，導致 Apple 用戶無法通過驗證。

### 問題位置

在以下 3 個 Edge Functions 的 `authenticateUser` 函數中：

1. **`team-operations/index.ts`** (第 36 行)
2. **`order-operations/index.ts`** (第 36 行)
3. **`product-operations/index.ts`** (第 36 行)

### 錯誤程式碼

```typescript
// ❌ 問題：只查詢 line_user_id
const { data: publicUser, error: publicUserError } = await supabaseAdmin
  .from("users")
  .select("id, line_user_id, line_display_name")
  .eq("line_user_id", user.user_metadata.line_user_id) // ← Apple 用戶沒有這個
  .single();
```

**結果**：Apple 用戶登入後，查詢團隊時拋出 `User not found in database` 錯誤。

---

## ✅ 修復方案

### 修改內容

將所有 3 個 Edge Functions 的查詢改為：

```typescript
// ✅ 修復：改用 auth_user_id 查詢，支援 LINE 和 Apple 用戶
const { data: publicUser, error: publicUserError } = await supabaseAdmin
  .from("users")
  .select("id, line_user_id, apple_user_id, line_display_name, auth_provider")
  .eq("auth_user_id", user.id) // ← 通用查詢方式
  .single();
```

### 為什麼這樣改？

1. **`auth_user_id`** 是所有用戶的統一識別碼（來自 `auth.users(id)`）
2. **LINE 用戶**：有 `line_user_id`，`auth_user_id` 指向 Supabase Auth
3. **Apple 用戶**：有 `apple_user_id`，`auth_user_id` 指向 Supabase Auth
4. 使用 `auth_user_id` 查詢，兩種用戶都能正常運作

---

## 📦 需要部署的 Edge Functions

已修改的 Edge Functions：

1. ✅ **auth-apple-callback** (新增) - Apple Sign In 處理
2. ✅ **team-operations** (更新) - 改用 `auth_user_id` 查詢
3. ✅ **order-operations** (更新) - 改用 `auth_user_id` 查詢
4. ✅ **product-operations** (更新) - 改用 `auth_user_id` 查詢

---

## 🚀 部署步驟

### 方式 1：使用部署腳本（推薦）

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase
chmod +x deploy-apple-signin.sh
./deploy-apple-signin.sh
```

### 方式 2：手動部署

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase

# 部署新增的 Apple Sign In handler
supabase functions deploy auth-apple-callback

# 部署更新的 Edge Functions
supabase functions deploy team-operations
supabase functions deploy order-operations
supabase functions deploy product-operations
```

---

## 🧪 測試驗證

部署完成後：

1. **登出** App（如果有登入）
2. **重新進行 Apple Sign In**
3. **預期結果**：
   - ✅ Apple Sign In 成功
   - ✅ Session 建立成功
   - ✅ 查詢團隊成功（不再有 "User not found" 錯誤）
   - ✅ 導航到團隊設定頁面

---

## 📊 架構說明

### 修復前的架構問題

```
Apple 用戶登入
  ↓
Edge Function: auth-apple-callback
  ↓
建立 public.users (有 apple_user_id, 沒有 line_user_id)
  ↓
前端查詢團隊 (呼叫 team-operations)
  ↓
team-operations 查詢: WHERE line_user_id = ?  ❌ 找不到
  ↓
錯誤: "User not found in database"
```

### 修復後的架構

```
Apple 用戶登入
  ↓
Edge Function: auth-apple-callback
  ↓
建立 public.users (有 apple_user_id, auth_user_id)
  ↓
前端查詢團隊 (呼叫 team-operations)
  ↓
team-operations 查詢: WHERE auth_user_id = ?  ✅ 找到了！
  ↓
成功返回團隊列表
```

---

## 🎯 其他 Edge Functions 為什麼不需要修改？

### 不需要修改的：

- **`line-webhook`** - 專門處理 LINE 訊息，只有 LINE 用戶會觸發
- **`auth-line-callback`** - 專門處理 LINE 登入，只有 LINE 用戶會使用

這些函數的 `.eq("line_user_id")` 查詢是正確的，因為它們本來就只服務 LINE 用戶。

### 需要修改的：

- **`team-operations`** - 所有用戶都會查詢團隊
- **`order-operations`** - 所有用戶都會管理訂單
- **`product-operations`** - 所有用戶都會管理商品

這些是**通用的業務邏輯函數**，必須支援所有登入方式（LINE, Apple, 未來可能的 Google 等）。

---

## ✨ 總結

### 問題根源

Migration 已經支援 Apple 用戶，但 Edge Functions 還在用舊的查詢方式（只查 `line_user_id`）。

### 解決方案

所有通用業務邏輯改用 `auth_user_id` 查詢，這是所有登入方式的統一識別碼。

### 影響範圍

- ✅ **LINE 用戶**：不受影響，繼續正常使用
- ✅ **Apple 用戶**：現在可以正常查詢團隊和管理訂單
- ✅ **未來擴展**：如果加入 Google Sign In 等，不需要再修改這些函數

---

**修復時間**：2025-11-07  
**修復原因**：用戶精準發現了架構不一致的問題 🎯  
**下一步**：部署 Edge Functions，然後測試 Apple Sign In
