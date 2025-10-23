# 修復 LINE 登入錯誤 - 設定指南

## ✅ 已完成

1. **改善錯誤處理** - 已修改以下檔案：
   - `website/app/auth/line-callback/page.tsx` - 新增環境變數檢查
   - `mobile/app/(auth)/login.tsx` - 改善錯誤訊息顯示

2. **驗證 Edge Function 部署** - ✅ 已確認部署成功
   - Function: `auth-line-callback`
   - 狀態: ACTIVE
   - 版本: 1
   - 部署時間: 2025-10-23 07:15:51

## 🔧 待完成步驟

### 步驟 1: 取得 Supabase 專案資訊

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. 前往 **Settings** → **API**
4. 記下以下資訊：
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **Project Reference ID**: `[your-project-ref]`（在 URL 中）

### 步驟 2: 設定 Vercel 環境變數

1. 登入 [Vercel Dashboard](https://vercel.com)
2. 選擇您的 `oflow-website` 專案
3. 前往 **Settings** → **Environment Variables**
4. 新增以下變數：

| 變數名稱 | 值 | 環境 |
|---------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[your-project-ref].supabase.co` | Production ✓ Preview ✓ Development ✓ |

**重要事項**：
- ✅ 必須勾選所有三個環境（Production, Preview, Development）
- ✅ 變數名稱必須完全一致，包含 `NEXT_PUBLIC_` 前綴
- ✅ URL 不要包含結尾的斜線

### 步驟 3: 驗證 Supabase Edge Function Secrets

確保以下環境變數已在 Supabase 設定：

1. 在 [Supabase Dashboard](https://app.supabase.com) → **Edge Functions** → **Settings**
2. 檢查以下 secrets 是否已設定：

| Secret 名稱 | 如何取得 | 必須 |
|------------|---------|------|
| `SUPABASE_URL` | Settings → API → Project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role (secret) | ✅ |
| `LINE_CHANNEL_ID` | LINE Developers Console | ✅ |
| `LINE_CHANNEL_SECRET` | LINE Developers Console | ✅ |

**如果缺少任何 secret**，請執行：

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase

# 設定單個 secret
npx supabase secrets set SUPABASE_URL=https://[your-project-ref].supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
npx supabase secrets set LINE_CHANNEL_ID=[your-line-channel-id]
npx supabase secrets set LINE_CHANNEL_SECRET=[your-line-channel-secret]
```

或一次設定所有：

```bash
npx supabase secrets set \
  SUPABASE_URL=https://[your-project-ref].supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key] \
  LINE_CHANNEL_ID=[your-line-channel-id] \
  LINE_CHANNEL_SECRET=[your-line-channel-secret]
```

### 步驟 4: 重新部署 Vercel

環境變數設定後，**必須重新部署**才能生效：

**方法 A: 使用 Vercel CLI**
```bash
cd /Users/alex/Desktop/OFlow-monorepo/website
vercel --prod
```

**方法 B: 使用 Vercel Dashboard**
1. 前往 **Deployments** 頁面
2. 找到最新的部署
3. 點擊右側的 **⋯** → **Redeploy**
4. 確認 **Use existing Build Cache** 不要勾選（確保使用新環境變數）

### 步驟 5: 測試登入流程

1. **在 mobile app 中測試**：
   ```bash
   cd /Users/alex/Desktop/OFlow-monorepo/mobile
   npm start
   ```

2. **點擊「使用 LINE 登入」**

3. **觀察 console logs**，應該看到：
   ```
   ✅ [LINE Login] 啟動 OAuth 流程...
   ✅ [LINE Callback] Supabase URL: https://[your-project].supabase.co
   ✅ [LINE Callback] 呼叫 Edge Function...
   ✅ [LINE Callback] 取得 session 成功
   ✅ [Login] Supabase session 設定成功
   ✅ [Login] 載入團隊資料...
   ```

4. **如果看到錯誤**：
   - 檢查錯誤訊息中是否還有 "Load failed"
   - 如果看到 "Configuration error"，表示 Vercel 環境變數還沒設定
   - 如果看到其他錯誤，檢查 Supabase Edge Function logs：
     ```bash
     cd /Users/alex/Desktop/OFlow-monorepo/supabase
     npx supabase functions logs auth-line-callback --tail
     ```

## 🎯 驗證清單

完成後，請確認以下項目：

- [ ] Vercel 環境變數 `NEXT_PUBLIC_SUPABASE_URL` 已設定
- [ ] 所有 Supabase Edge Function secrets 已設定
- [ ] Vercel 已重新部署（可在 Deployments 頁面看到新的部署）
- [ ] 測試登入成功，能正常進入 app

## 🔍 故障排除

### 錯誤 1: 仍然看到 "Load failed"

**檢查**：
1. Vercel 環境變數是否正確設定？
2. Vercel 是否已重新部署？
3. 使用瀏覽器開發者工具檢查 network 請求：
   - 開啟 Safari/Chrome DevTools
   - 前往 `https://oflow-website.vercel.app/auth/line-callback`
   - 檢查 console 中的 "Supabase URL" log

### 錯誤 2: "Edge Function 呼叫失敗"

**檢查 Edge Function logs**：
```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase
npx supabase functions logs auth-line-callback --tail
```

**常見原因**：
- `LINE_CHANNEL_SECRET` 不正確
- `SUPABASE_SERVICE_ROLE_KEY` 不正確
- LINE OAuth redirect URI 設定不符

### 錯誤 3: "Session 設定失敗"

**檢查**：
1. Edge Function 是否成功回傳 tokens？（檢查 logs）
2. Mobile app 的 Supabase 配置是否正確？
3. 檢查 `mobile/lib/supabase.ts` 中的設定

## 📞 需要進一步協助

如果問題仍未解決，請提供：
1. Vercel 環境變數截圖
2. Mobile app console 完整 logs
3. Supabase Edge Function logs
4. 瀏覽器 DevTools console logs（在 callback page）

## 📝 程式碼修改紀錄

已修改以下檔案（已 commit）：

1. **website/app/auth/line-callback/page.tsx**
   - 新增 `NEXT_PUBLIC_SUPABASE_URL` 檢查
   - 移除 fallback URL
   - 新增詳細的 console logs

2. **mobile/app/(auth)/login.tsx**
   - 改善錯誤訊息處理
   - 在開發模式下顯示詳細錯誤
   - 新增 Configuration error 處理

