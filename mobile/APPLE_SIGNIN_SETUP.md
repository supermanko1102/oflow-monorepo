# Apple Sign In 設定步驟

## ✅ 已完成的部分

1. ✅ Database migration 019 已建立
2. ✅ `auth-apple-callback` Edge Function 已建立
3. ✅ `appleLoginService.ts` 已建立
4. ✅ `login.tsx` 已修改（移除帳密登入，新增 Apple Sign In）
5. ✅ `useAuthStore.ts` 已修改（新增 Apple 支援）
6. ✅ `app.config.js` 已新增 `expo-apple-authentication` plugin

---

## 🔧 需要執行的步驟

### 步驟 1：安裝依賴

在 `mobile` 目錄執行：

```bash
cd mobile
npx expo install expo-apple-authentication
```

### 步驟 2：Prebuild（重新生成 native 檔案）

執行此命令會自動配置 iOS entitlements：

```bash
npx expo prebuild --clean
```

這會自動：

- ✅ 在 `OFlow.entitlements` 加入 `com.apple.developer.applesignin`
- ✅ 配置必要的 Info.plist 設定
- ✅ 宣告 Sign In with Apple capability

### 步驟 3：安裝 CocoaPods

```bash
cd ios
pod install
cd ..
```

### 步驟 4：驗證 Entitlements

檢查 `mobile/ios/OFlow/OFlow.entitlements` 應該包含：

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

### 步驟 5：部署 Database Migration

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
-- 檔案位置：supabase/migrations/019_add_apple_signin_support.sql
```

或使用 Supabase CLI：

```bash
cd ../supabase
supabase db push
```

### 步驟 6：部署 Edge Function

```bash
cd ../supabase
supabase functions deploy auth-apple-callback
```

確保環境變數已設定：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APPLE_BUNDLE_ID` (預設為 `com.oflow.app`)

### 步驟 7：編譯測試

```bash
cd ../mobile
npx expo run:ios
```

---

## 🧪 測試檢查清單

### Database

- [ ] Migration 019 執行成功
- [ ] 測試建立 Apple 用戶
- [ ] RLS 政策正常運作

### Backend

- [ ] Edge Function 部署成功
- [ ] Apple Token 驗證正確
- [ ] Session 產生正確

### Frontend

- [ ] iOS 顯示 Apple Sign In 按鈕
- [ ] Android 不顯示 Apple Sign In 按鈕（已用 Platform.OS 限制）
- [ ] Apple 登入流程完整
- [ ] LINE 登入不受影響

### iOS

- [ ] Entitlements 包含 `com.apple.developer.applesignin`
- [ ] 編譯成功
- [ ] 實機測試通過

---

## 🚨 故障排除

### 如果 Prebuild 沒有自動加入 Entitlements

手動編輯 `mobile/ios/OFlow/OFlow.entitlements`，加入：

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

### 如果編譯錯誤

1. 清理並重建：

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios
```

2. 如果還是不行，手動開 Xcode：
   - 打開 `OFlow.xcworkspace`
   - 選擇 OFlow target
   - Signing & Capabilities → 點擊 "+ Capability"
   - 新增 "Sign in with Apple"

### 如果 Apple 登入失敗

檢查：

1. ✅ Apple Developer Portal 中 App ID 已啟用 "Sign In with Apple"
2. ✅ Bundle ID 正確（`com.oflow.app`）
3. ✅ Edge Function 已部署且環境變數正確
4. ✅ 實機測試（模擬器可能不支援）

---

## 📱 App Store 審核說明

提交審核時，在「App Review Information」說明：

> **登入說明**：
>
> - 主要登入方式：LINE Login（適用於台灣市場用戶）
> - 替代登入方式：Sign In with Apple（符合 Guideline 4.8）
> - 審核人員可使用 Apple Sign In 直接測試完整功能

---

## 🎉 完成後

- [ ] 在 TestFlight 測試
- [ ] 提交 App Store 審核
- [ ] 審核通過後，現有 LINE 用戶不受影響
- [ ] Apple 用戶和 LINE 用戶為獨立帳號

---

**建立時間**：2025-11-07  
**狀態**：準備就緒，等待執行步驟 1-7
