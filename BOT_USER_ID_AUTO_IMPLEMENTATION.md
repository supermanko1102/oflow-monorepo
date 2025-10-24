# Bot User ID 自動取得功能 - 實作說明

## 📝 背景

LINE Webhook 的 `destination` 欄位實際上是 **Bot User ID**（`U` 開頭），而非 **Channel ID**（純數字）。

這導致之前實作中，使用者輸入 Channel ID 後，Webhook 無法找到對應的團隊。

## ✅ 解決方案（方案 3）

**自動透過 LINE API 取得 Bot User ID**

- 使用者只需輸入 **Channel ID**、**Channel Secret**、**Channel Access Token**
- 系統**自動呼叫 LINE Bot Info API** 取得 Bot User ID
- 兩個 ID 都儲存在資料庫，各司其職

## 🔧 實作細節

### 1. 資料庫 Migration

**檔案：`supabase/migrations/008_add_bot_user_id.sql`**

```sql
-- 新增 line_bot_user_id 欄位
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS line_bot_user_id TEXT;

-- 建立索引（用於 Webhook 查詢）
CREATE INDEX IF NOT EXISTS idx_teams_line_bot_user_id 
ON teams(line_bot_user_id);
```

**資料結構：**

| 欄位                   | 用途                           | 範例                                |
| ---------------------- | ------------------------------ | ----------------------------------- |
| `line_channel_id`      | Channel ID（純數字，用於顯示） | `2008352338`                        |
| `line_bot_user_id`     | Bot User ID（U 開頭，用於 Webhook） | `U49096f548387eaddeb4aa76ab650cc84` |
| `line_channel_secret`  | Channel Secret（驗證簽章）     | `abc123...`                         |
| `line_channel_access_token` | Channel Access Token（回覆訊息） | `XYZ789...`                    |

### 2. team-operations Edge Function

**檔案：`supabase/functions/team-operations/index.ts`**

**新增功能：呼叫 LINE Bot Info API**

```typescript
// 🚀 呼叫 LINE Bot Info API 取得 Bot User ID
const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${line_channel_access_token}`,
  },
});

const botInfo = await botInfoResponse.json();
const lineBotUserId = botInfo.userId; // U49096f548387eaddeb4aa76ab650cc84

// 更新團隊的 LINE 設定（包含 Bot User ID）
await supabaseAdmin
  .from("teams")
  .update({
    line_channel_id,           // 純數字
    line_bot_user_id: lineBotUserId, // U 開頭
    line_channel_secret,
    line_channel_access_token,
    line_channel_name,
    line_connected_at: new Date().toISOString(),
  })
  .eq("id", team_id);
```

**優點：**
- ✅ 自動驗證 Channel Access Token 是否有效
- ✅ 無需用戶手動輸入 Bot User ID
- ✅ 減少設定錯誤的可能性

### 3. line-webhook Edge Function

**檔案：`supabase/functions/line-webhook/index.ts`**

**修改：使用 `line_bot_user_id` 查詢團隊**

```typescript
// ✅ 根據 Bot User ID (destination) 查找對應的團隊
const { data: team } = await supabaseAdmin
  .from("teams")
  .select("id, name, business_type, line_channel_secret, line_channel_access_token, auto_mode")
  .eq("line_bot_user_id", destination) // 使用 line_bot_user_id
  .single();
```

**之前（錯誤）：**
```typescript
.eq("line_channel_id", destination) // ❌ destination 是 U 開頭，無法匹配純數字
```

**現在（正確）：**
```typescript
.eq("line_bot_user_id", destination) // ✅ destination = Bot User ID
```

## 📊 完整流程

```
1. 用戶在 Mobile App 輸入：
   - Channel ID: 2008352338
   - Channel Secret: abc123...
   - Channel Access Token: XYZ789...

2. team-operations Edge Function：
   ↓
   呼叫 LINE Bot Info API
   GET https://api.line.me/v2/bot/info
   Authorization: Bearer XYZ789...
   ↓
   回應：{ userId: "U49096f548387eaddeb4aa76ab650cc84" }
   ↓
   儲存到資料庫：
   - line_channel_id = 2008352338
   - line_bot_user_id = U49096f548387eaddeb4aa76ab650cc84

3. LINE Webhook 接收訊息：
   {
     "destination": "U49096f548387eaddeb4aa76ab650cc84",
     "events": [...]
   }
   ↓
   line-webhook Edge Function：
   使用 line_bot_user_id 查詢團隊 ✅
   找到團隊 → 驗證簽章 → 處理訊息
```

## 🎯 好處

| 方案 | 優點 | 缺點 |
|------|------|------|
| **方案 1**<br>讓用戶手動輸入 Bot User ID | 簡單直接 | ❌ 用戶需要找 Bot User ID（不直觀）<br>❌ 容易輸入錯誤 |
| **方案 2**<br>只儲存 Bot User ID | 減少欄位 | ❌ 需要修改 UI 顯示邏輯<br>❌ Channel ID 仍然有顯示需求 |
| **方案 3（採用）**<br>自動取得 Bot User ID | ✅ 用戶體驗最佳<br>✅ 自動驗證 Token<br>✅ 兩個 ID 都保留 | 需要呼叫外部 API（可接受） |

## 🧪 測試步驟

1. **執行 Migration**
   ```bash
   cd /Users/yuna/oflow-monorepo/supabase
   supabase db push
   ```

2. **部署 Edge Functions**
   ```bash
   supabase functions deploy team-operations
   supabase functions deploy line-webhook
   ```

3. **在 Mobile App 測試**
   - 進入「設定」頁面
   - 輸入 LINE Channel ID、Secret、Access Token
   - 點擊「儲存設定」
   - 檢查是否顯示成功訊息

4. **驗證資料庫**
   ```sql
   SELECT 
     id,
     name,
     line_channel_id,      -- 應該是純數字
     line_bot_user_id,     -- 應該是 U 開頭
     line_connected_at
   FROM teams
   WHERE line_channel_id IS NOT NULL;
   ```

5. **測試 Webhook**
   - 在 LINE Developers Console 設定 Webhook URL
   - 傳送測試訊息給官方帳號
   - 檢查 Edge Function Logs：`supabase functions logs line-webhook`

## 📚 相關 API 文件

- [LINE Bot Info API](https://developers.line.biz/en/reference/messaging-api/#get-bot-info)
- [LINE Webhook Events](https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects)

## ✨ 實作完成

- ✅ 資料庫新增 `line_bot_user_id` 欄位
- ✅ team-operations 自動取得 Bot User ID
- ✅ line-webhook 使用 Bot User ID 查詢團隊
- ✅ 更新部署文件
- ✅ 無需修改 Mobile App UI

---

**實作日期：** 2025-10-24  
**版本：** v1.2  
**狀態：** ✅ 完成

