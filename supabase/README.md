# OFlow Supabase 後端

這個資料夾包含 OFlow 的完整後端架構，包括資料庫 Schema、RLS 政策、Database Functions 和 Edge Functions。

## 📋 資料夾結構

```
supabase/
├── migrations/              # 資料庫遷移檔案
│   ├── 001_initial_schema.sql          # 完整資料庫表格定義
│   ├── 002_rls_policies.sql            # Row Level Security 政策
│   ├── 003_database_functions.sql      # 業務邏輯函數
│   └── 004_triggers.sql                # 自動化觸發器
├── functions/               # Edge Functions (Deno Runtime)
│   └── (之後新增)
├── config.toml              # Supabase 專案配置
└── README.md               # 本檔案
```

## 🚀 快速開始

### 1. 在 Supabase Dashboard 執行 Migrations

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點選左側選單的「SQL Editor」
4. 依序執行以下檔案（重要：必須按順序執行）：

```bash
# 第一步：建立所有表格
supabase/migrations/001_initial_schema.sql

# 第二步：設定權限控制
supabase/migrations/002_rls_policies.sql

# 第三步：建立業務邏輯函數
supabase/migrations/003_database_functions.sql

# 第四步：建立自動化觸發器
supabase/migrations/004_triggers.sql
```

**執行方式：**

- 複製檔案內容
- 貼到 SQL Editor
- 點選「Run」執行
- 等待執行完成（會顯示 ✅ 完成訊息）

### 2. 驗證資料庫建立成功

執行以下 SQL 查詢確認：

```sql
-- 1. 檢查所有表格是否建立
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 應該看到 10 個表格：
-- customers, line_messages, orders, reminders,
-- subscription_transactions, team_invites, team_members,
-- team_settings, teams, users

-- 2. 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 所有表格的 rowsecurity 應該都是 true

-- 3. 檢查 Functions 是否建立
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f';

-- 應該看到 9 個函數：
-- generate_order_number, create_order, get_daily_summary,
-- check_subscription_valid, update_expired_subscriptions, initialize_trial,
-- get_user_teams, generate_invite_code, accept_team_invite

-- 4. 檢查 Triggers 是否建立
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## 🔧 設定 LINE Login (認證)

### 1. 在 LINE Developers Console 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立一個 LINE Login Channel（用於商家登入 App）
3. 記下以下資訊：
   - **Channel ID** (Client ID)
   - **Channel Secret** (Client Secret)

### 2. 在 Supabase Dashboard 設定

1. 前往 Supabase Dashboard → Authentication → Providers
2. 找到「LINE」並點選「Enable」
3. 填入：
   - **Client ID**: 貼上 LINE Channel ID
   - **Client Secret**: 貼上 LINE Channel Secret
   - **Redirect URL**: 複製顯示的 URL（格式：`https://xxx.supabase.co/auth/v1/callback`）
4. 儲存設定

### 3. 回到 LINE Developers Console 設定 Callback URL

1. 在 LINE Channel 設定中找到「Callback URL」
2. 貼上 Supabase 提供的 Redirect URL
3. 儲存

## 📊 建立測試資料

執行以下 SQL 建立測試資料（選擇性）：

```sql
-- 1. 建立測試團隊
INSERT INTO teams (name, slug, business_type)
VALUES
  ('OCake 麵包店', 'ocake', 'bakery'),
  ('小美美容院', 'beauty-shop', 'beauty')
RETURNING id, name, slug;

-- 記下團隊 ID，用於後續測試

-- 2. 建立測試用戶（需要先用 LINE Login 登入一次）
-- 無法直接插入，需要透過 LINE Login OAuth 流程

-- 3. 初始化團隊試用期
SELECT initialize_trial('<團隊 ID>');

-- 4. 建立測試顧客
INSERT INTO customers (team_id, name, phone)
VALUES
  ('<團隊 ID>', '王小明', '0912345678'),
  ('<團隊 ID>', '李小華', '0987654321');

-- 5. 建立測試訂單（透過 function）
SELECT create_order(
  '<團隊 ID>'::uuid,              -- team_id
  NULL,                            -- created_by (AI 建立)
  '王小明',                        -- customer_name
  '0912345678',                    -- customer_phone
  '[
    {"name": "巴斯克蛋糕 6吋", "quantity": 1, "price": 450},
    {"name": "檸檬塔", "quantity": 2, "price": 120}
  ]'::jsonb,                       -- items
  690.00,                          -- total_amount
  CURRENT_DATE + 3,                -- pickup_date (3天後)
  '14:00'::time,                   -- pickup_time
  'manual',                        -- source
  '測試訂單'                       -- notes
);
```

## 🔍 常見查詢

### 查看團隊的所有訂單

```sql
SELECT
  o.order_number,
  o.customer_name,
  o.status,
  o.pickup_date,
  o.pickup_time,
  o.total_amount,
  o.created_at
FROM orders o
WHERE o.team_id = '<團隊 ID>'
ORDER BY o.created_at DESC;
```

### 查看團隊統計

```sql
SELECT
  name,
  total_orders,
  total_revenue,
  member_count,
  subscription_status,
  trial_ends_at
FROM teams
WHERE id = '<團隊 ID>';
```

### 查看用戶加入的所有團隊

```sql
SELECT * FROM get_user_teams('<用戶 ID>');
```

### 查看今日訂單摘要

```sql
SELECT get_daily_summary('<團隊 ID>', CURRENT_DATE);
```

## 🎯 下一步

資料庫建立完成後，接下來可以：

### 1. LINE 整合

- ✅ LINE Login 已設定（商家登入）
- ⏳ LINE Official Account 綁定（Mobile App 實作）
- ⏳ LINE Webhook（Edge Function 實作）
- ⏳ LINE Messaging API（Edge Function 實作）

### 2. Edge Functions 開發

建立以下 Edge Functions：

```bash
supabase/functions/
├── line-webhook/          # 接收 LINE 訊息
├── ai-parser/             # AI 解析訂單
├── orders-api/            # 訂單 CRUD API
├── teams-api/             # 團隊管理 API
├── team-members-api/      # 成員管理 API
├── bind-line-channel/     # 綁定 LINE 官方帳號
├── notifications/         # 推播提醒
└── revenuecat-webhook/    # 訂閱系統 Webhook
```

### 3. Mobile App 整合

在 Mobile App 中：

- 安裝 `@supabase/supabase-js`
- 設定 Supabase client
- 實作 LINE Login
- 實作團隊選擇/創建 UI
- 串接訂單 API

## 📚 資料庫架構說明

### Team-Centric 設計

OFlow 採用 **Team-Centric（以團隊為核心）** 架構：

```
Team (團隊 = 商家)
├─ 擁有：LINE 官方帳號
├─ 擁有：訂閱狀態（RevenueCat）
├─ 擁有：訂單資料
├─ 擁有：顧客資料
└─ 包含：多個成員（Users）

User (用戶 = 登入身份)
├─ LINE Login 個人帳號
├─ 個人資料（名稱、頭像）
├─ 可加入多個團隊
└─ 在不同團隊有不同角色
```

### 核心表格關係

```
teams (團隊)
  ↓ (1:N)
team_members (成員關聯)
  ↓ (N:1)
users (用戶)

teams (團隊)
  ↓ (1:N)
├─ orders (訂單)
├─ customers (顧客)
├─ line_messages (LINE 對話)
├─ reminders (提醒)
├─ team_settings (設定)
└─ subscription_transactions (交易記錄)
```

## 🔒 安全性

### Row Level Security (RLS)

所有表格都啟用了 RLS，確保：

- 用戶只能存取自己加入的團隊資料
- 不同角色（owner/admin/member）有不同權限
- 團隊間資料完全隔離

### 權限檢查機制

```sql
-- 範例：用戶只能查看自己團隊的訂單
WHERE team_id IN (
  SELECT team_id FROM team_members
  WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid())
)
```

## 🐛 常見問題排解

### Q1: RLS 政策導致查詢失敗？

**問題**：在 Mobile App 查詢訂單時返回空結果。

**解決**：

1. 確認用戶已加入團隊（檢查 `team_members` 表）
2. 確認 JWT Token 正確（`auth.uid()` 應該等於 `users.line_user_id`）
3. 使用 Supabase Dashboard 的 SQL Editor 測試查詢

### Q2: 無法插入資料？

**問題**：INSERT 操作被 RLS 擋住。

**解決**：

- 檢查該表格的 INSERT 政策是否允許
- 確認權限檢查（`can_manage_orders`, `can_manage_customers` 等）
- 如果是系統操作（Webhook、Trigger），使用 `service_role` key

### Q3: Trigger 沒有執行？

**問題**：訂單確認後沒有自動建立提醒。

**解決**：

1. 檢查 Trigger 是否正確建立：

```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%reminder%';
```

2. 檢查 `team_settings` 是否存在
3. 查看 Supabase Logs 是否有錯誤訊息

## 📞 需要協助？

- 📖 [Supabase 官方文件](https://supabase.com/docs)
- 📖 [PostgreSQL 官方文件](https://www.postgresql.org/docs/)
- 📖 [BACKEND_IMPLEMENTATION_GUIDE.md](../BACKEND_IMPLEMENTATION_GUIDE.md) - 完整後端實作指南

---

**資料庫版本**: v1.0  
**建立日期**: 2025-10-20  
**架構**: Team-Centric  
**資料表數量**: 10  
**Database Functions**: 9  
**Triggers**: 7
