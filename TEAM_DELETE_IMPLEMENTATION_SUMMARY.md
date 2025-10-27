# 團隊刪除功能實施總結

## 📋 概述

成功實作團隊硬刪除功能，只有 owner 可以刪除團隊，採用三層確認機制防止誤刪，刪除後資料永久移除無法復原。

實施日期：2025-10-27

---

## ✅ 完成項目

### 1. Database Function

**新增 Migration：**

- `supabase/migrations/013_team_delete_function.sql`

**核心功能：**

```sql
CREATE OR REPLACE FUNCTION delete_team(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
```

**權限檢查：**

- ✅ 檢查使用者是否為團隊成員
- ✅ 檢查使用者是否為 owner
- ✅ 非 owner 會被阻止刪除

**CASCADE 刪除：**

- ✅ 團隊資料 (teams)
- ✅ 團隊成員關係 (team_members)
- ✅ 團隊邀請碼 (team_invites)
- ✅ 訂單資料 (orders)
- ✅ 客戶資料 (customers)
- ✅ LINE 訊息記錄 (line_messages)
- ✅ 提醒 (reminders)
- ✅ 對話記錄 (line_conversations)

---

### 2. Backend API

**更新檔案：**

- `supabase/functions/team-operations/index.ts`

**新增 Action：**

```typescript
if (action === "delete") {
  // 呼叫 delete_team RPC
  // 檢查權限
  // 永久刪除團隊
}
```

**位置：** 在 `leave` action 之後、`update-line-settings` action 之前

---

### 3. Frontend Service

**更新檔案：**

- `mobile/services/teamService.ts`

**新增函數：**

```typescript
export async function deleteTeam(teamId: string): Promise<void>;
```

**功能：**

- 呼叫 team-operations Edge Function 的 delete action
- 錯誤處理和日誌記錄

---

### 4. React Query Hook

**更新檔案：**

- `mobile/hooks/queries/useTeams.ts`

**新增 Hook：**

```typescript
export function useDeleteTeam();
```

**成功後行為：**

- ✅ Invalidate teams list（重新載入團隊列表）
- ✅ 移除該團隊的所有相關 cache
  - teams.members
  - teams.inviteCode

---

### 5. Frontend UI（三層確認）

**更新檔案：**

- `mobile/app/(main)/(tabs)/settings.tsx`

**新增元素：**

#### 1. Imports

```typescript
import { useDeleteTeam } from "@/hooks/queries/useTeams";
import { Modal, Portal } from "react-native-paper";
```

#### 2. State

```typescript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState("");
const deleteTeamMutation = useDeleteTeam();
```

#### 3. 處理函數

- `handleDeleteTeamPress()` - 第一層：顯示警告 Alert
- `handleConfirmDelete()` - 第二/三層：檢查團隊名稱並執行刪除

#### 4. UI 元件

**刪除按鈕：**（只有 owner 可見）

```typescript
{
  isOwner && (
    <>
      <List.Subheader>危險操作</List.Subheader>
      <List.Item
        title="刪除團隊"
        description="永久刪除此團隊和所有資料（無法復原）"
        titleStyle={{ color: "#EF4444" }}
        descriptionStyle={{ color: "#F87171" }}
        left={(props) => <List.Icon {...props} icon="delete" color="#EF4444" />}
        onPress={handleDeleteTeamPress}
        disabled={deleteTeamMutation.isPending}
      />
    </>
  );
}
```

**確認 Modal：**

```typescript
<Portal>
  <Modal visible={showDeleteModal}>
    {/* 團隊名稱輸入框 */}
    {/* 取消/確認按鈕 */}
  </Modal>
</Portal>
```

---

## 🛡️ 安全保護機制

### 三層確認流程

**第一層：Alert 警告對話框**

```
⚠️ 刪除團隊

刪除後會發生什麼？
• 所有訂單、客戶資料將永久刪除
• 此操作無法復原
• 團隊成員將失去存取權限

確定要繼續嗎？

[取消] [繼續]
```

**第二層：Modal 顯示詳細資訊**

```
⚠️ 確認刪除團隊

此操作無法復原！請輸入團隊名稱「甜點小舖」以確認刪除

[輸入框]

[取消] [確認刪除]
```

**第三層：團隊名稱驗證**

- 必須完全正確輸入團隊名稱（區分大小寫）
- 輸入不正確時，確認按鈕保持 disabled
- 輸入不正確並點擊，顯示錯誤訊息

---

### 權限控制

**前端保護：**

- ✅ 只有 owner 才會看到「刪除團隊」按鈕
- ✅ 非 owner 完全看不到這個選項

**後端保護：**

- ✅ Database function 檢查使用者角色
- ✅ 非 owner 呼叫會回傳錯誤：`"Only team owner can delete the team"`
- ✅ 即使繞過前端，後端也會阻止

---

## 🔄 使用者體驗流程

### 情境 1：Owner 刪除團隊（成功）

```
1. 使用者：在設定頁面看到「危險操作」區塊
2. 使用者：點擊「刪除團隊」
3. 系統：顯示 Alert 警告對話框
4. 使用者：點擊「繼續」
5. 系統：顯示 Modal 要求輸入團隊名稱
6. 使用者：輸入正確的團隊名稱「甜點小舖」
7. 使用者：點擊「確認刪除」
8. 系統：
   - 呼叫 API 刪除團隊
   - 顯示 loading 狀態
   - 刪除成功後顯示 toast："團隊已永久刪除"
   - 清除當前團隊 ID
   - 導航到 team-setup 頁面
9. 結果：團隊和所有相關資料永久刪除
```

---

### 情境 2：Owner 刪除團隊（輸入錯誤）

```
1-5. [同上]
6. 使用者：輸入錯誤的團隊名稱「甜點小铺」（錯字）
7. 使用者：點擊「確認刪除」
8. 系統：顯示錯誤 toast："團隊名稱不正確"
9. 結果：刪除未執行，Modal 保持開啟
```

---

### 情境 3：非 Owner 嘗試刪除

```
1. 使用者：Admin 或 Member 角色
2. 系統：設定頁面不顯示「刪除團隊」按鈕
3. 結果：完全看不到刪除選項
```

---

### 情境 4：非 Owner 強制呼叫 API

```
1. 使用者：繞過前端檢查，直接呼叫 delete API
2. 系統：Database function 檢查權限
3. 系統：回傳錯誤："Only team owner can delete the team"
4. 結果：刪除失敗，資料安全
```

---

## 📊 CASCADE 刪除說明

當刪除 teams 表記錄時，PostgreSQL 會自動 CASCADE 刪除以下關聯資料：

```sql
teams (團隊)
  ├── team_members (CASCADE)          → 所有成員關係
  ├── team_invites (CASCADE)          → 所有邀請碼
  ├── customers (CASCADE)             → 所有客戶
  │   └── orders (CASCADE)            → 所有訂單
  ├── orders (CASCADE)                → 直接關聯的訂單
  ├── line_messages (CASCADE)         → 所有 LINE 訊息
  ├── line_conversations (CASCADE)    → 所有對話記錄
  └── reminders (CASCADE)             → 所有提醒
```

**不需要手動刪除，PostgreSQL 會自動處理！**

---

## 🧪 測試建議

### 功能測試

**測試案例 1：Owner 正常刪除**

```
前提：使用者是團隊的 owner
步驟：
  1. 點擊「刪除團隊」
  2. 在 Alert 點擊「繼續」
  3. 在 Modal 輸入正確的團隊名稱
  4. 點擊「確認刪除」
預期：
  ✅ 團隊成功刪除
  ✅ 顯示 toast「團隊已永久刪除」
  ✅ 導航到 team-setup 頁面
  ✅ 資料庫中團隊和相關資料被刪除
```

**測試案例 2：輸入錯誤團隊名稱**

```
前提：使用者是團隊的 owner
步驟：
  1-3. [同上]
  4. 在 Modal 輸入錯誤的團隊名稱
  5. 點擊「確認刪除」
預期：
  ✅ 顯示錯誤 toast「團隊名稱不正確」
  ✅ Modal 保持開啟
  ✅ 刪除未執行
```

**測試案例 3：取消刪除**

```
前提：使用者是團隊的 owner
步驟：
  1. 點擊「刪除團隊」
  2. 在 Alert 點擊「取消」
預期：
  ✅ Alert 關閉
  ✅ 刪除未執行
```

**測試案例 4：非 Owner UI 檢查**

```
前提：使用者是 admin 或 member
步驟：查看設定頁面
預期：
  ✅ 不顯示「刪除團隊」按鈕
  ✅ 只顯示「離開團隊」按鈕
```

---

### 權限測試

**測試案例 5：後端權限檢查**

```
前提：使用者是 admin（非 owner）
步驟：強制呼叫 delete_team API
預期：
  ✅ 回傳錯誤："Only team owner can delete the team"
  ✅ 刪除未執行
```

---

### CASCADE 測試

**測試案例 6：關聯資料刪除**

```
前提：團隊有訂單、客戶、成員等資料
步驟：刪除團隊
預期：
  ✅ teams 記錄被刪除
  ✅ team_members 記錄被刪除
  ✅ customers 記錄被刪除
  ✅ orders 記錄被刪除
  ✅ line_messages 記錄被刪除
  ✅ 所有相關資料自動刪除（CASCADE）
```

---

## 📝 關鍵檔案清單

### Database

- ✅ `supabase/migrations/013_team_delete_function.sql`（新增）

### Backend

- ✅ `supabase/functions/team-operations/index.ts`（修改）

### Frontend - Service & Hooks

- ✅ `mobile/services/teamService.ts`（修改）
- ✅ `mobile/hooks/queries/useTeams.ts`（修改）

### Frontend - UI

- ✅ `mobile/app/(main)/(tabs)/settings.tsx`（修改）

---

## 🎯 與原需求的對比

| 需求              | 狀態    | 說明                   |
| ----------------- | ------- | ---------------------- |
| 只有 owner 可刪除 | ✅ 完成 | 前後端雙重檢查         |
| 防止誤刪          | ✅ 完成 | 三層確認機制           |
| 永久刪除          | ✅ 完成 | 硬刪除，無法復原       |
| CASCADE 刪除      | ✅ 完成 | 自動刪除相關資料       |
| 清楚的警告訊息    | ✅ 完成 | Alert + Modal 詳細說明 |

---

## 🚀 部署檢查清單

### Database

- [ ] 執行 migration：`013_team_delete_function.sql`
- [ ] 驗證 `delete_team` 函數已建立
- [ ] 測試 CASCADE 刪除是否正常運作

### Backend

- [ ] 部署更新後的 `team-operations` Edge Function
- [ ] 測試 delete action 是否正常運作
- [ ] 驗證權限檢查

### Frontend

- [ ] 更新 Mobile App
- [ ] 測試三層確認流程
- [ ] 驗證 UI 顯示（owner vs 非 owner）

---

## 💡 未來擴展建議

### 短期（如果需要）

1. **軟刪除機制**：

   - 修改為 UPDATE `deleted_at` 而非 DELETE
   - 加入 30 天寬限期
   - 實作 `restore_team` 函數

2. **刪除前通知**：
   - Email 通知所有成員
   - LINE 訊息通知

### 中期（訂閱系統上線後）

1. **訂閱整合**：

   - 刪除團隊時自動取消 RevenueCat 訂閱
   - 退款政策處理

2. **資料匯出**：
   - 刪除前提供匯出所有資料選項
   - 符合 GDPR 要求

### 長期

1. **定期清理**：

   - Cron Job 自動清理軟刪除的團隊
   - Email 提醒（刪除前 7 天、3 天、1 天）

2. **審計日誌**：
   - 記錄誰刪除了哪個團隊
   - 保留匿名化統計資料

---

## 🎉 總結

成功實作團隊硬刪除功能，採用業界最佳實踐的三層確認機制：

1. **第一層**：Alert 警告，說明後果
2. **第二層**：Modal 詳細資訊
3. **第三層**：團隊名稱驗證

**關鍵成就：**

- ✅ 前後端雙重權限檢查
- ✅ 三層確認防止誤刪
- ✅ CASCADE 自動刪除相關資料
- ✅ 清楚的使用者體驗
- ✅ 完整的錯誤處理
- ✅ 安全可靠

**解決的核心問題：**

- ✅ Owner 現在可以刪除「只有自己」的團隊
- ✅ 不需要邀請他人再轉移所有權的複雜流程
- ✅ 符合使用者預期的直覺操作

---

**實施者：** Claude (AI Assistant)  
**產品設計：** Alex  
**實施日期：** 2025-10-27
