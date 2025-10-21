# Vercel 部署指南 - LINE Login HTTPS 修復

## ✅ 已完成的程式碼修改

1. ✅ 建立 `website/app/auth/line-callback/page.tsx` - 處理 LINE OAuth callback
2. ✅ 建立 `mobile/.env.example` - 環境變數範本
3. ✅ 修改 `mobile/services/lineLoginService.ts` - 使用 HTTPS redirect URI

## 📋 接下來需要你執行的步驟

### 步驟 1: 安裝 Vercel CLI（如果尚未安裝）

```bash
npm i -g vercel
```

### 步驟 2: 部署 Website 到 Vercel

```bash
# 進入 website 目錄
cd /Users/alex/Desktop/OFlow-monorepo/website

# 登入 Vercel（首次使用需要）
vercel login

# 部署到 Vercel
vercel --prod
```

**重要提示：**

- 部署過程會詢問一些問題，使用預設值即可（直接按 Enter）
- 部署完成後，記下你的 **Vercel domain**，例如：
  - `oflow-website-xxx.vercel.app`
  - 或你設定的自訂 domain

### 步驟 3: 更新 Mobile App 配置

#### 3.1 更新 `.env` 檔案

編輯 `mobile/.env` 檔案（如果不存在，從 `.env.example` 複製）：

```env
EXPO_PUBLIC_LINE_CHANNEL_ID=你的_LINE_CHANNEL_ID
EXPO_PUBLIC_LINE_REDIRECT_URI=https://你的Vercel域名.vercel.app/auth/line-callback
EXPO_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
```

**範例：**

```env
EXPO_PUBLIC_LINE_REDIRECT_URI=https://oflow-website-git-main-alex.vercel.app/auth/line-callback
```

#### 3.2 更新 `app.config.js`

編輯 `mobile/app.config.js`，將第 67-69 行替換為：

```javascript
lineRedirectUri:
  process.env.EXPO_PUBLIC_LINE_REDIRECT_URI ||
  "https://你的Vercel域名.vercel.app/auth/line-callback",
```

### 步驟 4: 驗證 Vercel 部署

在瀏覽器中訪問：

```
https://你的Vercel域名.vercel.app/auth/line-callback
```

應該會看到「缺少必要參數」的錯誤頁面（這是正常的，表示頁面已部署成功）。

### 步驟 5: 更新 LINE Developers Console

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 登入並選擇你的 Channel
3. 點擊「LINE Login」標籤
4. 找到「**Callback URL**」區段，點擊「Edit」
5. 添加你的 callback URL：
   ```
   https://你的Vercel域名.vercel.app/auth/line-callback
   ```
6. 向下捲動，找到「Use LINE Login in your mobile app」→「iOS」
7. 在「**iOS universal link**」欄位填入相同的 URL：
   ```
   https://你的Vercel域名.vercel.app/auth/line-callback
   ```
8. 點擊「Update」儲存設定
9. ⏰ **等待 5-10 分鐘** 讓設定生效

### 步驟 6: 重新啟動開發環境

```bash
cd /Users/alex/Desktop/OFlow-monorepo/mobile

# 清除快取並重新啟動
npx expo start --clear

# 或重新編譯（如果需要）
npx expo prebuild --clean
npx expo run:ios
```

### 步驟 7: 測試 LINE Login

1. 在模擬器或真機上開啟 App
2. 點擊「使用 LINE 登入」
3. 應該會開啟瀏覽器並顯示 LINE 授權頁面（**不再是 400 錯誤！**）
4. 完成授權後會跳轉到你的 Vercel 頁面
5. 點擊「立即跳轉」按鈕返回 App
6. 完成登入流程

## 🎯 預期的登入流程

```
OFlow App
   ↓ (點擊登入)
Safari/Chrome 開啟 LINE 授權頁
   ↓ (授權)
跳轉到 Vercel 頁面 (顯示成功畫面)
   ↓ (3秒倒數 或 手動點擊按鈕)
跳回 OFlow App
   ↓
完成登入，同步用戶資料
```

## 🔍 Console 輸出檢查

成功的 Console 輸出應該類似：

```
LOG  [Login] 開始 LINE 登入流程...
LOG  [LINE Login] Redirect URI: https://你的域名.vercel.app/auth/line-callback
LOG  [LINE Login] 啟動 OAuth 流程...
LOG  [LINE Login] 授權成功，開始交換 token...
LOG  [LINE Login] Token 交換成功
LOG  [LINE Login] 取得使用者資料...
LOG  [Login] 同步至 Supabase...
LOG  [Login] 登入成功
```

## ❗ 常見問題排解

### Q1: 仍然看到 400 錯誤

**檢查清單：**

- [ ] LINE Console 的 Callback URL 是否已更新為 HTTPS URL？
- [ ] 是否已等待 5-10 分鐘讓設定生效？
- [ ] `.env` 檔案的 `EXPO_PUBLIC_LINE_REDIRECT_URI` 是否正確？
- [ ] 是否已重新啟動 expo（`npx expo start --clear`）？

### Q2: 點擊按鈕後沒有跳回 App

**可能原因：**

- App 未在模擬器/真機上運行
- Custom scheme (`oflow://`) 配置問題

**解決方法：**

1. 確認 `app.config.js` 中 `scheme: "oflow"` 設定正確（第 8 行）
2. 重新編譯：`npx expo prebuild --clean`
3. 確認 App 正在運行中

### Q3: Vercel 頁面顯示 404

**解決方法：**

- 確認已在 `website` 目錄執行 `vercel --prod`
- 檢查 `website/app/auth/line-callback/page.tsx` 是否存在
- 重新部署：`cd website && vercel --prod`

### Q4: Token 交換失敗

**檢查：**

- Console 中的 redirect URI 是否與 LINE Console 設定一致？
- LINE Channel ID 是否正確？
- 網路連線是否正常？

## 📝 下一步優化（未來可選）

完成基本流程後，未來可以考慮：

1. **申請 Apple Developer 帳號**（NT$2,990/年）

   - 設定 Universal Links
   - 實現自動跳轉（無需手動點擊按鈕）

2. **自訂 Vercel Domain**

   - 使用更專業的域名（例如：`app.oflow.com`）

3. **增強錯誤處理**
   - 添加 retry 機制
   - 改善錯誤訊息顯示

## ✅ 完成檢查表

- [ ] Vercel CLI 已安裝
- [ ] Website 已部署到 Vercel
- [ ] 獲得 Vercel domain
- [ ] 更新 `mobile/.env`
- [ ] 更新 `mobile/app.config.js`
- [ ] 驗證 Vercel callback 頁面可訪問
- [ ] 更新 LINE Console Callback URL
- [ ] 更新 LINE Console iOS universal link
- [ ] 等待 5-10 分鐘
- [ ] 重新啟動 expo
- [ ] 測試完整登入流程
- [ ] 確認 token 交換成功
- [ ] 確認用戶資料同步到 Supabase

---

**祝你部署順利！🚀**

有任何問題隨時詢問。
