# Apple Sign In 實作總結

## ✅ 已完成的工作

### 1. 資料庫架構調整

**檔案**：`supabase/migrations/019_add_apple_signin_support.sql`

- ✅ 將 `users.line_user_id` 改為 NULLABLE
- ✅ 新增 `users.apple_user_id` 欄位（UNIQUE）
- ✅ 新增 `users.auth_provider` 欄位（'line' | 'apple'）
- ✅ 新增約束：確保至少有一種登入方式
- ✅ 建立索引：`idx_users_apple_user_id`, `idx_users_auth_provider`

**影響**：

- ✅ 現有 LINE 用戶不受影響（`auth_provider` 預設為 'line'）
- ✅ RLS 政策不需修改（仍透過 `auth_user_id` 運作）

---

### 2. Backend - Edge Function

**檔案**：`supabase/functions/auth-apple-callback/`

**功能**：

- ✅ 驗證 Apple ID Token（使用 Apple 公鑰 JWKS）
- ✅ 提取用戶資訊（sub, email, fullName）
- ✅ 建立/更新 Supabase Auth user
- ✅ 同步至 `public.users` 表
- ✅ 產生並回傳 Supabase session tokens

**使用套件**：

- `jose` v5.1.0（JWT 驗證）
- `@supabase/supabase-js` 2.45.4

---

### 3. Frontend - Mobile App

#### 3.1 Apple Login Service

**檔案**：`mobile/services/appleLoginService.ts`

- ✅ 封裝 `expo-apple-authentication`
- ✅ 啟動 Apple Sign In 流程
- ✅ 呼叫 `auth-apple-callback` Edge Function
- ✅ 錯誤處理（取消、無效回應、連線失敗）

#### 3.2 登入畫面

**檔案**：`mobile/app/(auth)/login.tsx`

**變更**：

- ✅ **移除**：帳密登入相關程式碼（state、函數、UI 區塊）
- ✅ **新增**：Apple Sign In 支援
  - Import `expo-apple-authentication`
  - `handleAppleLogin` 函數
  - Apple 按鈕（僅 iOS 顯示，`Platform.OS === 'ios'`）
- ✅ UI 結構：LINE 登入（主要）→ 分隔線 → 其他登入方式（Apple，僅 iOS）

#### 3.3 Auth Store

**檔案**：`mobile/stores/useAuthStore.ts`

**新增欄位**：

- `appleUserId: string | null`
- `authProvider: 'line' | 'apple' | null`

**新增函數**：

- `loginWithApple(appleUserId, supabaseUserId, userName, userPictureUrl, accessToken)`

**更新邏輯**：

- `loginWithLine` 設定 `authProvider = 'line'`
- `loginWithApple` 設定 `authProvider = 'apple'`
- `logout` 清空所有登入相關欄位

---

### 4. iOS 平台設定

**檔案**：`mobile/app.config.js`

- ✅ 在 `plugins` 陣列新增 `"expo-apple-authentication"`

**Config Plugin 自動配置**（執行 `npx expo prebuild --clean` 後）：

- ✅ 在 `OFlow.entitlements` 加入 `com.apple.developer.applesignin`
- ✅ 配置 Info.plist
- ✅ 宣告 Sign In with Apple capability

---

## 📋 接下來需要做的事

### 立即執行（在終端）

1. **安裝依賴**

   ```bash
   cd mobile
   npx expo install expo-apple-authentication
   ```

2. **Prebuild**

   ```bash
   npx expo prebuild --clean
   ```

3. **安裝 CocoaPods**

   ```bash
   cd ios && pod install && cd ..
   ```

4. **部署 Database Migration**

   ```bash
   cd ../supabase
   supabase db push
   ```

5. **部署 Edge Function**

   ```bash
   supabase functions deploy auth-apple-callback
   ```

6. **編譯測試**
   ```bash
   cd ../mobile
   npx expo run:ios
   ```

詳細步驟請參考：`mobile/APPLE_SIGNIN_SETUP.md`

---

## 🎯 架構優勢

### 1. 符合 App Store 規範

- ✅ Guideline 4.8：提供與 LINE Login 隱私程度相同的登入方式
- ✅ Apple Sign In 為官方推薦的替代方案

### 2. 用戶體驗

- ✅ LINE 用戶：主要登入方式（不受影響）
- ✅ Apple 用戶：次要登入方式（iOS 限定）
- ✅ 審核人員：可直接使用 Apple Sign In 測試

### 3. 技術架構

- ✅ **獨立帳號**：Apple 和 LINE 用戶為不同帳號（符合你的需求 2a）
- ✅ **無需開 Xcode**：使用 Config Plugin 自動配置（符合你的需求）
- ✅ **安全性**：Apple ID Token 驗證使用官方公鑰
- ✅ **可擴展**：未來可輕鬆加入 Google Sign In 等其他方式

### 4. 平台限制

- ✅ iOS：顯示 LINE + Apple 登入
- ✅ Android：只顯示 LINE 登入（Apple 按鈕自動隱藏）

---

## 📊 資料流程

### Apple Sign In 流程

```
1. 用戶點擊 Apple 按鈕
   ↓
2. expo-apple-authentication 啟動 Face ID/Touch ID 驗證
   ↓
3. Apple 回傳 identityToken (JWT)
   ↓
4. appleLoginService 呼叫 auth-apple-callback Edge Function
   ↓
5. Edge Function 驗證 Token（使用 Apple 公鑰）
   ↓
6. 建立/更新 Supabase Auth user
   ↓
7. 同步至 public.users（auth_provider = 'apple'）
   ↓
8. 產生 Supabase session tokens
   ↓
9. 前端設定 session 並更新 Auth Store
   ↓
10. 導航至主頁面或團隊設定
```

---

## 🔐 安全性

### Token 驗證

- ✅ 使用 Apple 官方 JWKS（`https://appleid.apple.com/auth/keys`）
- ✅ 驗證 `issuer`（必須為 `https://appleid.apple.com`）
- ✅ 驗證 `audience`（必須為你的 Bundle ID）
- ✅ 驗證簽章（使用 `jose` 套件）

### RLS 政策

- ✅ 所有表格仍透過 `auth_user_id` 控制權限
- ✅ Apple 用戶和 LINE 用戶享有相同的 RLS 保護

---

## 📝 重要注意事項

### 帳號獨立性

⚠️ Apple 和 LINE 是**完全獨立的帳號**

- 同一個人用 Apple 登入和 LINE 登入會是兩個不同帳號
- 需要分別建立團隊（或透過邀請碼加入）

### 現有用戶

✅ 現有 LINE 用戶完全不受影響

- Database 記錄保持不變
- `auth_provider` 預設為 'line'

### Apple Developer 要求

⚠️ 確保 Apple Developer Portal 設定：

1. App ID 已啟用 "Sign In with Apple"
2. Bundle ID 正確（`com.oflow.app`）
3. 證書與描述檔已更新

---

## 🧪 測試建議

### 1. 本地測試（模擬器）

- Apple Sign In 可能無法在模擬器完整測試
- 建議使用真實 iPhone 裝置

### 2. 功能測試

- [ ] LINE 登入流程正常
- [ ] Apple 登入流程正常（iOS）
- [ ] Android 不顯示 Apple 按鈕
- [ ] 登入後可正常存取團隊資料
- [ ] RLS 政策正常運作

### 3. Edge Case

- [ ] 第一次登入（提供 fullName）
- [ ] 重複登入（沒有 fullName）
- [ ] 取消登入
- [ ] 網路錯誤處理

---

## 📱 提交審核建議

### App Review Information 說明

在 App Store Connect 的「App Review Information」填寫：

> **登入說明**：
>
> 本應用提供兩種登入方式：
>
> 1. **LINE Login**（主要）：適用於台灣市場用戶，為主要目標用戶群的首選登入方式
> 2. **Sign In with Apple**（替代）：符合 App Store Guideline 4.8 要求，提供與 LINE Login 隱私程度相同的替代登入方式
>
> 審核人員可直接使用 Apple Sign In 測試完整功能，無需額外測試帳號。

### Demo 帳號（可選）

如果提供 LINE 登入的測試帳號，請說明：

> **LINE Login 測試帳號**（可選）：
>
> - Email: ...
> - Password: ...
>
> **Apple Sign In**：
>
> - 審核人員可直接使用自己的 Apple ID 登入測試

---

## 🎉 完成狀態

### 程式碼實作

- ✅ Database schema
- ✅ Backend Edge Function
- ✅ Frontend service
- ✅ Frontend UI
- ✅ Auth Store
- ✅ iOS 設定

### 待執行步驟

- ⏳ 安裝依賴（`npx expo install`）
- ⏳ Prebuild（`npx expo prebuild --clean`）
- ⏳ 部署 migration
- ⏳ 部署 Edge Function
- ⏳ 編譯測試
- ⏳ TestFlight 測試
- ⏳ 提交審核

---

**實作完成時間**：2025-11-07  
**實作方式**：遵循計劃，無需手動開啟 Xcode  
**下一步**：執行 `APPLE_SIGNIN_SETUP.md` 中的步驟 1-7
