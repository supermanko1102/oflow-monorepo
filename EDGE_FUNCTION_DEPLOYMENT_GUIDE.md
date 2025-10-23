# Edge Functions 部署指南

## 概述

此指南說明如何部署更新的 Edge Functions，這些 Functions 實作了全面的團隊操作 API，繞過 RLS 無限遞迴問題。

## 修改內容摘要

### 1. 資料庫 Migration

- **新增檔案：** `supabase/migrations/006_team_creation_function.sql`
- **包含函數：**
  - `create_team_with_owner()` - 建立團隊並加入擁有者
  - `leave_team()` - 離開團隊
  - `get_team_members()` - 取得團隊成員
  - `get_or_create_invite_code()` - 取得或建立邀請碼

### 2. Edge Functions

#### `auth-line-callback` (已修改)

- 在登入成功後查詢使用者團隊列表
- 在回應中返回 `teams` 陣列
- **修改位置：** 第 283-299 行

#### `team-operations` (新建)

- 統一的團隊操作 API endpoint
- **支援的操作：**
  - `GET /team-operations?action=list` - 查詢團隊列表
  - `POST /team-operations?action=create` - 建立團隊
  - `POST /team-operations?action=join` - 加入團隊
  - `POST /team-operations?action=leave` - 離開團隊
  - `GET /team-operations?action=members&team_id=xxx` - 查詢成員
  - `GET /team-operations?action=invite&team_id=xxx` - 取得邀請碼

### 3. Mobile App 修改

#### 新增檔案

- `mobile/services/teamService.ts` - Edge Function API 封裝

#### 修改檔案

- `mobile/stores/useTeamStore.ts` - 改用 teamService
- `mobile/app/(auth)/login.tsx` - 從登入回應取得團隊
- `mobile/app/(auth)/team-create.tsx` - 使用 async API
- `mobile/app/(auth)/team-join.tsx` - 使用 async API
- `mobile/services/lineLoginService.ts` - 處理 teams 資料

#### 刪除檔案

- `mobile/services/userSyncService.ts` - 已 deprecated

### 4. Website 修改

- `website/app/auth/line-callback/page.tsx` - 傳遞 teams 資料

## 部署步驟

### 步驟 1：執行 Database Migration

```bash
cd /Users/alex/Desktop/OFlow-monorepo/supabase

# 連接到遠端資料庫
npx supabase db push
```

這會執行 `006_team_creation_function.sql` migration，建立所需的 database functions。

### 步驟 2：部署 Edge Functions

```bash
# 部署更新的 auth-line-callback function
npx supabase functions deploy auth-line-callback

# 部署新的 team-operations function
npx supabase functions deploy team-operations
```

### 步驟 3：驗證部署

```bash
# 檢查 functions 狀態
npx supabase functions list

# 查看 logs
npx supabase functions logs auth-line-callback --tail
npx supabase functions logs team-operations --tail
```

### 步驟 4：重新部署 Website (Vercel)

Website 也有修改，需要重新部署：

**選項 A：透過 Git**

```bash
cd /Users/alex/Desktop/OFlow-monorepo
git add .
git commit -m "feat: migrate team operations to Edge Functions"
git push
```

Vercel 會自動部署。

**選項 B：手動部署**

```bash
cd /Users/alex/Desktop/OFlow-monorepo/website
vercel --prod
```

### 步驟 5：更新 Mobile App

由於 mobile app 有大量修改，需要重新啟動：

```bash
cd /Users/alex/Desktop/OFlow-monorepo/mobile
npm start
```

## 測試流程

### 1. 測試登入

1. 在 mobile app 點擊「使用 LINE 登入」
2. 完成 LINE 授權
3. **預期結果：**
   - Console 顯示 `[Login] 設定團隊資料...`
   - 顯示找到的團隊數量
   - 自動導航到適當頁面（無團隊/單團隊/多團隊）

### 2. 測試建立團隊

1. 前往「建立團隊」頁面
2. 輸入團隊名稱
3. 點擊「建立團隊」
4. **預期結果：**
   - 顯示「團隊建立成功！」
   - 自動進入主畫面
   - 可以在團隊列表中看到新團隊

### 3. 測試加入團隊

1. 使用另一個帳號登入
2. 前往「加入團隊」頁面
3. 輸入邀請碼
4. 點擊「加入團隊」
5. **預期結果：**
   - 顯示「已成功加入『團隊名稱』！」
   - 自動進入主畫面
   - 可以看到加入的團隊

### 4. 測試團隊成員查詢

1. 進入團隊設定
2. 查看成員列表
3. **預期結果：**
   - 顯示所有團隊成員
   - 包含姓名、頭像、角色

## 故障排除

### 問題 1：登入後看不到團隊

**檢查：**

1. Edge Function logs：
   ```bash
   npx supabase functions logs auth-line-callback --tail
   ```
2. 查看是否有 `[Auth] 查詢使用者團隊...` log
3. 檢查是否有錯誤訊息

**可能原因：**

- Database function `get_user_teams` 不存在
- RPC 呼叫失敗

**解決方案：**

```bash
# 重新執行 migration
cd supabase
npx supabase db push
```

### 問題 2：建立團隊失敗

**檢查：**

```bash
npx supabase functions logs team-operations --tail
```

**可能原因：**

- `create_team_with_owner` function 不存在
- 權限問題

**解決方案：**

- 確認 migration 已執行
- 確認使用 `service_role` key

### 問題 3：加入團隊失敗（Invalid invite code）

**可能原因：**

- 邀請碼格式不正確
- 邀請碼已過期或達到使用次數上限

**檢查：**

```sql
-- 在 Supabase SQL Editor 執行
SELECT * FROM team_invites WHERE invite_code = 'YOUR-CODE-HERE';
```

### 問題 4：Mobile App 顯示錯誤

**檢查：**

1. Mobile app console logs
2. 確認 `teamService.ts` 中的 URL 正確
3. 確認 access token 有效

**常見錯誤：**

- `未登入或 session 已過期` → 重新登入
- `API 呼叫失敗` → 檢查 Edge Function 狀態
- `網路連線問題` → 檢查網路設定

## 架構變更總結

### Before (舊架構)

```
Mobile App → Supabase Client SDK → RLS Policies → Database
                                      ↓
                                  ❌ 無限遞迴錯誤
```

### After (新架構)

```
Mobile App → Edge Functions (service_role) → Database Functions → Database
                                                  ↓
                                              ✅ 繞過 RLS
```

### 優勢

1. **解決 RLS 遞迴問題** - 使用 service_role 完全繞過 RLS
2. **統一 API** - 所有團隊操作統一在 Edge Function 中
3. **更好的安全性** - 在 server-side 驗證所有操作
4. **更易擴展** - 未來加入業務邏輯更容易
5. **更好的效能** - 減少 client-database 往返次數

## 後續工作

目前已實作的功能：

- ✅ 登入時取得團隊列表
- ✅ 建立團隊
- ✅ 加入團隊
- ✅ 離開團隊
- ✅ 查詢團隊成員
- ✅ 取得邀請碼

未來可能需要的功能：

- [ ] 移除團隊成員 (owners/admins only)
- [ ] 更新成員權限
- [ ] 刪除團隊 (owner only)
- [ ] 更新團隊資訊
- [ ] 邀請碼管理（停用、設定過期時間等）

## 回滾計畫

如果部署後遇到問題，可以：

1. **回滾 Edge Functions：**

   - 在 Supabase Dashboard 中選擇之前的版本

2. **回滾 Database Migration：**

   ```bash
   # 建立回滾 migration
   npx supabase migration new rollback_team_functions
   # 手動編輯該檔案，加入 DROP FUNCTION 語句
   npx supabase db push
   ```

3. **回滾 Code：**
   ```bash
   git revert HEAD
   git push
   ```

## 聯絡資訊

如有問題，請查看：

- Supabase Dashboard Logs
- Mobile App Console Logs
- 本文件的故障排除章節
