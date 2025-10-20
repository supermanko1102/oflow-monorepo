# 🚀 OFlow 後端系統實作指南（Supabase 全端方案）

> **技術架構**: Supabase Edge Functions + PostgreSQL + Auth + Realtime  
> **核心設計**: Team-Centric Architecture（以團隊為核心）⭐  
> **訂閱模式**: 團隊層級訂閱（一個團隊一份訂閱，支援多成員協作）⭐  
> **適用場景**: 快速 MVP、小團隊開發、低維護成本  
> **更新日期**: 2025-10-20  
> **文件版本**: v2.0

---

## ⭐ 重大架構設計：Team-Centric（以團隊為核心）

### 🎯 核心概念

OFlow 採用 **Team-Centric Architecture**，這是一個關鍵的設計決策，影響整個系統的資料模型和業務邏輯。

#### 為什麼需要 Team-Centric？

**實際商業需求：**

1. **多人協作**：一家麵包店（OCake）可能有多位員工需要同時使用 App 管理訂單
2. **共享資料**：同一個 LINE 官方帳號（@ocake）的訂單應該被所有員工看到
3. **合理成本**：訂閱應該是「店家層級」，不是「員工層級」（否則 3 個員工 = NT$900/月）
4. **權限管理**：老闆、店長、員工應該有不同的權限

#### 架構對比

```
❌ User-Centric（舊架構）              ✅ Team-Centric（新架構）
───────────────────────────────        ───────────────────────────────
User (商家)                            Team (商家實體)
├─ LINE 官方帳號                       ├─ LINE 官方帳號 @ocake
├─ 訂閱 (NT$300/月)                    ├─ 訂閱 (NT$300/月)
├─ 訂單                                ├─ 訂單（共享）
└─ 顧客                                ├─ 顧客（共享）
                                       └─ 成員
問題：                                     ├─ Alex (owner)
❌ 多人使用 = 每人都要綁定官方帳號？          ├─ Betty (admin)
❌ 多人使用 = 每人都要訂閱？                 └─ Charlie (member)
❌ 資料如何共享？
❌ 如何追蹤誰做了什麼？                 優勢：
                                       ✅ 多人共用同一個官方帳號
                                       ✅ 一個團隊一份訂閱
                                       ✅ 資料自動共享
                                       ✅ 可追蹤操作者
```

#### 核心實體關係

```
Team（團隊 = 商家）
├─ 擁有：LINE 官方帳號（唯一）
├─ 擁有：訂閱狀態（RevenueCat）
├─ 擁有：訂單資料
├─ 擁有：顧客資料
└─ 包含：多個成員（Users）

User（用戶 = 登入身份）
├─ LINE Login 個人帳號
├─ 個人資料（名稱、頭像）
├─ 可加入多個團隊
└─ 在不同團隊有不同角色

Team Members（團隊成員）
├─ 關聯 User 和 Team
├─ 定義角色：owner, admin, member
└─ 定義權限：誰能管理訂單、設定、邀請等
```

### 📋 實際使用場景

**場景 1：OCake 麵包店的一天**

```
1. Alex（老闆）：
   - 早上用 App 查看今日訂單
   - LINE 官方帳號收到新訂單，AI 自動解析
   - 查看本月營收報表

2. Betty（店長）：
   - 同時登入 App，看到相同的訂單列表
   - 修改一筆訂單的取件時間
   - 系統記錄「Betty 修改了 #ORD-20251020-003」

3. Charlie（工讀生）：
   - 只能查看和建立訂單
   - 無法修改店家設定或查看營收
   - 無法邀請新成員

4. 財務：
   - OCake 只需支付 NT$300/月
   - 不管有幾位員工使用
```

**場景 2：用戶加入多個團隊**

```
User: Alex
├─ OCake（owner）
│   - 管理麵包店訂單
│   - 查看營收報表
│   - 邀請新員工
│
└─ BeautyShop（member）
    - 兼職美容院
    - 只能查看和建立訂單
    - 無法修改設定
```

---

## 📋 目錄

1. [系統架構設計](#1-系統架構設計)
2. [資料庫設計](#2-資料庫設計)
3. [API 架構設計](#3-api-架構設計)
4. [LINE 整合實作](#4-line-整合實作)
5. [認證授權機制](#5-認證授權機制)
6. [AI 服務整合](#6-ai-服務整合)
7. [部署與開發流程](#7-部署與開發流程)
8. [開發路徑規劃](#8-開發路徑規劃)

---

## 1. 系統架構設計

### 1.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                     OFlow 系統架構                             │
└─────────────────────────────────────────────────────────────┘

顧客端 (LINE App)                商家端 (Mobile App)
       │                                │
       │                                │ Supabase Auth
       │ LINE Messaging API             │ (LINE Login OAuth)
       ↓                                ↓
┌──────────────────────────────────────────────────────────┐
│              LINE Official Account (OFlow Bot)            │
└──────────────────────────────────────────────────────────┘
       │
       │ Webhook Events
       ↓
┌──────────────────────────────────────────────────────────┐
│           Supabase Edge Functions (Deno Runtime)          │
├──────────────────────────────────────────────────────────┤
│  • line-webhook          - 接收 LINE 訊息                  │
│  • ai-parser             - AI 解析訂單內容                 │
│  • orders-api            - 訂單 CRUD                       │
│  • notifications         - 推播提醒                        │
│  • auth-callback         - LINE Login 回調                 │
└──────────────────────────────────────────────────────────┘
       │                              │
       │ OpenAI API                   │ PostgreSQL Queries
       ↓                              ↓
┌─────────────┐          ┌────────────────────────────────┐
│  OpenAI     │          │   Supabase PostgreSQL          │
│  GPT-4      │          ├────────────────────────────────┤
└─────────────┘          │  • users (商家資料)             │
                         │  • orders (訂單)                │
                         │  • customers (顧客)             │
                         │  • line_messages (對話紀錄)     │
                         │  • reminders (提醒)             │
                         │  • settings (商家設定)          │
                         └────────────────────────────────┘
                                      │
                                      │ Realtime Subscription
                                      ↓
                         ┌────────────────────────────────┐
                         │    Mobile App (Real-time UI)   │
                         └────────────────────────────────┘
```

### 1.2 技術棧詳解

| 層級               | 技術                  | 用途                   | 優勢                             |
| ------------------ | --------------------- | ---------------------- | -------------------------------- |
| **Edge Functions** | Deno + TypeScript     | API 邏輯、Webhook 處理 | Serverless、自動擴展、零維護     |
| **Database**       | PostgreSQL (Supabase) | 資料儲存               | 完整 SQL、JSONB、全文搜尋        |
| **Auth**           | Supabase Auth         | JWT + OAuth            | 內建 LINE Login、自動 token 管理 |
| **Realtime**       | WebSocket (Supabase)  | 訂單即時同步           | 自動推送資料變更到 App           |
| **Storage**        | Supabase Storage      | 商品圖片、訂單附件     | S3-compatible、CDN 加速          |
| **AI**             | OpenAI GPT-4          | 對話理解、訂單解析     | 高準確度、支援繁體中文           |
| **LINE**           | Messaging API + Login | 接收訊息、商家登入     | 台灣主流通訊平台                 |

### 1.3 模組化設計

```
/supabase
├── functions/              # Edge Functions (API 邏輯)
│   ├── line-webhook/       # LINE 訊息接收
│   ├── ai-parser/          # AI 解析服務
│   ├── orders-api/         # 訂單管理 API
│   ├── notifications/      # 推播提醒
│   └── auth-callback/      # LINE Login 回調
│
├── migrations/             # 資料庫遷移檔案
│   ├── 001_initial_schema.sql
│   ├── 002_add_rls_policies.sql
│   └── 003_add_database_functions.sql
│
└── config.toml             # Supabase 專案配置
```

---

## 2. 資料庫設計

### 2.1 核心架構：以「團隊」為中心

#### ⭐ 重要概念

OFlow 採用 **Team-Centric（以團隊為核心）** 的架構設計：

```
核心實體：Team（團隊）
├─ 擁有：LINE 官方帳號
├─ 擁有：訂閱狀態（RevenueCat）
├─ 擁有：訂單資料
├─ 擁有：顧客資料
└─ 包含：多個成員（Users）

User（用戶）只是：
├─ 登入憑證（LINE Login）
├─ 個人資料（名稱、頭像）
└─ 團隊成員身份（可加入多個團隊）

關係：
Team 1 ←→ N Users (透過 team_members)
Team 1 ←→ N Orders
Team 1 ←→ N Customers
```

**為什麼以團隊為核心？**

- ✅ 支援多人協作（同一個官方帳號多人管理）
- ✅ 訂閱成本合理（一個團隊一份訂閱，不是每人訂閱）
- ✅ 資料隔離清楚（按團隊隔離，不是按用戶）
- ✅ 符合實際商業場景（商家 = 團隊，不是個人）

### 2.2 完整 Schema

#### Table: `teams` (團隊 - 核心主體) ⭐

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 團隊基本資訊
  name TEXT NOT NULL,                     -- 'OCake'
  slug TEXT UNIQUE,                       -- 'ocake' (用於 URL)
  description TEXT,
  logo_url TEXT,

  -- LINE 官方帳號（屬於團隊）⭐
  line_channel_id TEXT UNIQUE,            -- @ocake 的 Channel ID
  line_channel_secret TEXT,
  line_channel_access_token TEXT,
  line_channel_name TEXT,                 -- '@ocake'
  line_webhook_verified BOOLEAN DEFAULT false,
  line_connected_at TIMESTAMPTZ,

  -- 訂閱狀態（屬於團隊）⭐
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'pro',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_current_period_end TIMESTAMPTZ,

  -- RevenueCat 整合（團隊層級）⭐
  revenuecat_customer_id TEXT,            -- team_xxx
  subscription_product_id TEXT,           -- oflow_pro_monthly
  subscription_platform TEXT,             -- ios, android

  -- 團隊設定
  auto_mode BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'Asia/Taipei',
  business_type TEXT DEFAULT 'bakery',    -- bakery, beauty, other

  -- 統計資訊（快取）
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  member_count INT DEFAULT 1,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                  -- 軟刪除
);

-- 索引
CREATE INDEX idx_teams_line_channel_id ON teams(line_channel_id);
CREATE INDEX idx_teams_subscription_status ON teams(subscription_status);
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at);

COMMENT ON TABLE teams IS '團隊表 - OFlow 的核心實體，擁有訂閱、LINE 官方帳號、訂單等所有業務資料';
COMMENT ON COLUMN teams.line_channel_id IS 'LINE 官方帳號 Channel ID，一個團隊對應一個官方帳號';
COMMENT ON COLUMN teams.subscription_status IS '訂閱狀態：trial（試用）、active（付費中）、expired（過期）、cancelled（已取消）';
COMMENT ON COLUMN teams.revenuecat_customer_id IS 'RevenueCat Customer ID，格式：team_{team_id}';
```

#### Table: `users` (用戶 - 登入身份)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LINE 登入資訊
  line_user_id TEXT UNIQUE NOT NULL,
  line_display_name TEXT,
  line_picture_url TEXT,
  line_email TEXT,

  -- 偏好設定
  preferred_language TEXT DEFAULT 'zh-TW',
  current_team_id UUID REFERENCES teams(id), -- 最後使用的團隊

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_users_current_team_id ON users(current_team_id);

COMMENT ON TABLE users IS '用戶表 - 只存個人登入資訊，不包含業務資料';
COMMENT ON COLUMN users.line_user_id IS 'LINE Login 的 User ID（個人帳號，不是官方帳號）';
COMMENT ON COLUMN users.current_team_id IS '用戶最後使用的團隊（用於自動選擇）';
```

#### Table: `team_members` (團隊成員關聯)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 角色與權限
  role TEXT DEFAULT 'member',             -- owner, admin, member
  can_manage_orders BOOLEAN DEFAULT true,
  can_manage_customers BOOLEAN DEFAULT true,
  can_manage_settings BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT true,
  can_invite_members BOOLEAN DEFAULT false,

  -- 加入資訊
  invited_by UUID REFERENCES users(id),
  invite_accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)  -- 同一個團隊不能重複加入
);

-- 索引
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

COMMENT ON TABLE team_members IS '團隊成員關聯表 - 一個用戶可以加入多個團隊';
COMMENT ON COLUMN team_members.role IS '角色：owner（擁有者）、admin（管理員）、member（成員）';
```

#### Table: `team_invites` (團隊邀請)

```sql
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- 邀請資訊
  invite_code TEXT UNIQUE NOT NULL,       -- 'OCAKE-ABC123'
  invited_by UUID REFERENCES users(id),

  -- 邀請設定
  role TEXT DEFAULT 'member',
  max_uses INT,                           -- NULL = 無限次
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);

COMMENT ON TABLE team_invites IS '團隊邀請碼表';
```

#### Table: `customers` (顧客資料)

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊

  -- 顧客資訊
  name TEXT NOT NULL,
  phone TEXT,
  line_user_id TEXT,                        -- LINE ID (顧客的個人 LINE)
  email TEXT,

  -- 統計資訊
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,

  -- 備註與標籤
  notes TEXT,
  tags TEXT[],                              -- ['VIP', '常客', '過敏體質']

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_order_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_customers_team_id ON customers(team_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_line_user_id ON customers(line_user_id);

-- 同一個團隊內，電話不能重複
CREATE UNIQUE INDEX idx_customers_team_phone ON customers(team_id, phone)
  WHERE phone IS NOT NULL;

COMMENT ON TABLE customers IS '顧客表 - 屬於團隊，不是個人';
COMMENT ON COLUMN customers.team_id IS '所屬團隊 ID';
```

#### Table: `orders` (訂單)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,      -- ⭐ 屬於團隊
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- 訂單基本資訊
  order_number TEXT UNIQUE NOT NULL,        -- ORD-20251020-001
  customer_name TEXT NOT NULL,              -- 顧客名稱（冗余）
  customer_phone TEXT,

  -- 訂單內容
  items JSONB NOT NULL,                     -- 商品列表
  total_amount DECIMAL(10,2) NOT NULL,

  -- 取件資訊
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  pickup_method TEXT DEFAULT 'store',       -- store, delivery
  delivery_address TEXT,

  -- 訂單狀態
  status TEXT DEFAULT 'pending',            -- pending, confirmed, completed, cancelled
  source TEXT DEFAULT 'auto',               -- auto, semi-auto, manual

  -- LINE 對話相關
  line_conversation_id TEXT,
  original_message TEXT,

  -- 備註
  notes TEXT,                               -- 商家內部備註
  customer_notes TEXT,                      -- 顧客備註

  -- 操作記錄（誰建立、誰修改）⭐ 新增
  created_by UUID REFERENCES users(id),     -- 建立者
  updated_by UUID REFERENCES users(id),     -- 最後修改者

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 訂單商品格式 (items JSONB)
-- [
--   {
--     "name": "巴斯克蛋糕 6吋",
--     "quantity": 1,
--     "price": 450,
--     "notes": "少糖"
--   }
-- ]

-- 索引
CREATE INDEX idx_orders_team_id ON orders(team_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);

-- 複合索引（常見查詢）
CREATE INDEX idx_orders_team_status_pickup ON orders(team_id, status, pickup_date);

COMMENT ON TABLE orders IS '訂單表 - 屬於團隊';
COMMENT ON COLUMN orders.team_id IS '所屬團隊 ID';
COMMENT ON COLUMN orders.created_by IS '建立訂單的用戶（用於追蹤多人協作）';
COMMENT ON COLUMN orders.updated_by IS '最後修改訂單的用戶';
```

#### Table: `line_messages` (LINE 對話紀錄)

```sql
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊

  -- LINE 訊息資訊
  line_message_id TEXT UNIQUE NOT NULL,     -- LINE Message ID
  line_user_id TEXT NOT NULL,               -- 發送者 LINE ID（顧客）
  message_type TEXT NOT NULL,               -- text, image, sticker, location
  message_text TEXT,
  message_data JSONB,

  -- AI 解析結果
  ai_parsed BOOLEAN DEFAULT false,
  ai_result JSONB,
  ai_confidence DECIMAL(3,2),               -- AI 信心度 0.00-1.00
  order_id UUID REFERENCES orders(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_line_messages_team_id ON line_messages(team_id);
CREATE INDEX idx_line_messages_line_user_id ON line_messages(line_user_id);
CREATE INDEX idx_line_messages_created_at ON line_messages(created_at DESC);
CREATE INDEX idx_line_messages_ai_parsed ON line_messages(ai_parsed) WHERE ai_parsed = false;

COMMENT ON TABLE line_messages IS 'LINE 對話記錄 - 屬於團隊';
```

#### Table: `reminders` (提醒通知)

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- 提醒類型
  remind_type TEXT NOT NULL,                -- 7day, 3day, 1day, today
  remind_time TIMESTAMPTZ NOT NULL,

  -- 發送狀態
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,

  -- 推播內容
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_reminders_team_id ON reminders(team_id);
CREATE INDEX idx_reminders_order_id ON reminders(order_id);
CREATE INDEX idx_reminders_sent ON reminders(sent, remind_time) WHERE sent = false;

COMMENT ON TABLE reminders IS '提醒通知 - 屬於團隊';
```

#### Table: `team_settings` (團隊進階設定)

```sql
-- 註：基本設定已整合在 teams 表中（auto_mode, ai_enabled, etc.）
-- 此表用於存放進階設定

CREATE TABLE team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,

  -- 營業設定
  business_hours JSONB,                     -- 營業時間
  holidays DATE[],                          -- 公休日

  -- 訂單設定
  order_lead_time_days INT DEFAULT 3,       -- 訂單提前天數
  max_daily_orders INT DEFAULT 20,          -- 每日最大接單數

  -- 通知設定
  reminder_days INT[] DEFAULT ARRAY[7, 3, 1],
  notification_time TIME DEFAULT '09:00',

  -- AI 設定
  ai_auto_confirm BOOLEAN DEFAULT false,
  ai_confidence_threshold DECIMAL(3,2) DEFAULT 0.8,

  -- 其他設定
  custom_fields JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- business_hours 格式範例
-- {
--   "monday": { "open": "09:00", "close": "18:00", "closed": false },
--   "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
--   ...
-- }

CREATE INDEX idx_team_settings_team_id ON team_settings(team_id);

COMMENT ON TABLE team_settings IS '團隊進階設定 - 基本設定在 teams 表';
```

#### Table: `subscription_transactions` (訂閱交易記錄)

```sql
CREATE TABLE subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊

  -- RevenueCat 資訊
  revenuecat_transaction_id TEXT UNIQUE NOT NULL,
  revenuecat_event_type TEXT NOT NULL,   -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.

  -- 產品資訊
  product_id TEXT NOT NULL,              -- oflow_pro_monthly
  platform TEXT NOT NULL,                -- ios, android

  -- 金額
  price DECIMAL(10,2) NOT NULL,          -- 300.00
  currency TEXT DEFAULT 'TWD',

  -- 時間
  purchased_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,

  -- RevenueCat 原始資料
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_subscription_transactions_team_id ON subscription_transactions(team_id);
CREATE INDEX idx_subscription_transactions_event_type ON subscription_transactions(revenuecat_event_type);
CREATE INDEX idx_subscription_transactions_purchased_at ON subscription_transactions(purchased_at DESC);

COMMENT ON TABLE subscription_transactions IS '訂閱交易記錄 - 屬於團隊';
```

### 2.3 Row Level Security (RLS) 政策

#### ⭐ 基於團隊的權限控制

所有業務資料（orders, customers, etc.）的存取權限基於**「用戶是否為團隊成員」**，而不是「用戶是否為擁有者」。

```sql
-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- users: 用戶只能看到自己的資料
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid()::text = line_user_id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid()::text = line_user_id);

-- ═══════════════════════════════════════════════════════
-- teams: 用戶可以看到自己加入的團隊
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can update team"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND role = 'owner'
    )
  );

-- ═══════════════════════════════════════════════════════
-- team_members: 用戶可以看到自己團隊的成員
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

-- ═══════════════════════════════════════════════════════
-- orders: 團隊成員可以管理團隊的訂單
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Team members can view orders"
  ON orders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Team members can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can update orders"
  ON orders FOR UPDATE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can delete orders"
  ON orders FOR DELETE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

-- ═══════════════════════════════════════════════════════
-- customers: 團隊成員可以管理團隊的顧客
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Team members can view customers"
  ON customers FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Team members can manage customers"
  ON customers FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_customers = true
    )
  );

-- ═══════════════════════════════════════════════════════
-- line_messages: 團隊成員可以看到團隊的訊息
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Team members can view messages"
  ON line_messages FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

-- ═══════════════════════════════════════════════════════
-- reminders: 團隊成員可以看到團隊的提醒
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Team members can view reminders"
  ON reminders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

-- ═══════════════════════════════════════════════════════
-- team_settings: 只有 owner/admin 可以修改設定
-- ═══════════════════════════════════════════════════════
CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners and admins can update settings"
  ON team_settings FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_settings = true
    )
  );
```

### 2.4 Database Functions (複雜業務邏輯)

#### 訂單相關函數

```sql
-- 生成訂單編號（團隊層級）
CREATE OR REPLACE FUNCTION generate_order_number(p_team_id UUID)
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  order_count INT;
  order_num TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 計算該團隊今天的訂單數
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE team_id = p_team_id
    AND order_number LIKE 'ORD-' || today_date || '-%';

  order_num := 'ORD-' || today_date || '-' || LPAD((order_count + 1)::TEXT, 3, '0');

  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- 建立訂單（團隊版本）⭐
CREATE OR REPLACE FUNCTION create_order(
  p_team_id UUID,
  p_created_by UUID,                        -- 建立者（哪個用戶）
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_pickup_date DATE,
  p_pickup_time TIME,
  p_source TEXT DEFAULT 'auto',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
  v_order_number TEXT;
BEGIN
  -- 生成訂單編號（團隊層級）
  v_order_number := generate_order_number(p_team_id);

  -- 查找或建立顧客（在團隊內）
  SELECT id INTO v_customer_id
  FROM customers
  WHERE team_id = p_team_id AND phone = p_customer_phone;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (team_id, name, phone)
    VALUES (p_team_id, p_customer_name, p_customer_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  -- 建立訂單
  INSERT INTO orders (
    team_id, customer_id, order_number, customer_name, customer_phone,
    items, total_amount, pickup_date, pickup_time, source, notes,
    created_by, updated_by
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount, p_pickup_date, p_pickup_time, p_source, p_notes,
    p_created_by, p_created_by
  )
  RETURNING id INTO v_order_id;

  -- 更新顧客統計
  UPDATE customers
  SET
    total_orders = total_orders + 1,
    total_spent = total_spent + p_total_amount,
    last_order_at = NOW()
  WHERE id = v_customer_id;

  -- 更新團隊統計
  UPDATE teams
  SET
    total_orders = total_orders + 1,
    total_revenue = total_revenue + p_total_amount
  WHERE id = p_team_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 取得團隊今日訂單摘要（團隊版本）⭐
CREATE OR REPLACE FUNCTION get_daily_summary(p_team_id UUID, p_date DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'total_amount', COALESCE(SUM(total_amount), 0),
    'pending_orders', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_orders', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'completed_orders', COUNT(*) FILTER (WHERE status = 'completed')
  )
  INTO result
  FROM orders
  WHERE team_id = p_team_id AND pickup_date = p_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### 訂閱相關函數

```sql
-- 檢查團隊訂閱是否有效（團隊版本）⭐
CREATE OR REPLACE FUNCTION check_subscription_valid(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  team_record RECORD;
BEGIN
  SELECT * INTO team_record FROM teams WHERE id = p_team_id;

  IF team_record IS NULL THEN
    RETURN false;
  END IF;

  -- 試用期內
  IF team_record.subscription_status = 'trial'
     AND team_record.trial_ends_at > NOW() THEN
    RETURN true;
  END IF;

  -- 付費中
  IF team_record.subscription_status = 'active'
     AND team_record.subscription_current_period_end > NOW() THEN
    RETURN true;
  END IF;

  -- 其他情況：過期
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 自動更新過期的訂閱狀態（每天執行）
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
  -- 試用期過期
  UPDATE teams
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial'
    AND trial_ends_at < NOW();

  -- 付費訂閱過期
  UPDATE teams
  SET subscription_status = 'expired'
  WHERE subscription_status = 'active'
    AND subscription_current_period_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- 初始化新團隊試用期
CREATE OR REPLACE FUNCTION initialize_trial(p_team_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE teams
  SET
    subscription_status = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '3 days'
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql;
```

#### 團隊協作相關函數

```sql
-- 取得用戶的所有團隊
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  role TEXT,
  member_count INT,
  order_count INT,
  subscription_status TEXT,
  line_channel_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    tm.role,
    t.member_count,
    t.total_orders AS order_count,
    t.subscription_status,
    t.line_channel_name
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  WHERE tm.user_id = p_user_id
    AND t.deleted_at IS NULL
  ORDER BY tm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 生成邀請碼
CREATE OR REPLACE FUNCTION generate_invite_code(p_team_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
BEGIN
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  RETURN UPPER(p_team_slug) || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- 驗證並使用邀請碼
CREATE OR REPLACE FUNCTION accept_team_invite(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_role TEXT;
  v_invite_id UUID;
BEGIN
  -- 查找有效的邀請碼
  SELECT id, team_id, role INTO v_invite_id, v_team_id, v_role
  FROM team_invites
  WHERE invite_code = p_invite_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR uses_count < max_uses);

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- 檢查用戶是否已加入
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User already a member of this team';
  END IF;

  -- 加入團隊
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, v_role);

  -- 更新邀請碼使用次數
  UPDATE team_invites
  SET uses_count = uses_count + 1
  WHERE id = v_invite_id;

  -- 更新團隊成員數
  UPDATE teams
  SET member_count = member_count + 1
  WHERE id = v_team_id;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 觸發器 (Triggers)

```sql
-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_settings_updated_at
  BEFORE UPDATE ON team_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 訂單狀態變更時自動建立提醒（團隊版本）⭐
CREATE OR REPLACE FUNCTION create_reminders_on_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  reminder_days INT[];
  day INT;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- 取得團隊提醒設定
    SELECT ts.reminder_days INTO reminder_days
    FROM team_settings ts
    WHERE ts.team_id = NEW.team_id;

    IF reminder_days IS NULL THEN
      reminder_days := ARRAY[7, 3, 1];
    END IF;

    -- 為每個提醒天數建立提醒
    FOREACH day IN ARRAY reminder_days
    LOOP
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        NEW.team_id,
        NEW.id,
        day || 'day',
        (NEW.pickup_date - day * INTERVAL '1 day') + TIME '09:00',
        '訂單提醒',
        format('%s 天後有訂單: %s', day, NEW.customer_name)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_reminders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_reminders_on_order_confirm();
```

---

## 3. API 架構設計

### 3.1 Edge Functions 總覽

| Function 名稱        | 路徑                               | 功能                       | 需要驗證        |
| -------------------- | ---------------------------------- | -------------------------- | --------------- |
| `line-webhook`       | `/functions/v1/line-webhook`       | 接收 LINE Webhook 事件     | ❌ (LINE 簽章)  |
| `auth-callback`      | `/functions/v1/auth-callback`      | LINE Login OAuth 回調      | ❌              |
| `teams-api`          | `/functions/v1/teams-api`          | 團隊管理 CRUD ⭐           | ✅ JWT          |
| `team-members-api`   | `/functions/v1/team-members-api`   | 團隊成員管理 ⭐            | ✅ JWT          |
| `bind-line-channel`  | `/functions/v1/bind-line-channel`  | 綁定 LINE 官方帳號 ⭐      | ✅ JWT          |
| `orders-api`         | `/functions/v1/orders-api`         | 訂單 CRUD                  | ✅ JWT          |
| `ai-parser`          | `/functions/v1/ai-parser`          | AI 解析訊息                | ✅ JWT          |
| `notifications`      | `/functions/v1/notifications`      | 發送推播                   | ✅ JWT          |
| `customers-api`      | `/functions/v1/customers-api`      | 顧客管理                   | ✅ JWT          |
| `analytics`          | `/functions/v1/analytics`          | 營收統計                   | ✅ JWT          |
| `revenuecat-webhook` | `/functions/v1/revenuecat-webhook` | RevenueCat 訂閱 Webhook ⭐ | ❌ (RevenueCat) |

### 3.2 API 詳細規格

#### 3.2.1 團隊 API (`teams-api`) ⭐ 新增

```http
### GET /functions/v1/teams-api?user_id={user_id}
### 取得用戶的所有團隊

Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "teams": [
    {
      "team_id": "uuid",
      "name": "OCake",
      "slug": "ocake",
      "role": "owner",
      "subscription_status": "active",
      "line_channel_name": "@ocake",
      "member_count": 3,
      "order_count": 152
    }
  ]
}

### POST /functions/v1/teams-api
### 建立新團隊（首次註冊時）

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "name": "OCake",
  "slug": "ocake",
  "business_type": "bakery"
}

Response 201:
{
  "team_id": "uuid",
  "name": "OCake",
  "slug": "ocake",
  "role": "owner"
}

### PUT /functions/v1/teams-api/{team_id}
### 更新團隊資訊（僅 owner）

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "name": "New Name",
  "logo_url": "https://...",
  "auto_mode": true,
  "ai_enabled": true
}

Response 200:
{
  "team_id": "uuid",
  "name": "New Name",
  ...
}
```

#### 3.2.2 團隊成員 API (`team-members-api`) ⭐ 新增

```http
### GET /functions/v1/team-members-api?team_id={team_id}
### 取得團隊成員列表

Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "members": [
    {
      "user_id": "uuid",
      "line_display_name": "Alex",
      "role": "owner",
      "can_manage_orders": true,
      "joined_at": "2025-10-20T..."
    },
    {
      "user_id": "uuid",
      "line_display_name": "Betty",
      "role": "member",
      "can_manage_orders": true,
      "joined_at": "2025-10-21T..."
    }
  ]
}

### POST /functions/v1/team-members-api/invite
### 建立邀請碼（僅 owner/admin）

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "team_id": "uuid",
  "role": "member",
  "max_uses": 10,
  "expires_at": "2025-10-30T..."
}

Response 201:
{
  "invite_code": "OCAKE-ABC123",
  "expires_at": "2025-10-30T..."
}

### POST /functions/v1/team-members-api/accept
### 使用邀請碼加入團隊

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "invite_code": "OCAKE-ABC123"
}

Response 200:
{
  "team_id": "uuid",
  "team_name": "OCake",
  "role": "member"
}

### PUT /functions/v1/team-members-api/{member_id}
### 修改成員權限（僅 owner）

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "role": "admin",
  "can_manage_orders": true,
  "can_manage_settings": true
}

Response 200: OK

### DELETE /functions/v1/team-members-api/{member_id}
### 移除成員（僅 owner）

Authorization: Bearer {JWT_TOKEN}

Response 200: OK
```

#### 3.2.3 LINE 官方帳號綁定 API (`bind-line-channel`) ⭐ 新增

```http
### POST /functions/v1/bind-line-channel
### 綁定 LINE 官方帳號到團隊

Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "team_id": "uuid",
  "channel_id": "1234567890",
  "channel_secret": "xxxxxx",
  "channel_access_token": "xxxxxx"
}

Response 200:
{
  "success": true,
  "webhook_url": "https://xxxx.supabase.co/functions/v1/line-webhook",
  "message": "請將此 Webhook URL 設定到 LINE Developers Console"
}

Error 400:
{
  "error": "CHANNEL_ALREADY_BOUND",
  "message": "此 LINE 官方帳號已綁定到其他團隊"
}
```

#### 3.2.4 訂單 API (`orders-api`)

> **注意**：所有訂單 API 都需要在 Query String 或 Body 中提供 `team_id`，用於指定操作哪個團隊的資料。

```typescript
// GET /functions/v1/orders-api?team_id={team_id}
// 查詢訂單列表
interface GetOrdersRequest {
  team_id: string; // ⭐ 必要參數
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  start_date?: string; // YYYY-MM-DD
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface GetOrdersResponse {
  orders: Order[];
  total: number;
  has_more: boolean;
}

// GET /functions/v1/orders-api/:id?team_id={team_id}
// 查詢單一訂單
interface GetOrderRequest {
  team_id: string; // ⭐ 必要參數
}

interface GetOrderResponse {
  order: Order;
  customer: Customer;
  line_conversation?: LineMessage[];
  created_by_user?: {
    line_display_name: string;
    line_picture_url: string;
  };
}

// POST /functions/v1/orders-api
// 建立訂單（手動建立）
interface CreateOrderRequest {
  team_id: string; // ⭐ 必要參數
  customer_name: string;
  customer_phone?: string;
  items: OrderItem[];
  total_amount: number;
  pickup_date: string; // YYYY-MM-DD
  pickup_time: string; // HH:MM
  notes?: string;
}

interface CreateOrderResponse {
  order_id: string;
  order_number: string;
  message: string;
}

// PATCH /functions/v1/orders-api/:id
// 更新訂單
interface UpdateOrderRequest {
  team_id: string; // ⭐ 必要參數（用於權限檢查）
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  items?: OrderItem[];
  total_amount?: number;
  pickup_date?: string;
  pickup_time?: string;
  notes?: string;
}

interface UpdateOrderResponse {
  order: Order;
  message: string;
}

// DELETE /functions/v1/orders-api/:id
// 刪除（取消）訂單
interface CancelOrderResponse {
  message: string;
}
```

#### 3.2.2 顧客 API (`customers-api`)

```typescript
// GET /functions/v1/customers-api
// 查詢顧客列表
interface GetCustomersRequest {
  search?: string; // 搜尋名稱或電話
  limit?: number;
  offset?: number;
}

interface GetCustomersResponse {
  customers: Customer[];
  total: number;
}

// GET /functions/v1/customers-api/:id
// 查詢單一顧客（含訂單歷史）
interface GetCustomerResponse {
  customer: Customer;
  orders: Order[];
  order_stats: {
    total_orders: number;
    total_spent: number;
    avg_order_value: number;
  };
}
```

#### 3.2.3 分析 API (`analytics`)

```typescript
// GET /functions/v1/analytics/summary
// 營收摘要
interface GetSummaryRequest {
  start_date: string;
  end_date: string;
}

interface GetSummaryResponse {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  daily_breakdown: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

// GET /functions/v1/analytics/dashboard
// Dashboard 資料（今日 + 本週）
interface GetDashboardResponse {
  today: {
    orders: number;
    revenue: number;
    pending: number;
  };
  this_week: {
    orders: number;
    revenue: number;
    growth: number; // 與上週比較
  };
  upcoming_orders: Order[]; // 未來 7 天
  urgent_orders: Order[]; // 今天 + 明天
}
```

### 3.3 錯誤處理機制

統一錯誤格式：

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

// 範例錯誤代碼
const ERROR_CODES = {
  // 認證相關
  AUTH_REQUIRED: "Authentication required",
  AUTH_INVALID_TOKEN: "Invalid or expired token",
  AUTH_PERMISSION_DENIED: "Permission denied",

  // 資料驗證
  VALIDATION_ERROR: "Input validation failed",
  INVALID_DATE: "Invalid date format",
  MISSING_FIELD: "Required field missing",

  // 業務邏輯
  ORDER_NOT_FOUND: "Order not found",
  CUSTOMER_NOT_FOUND: "Customer not found",
  DUPLICATE_ORDER: "Duplicate order number",

  // 外部服務
  LINE_API_ERROR: "LINE API error",
  AI_PARSE_ERROR: "AI parsing failed",

  // 系統錯誤
  INTERNAL_ERROR: "Internal server error",
  DATABASE_ERROR: "Database operation failed",
};
```

---

## 4. LINE 整合實作

### 4.1 LINE Webhook 接收流程

#### 4.1.1 Webhook URL 設定

```
https://[PROJECT_REF].supabase.co/functions/v1/line-webhook
```

#### 4.1.2 簽章驗證（多團隊版本）⭐

> **關鍵概念**：每個團隊擁有自己的 LINE 官方帳號，因此需要：
>
> 1. 從 Webhook 的 `destination` 欄位識別是哪個團隊的官方帳號
> 2. 使用該團隊的 `line_channel_secret` 驗證簽章
> 3. 使用該團隊的 `line_channel_access_token` 回覆訊息

```typescript
// supabase/functions/line-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 驗證 LINE 簽章（動態 secret）⭐
function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hash = createHmac("sha256", secret).update(body).digest("base64");

  return hash === signature;
}

serve(async (req) => {
  // 只接受 POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("x-line-signature");
  const body = await req.text();
  const payload = JSON.parse(body);

  // ⭐ 1. 從 destination 欄位識別是哪個團隊的官方帳號
  const botUserId = payload.destination; // 例如: "U1234567890abcdef"

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 2. 查詢該官方帳號屬於哪個團隊
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id, line_channel_secret, line_channel_access_token, ai_enabled, auto_mode"
    )
    .eq("line_channel_id", botUserId) // ⭐ 用 Bot User ID 查詢
    .single();

  if (error || !team) {
    console.error("Team not found for destination:", botUserId);
    return new Response("Team not found", { status: 404 });
  }

  // ⭐ 3. 用該團隊的 secret 驗證簽章
  if (
    !signature ||
    !verifySignature(body, signature, team.line_channel_secret)
  ) {
    return new Response("Invalid signature", { status: 403 });
  }

  // 4. 處理每個事件
  const { events } = payload;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      await handleTextMessage(event, team, supabase);
    }
  }

  return new Response("OK", { status: 200 });
});

// ⭐ 接收 team 物件而不是 user
async function handleTextMessage(event: any, team: any, supabase: any) {
  const { message, source } = event;
  const lineUserId = source.userId; // 顧客的 LINE User ID
  const messageText = message.text;

  // 1. 儲存訊息（屬於團隊）⭐
  const { data: messageRecord } = await supabase
    .from("line_messages")
    .insert({
      team_id: team.id, // ⭐ 屬於團隊
      line_message_id: message.id,
      line_user_id: lineUserId,
      message_type: "text",
      message_text: messageText,
    })
    .select()
    .single();

  // 2. 查找顧客（在該團隊內）
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("team_id", team.id)
    .eq("line_user_id", lineUserId)
    .single();

  if (!customer) {
    // 新顧客，引導註冊
    await replyToLine(
      event.replyToken,
      "您好！請提供您的姓名和電話，我們將為您建立訂單。",
      team.line_channel_access_token
    );
    return;
  }

  // 3. 如果啟用 AI，呼叫 AI Parser
  if (team.ai_enabled) {
    const aiResult = await callAIParser(messageText, team.id);

    // 4. 如果 AI 成功解析出訂單資訊
    if (aiResult.success && aiResult.order_data) {
      const orderData = aiResult.order_data;

      // 5. 如果是自動模式，直接建立訂單（由 AI 建立，created_by 為 null）⭐
      if (team.auto_mode) {
        const { data: order } = await supabase.rpc("create_order", {
          p_team_id: team.id, // ⭐ 改為 team_id
          p_created_by: null, // ⭐ AI 自動建立，沒有建立者
          p_customer_name: orderData.customer_name,
          p_customer_phone: orderData.customer_phone,
          p_items: orderData.items,
          p_total_amount: orderData.total_amount,
          p_pickup_date: orderData.pickup_date,
          p_pickup_time: orderData.pickup_time,
          p_source: "auto",
        });

        await replyToLine(
          event.replyToken,
          `✅ 已自動建立訂單 ${order.order_number}\n取件時間：${orderData.pickup_date} ${orderData.pickup_time}`,
          team.line_channel_access_token // ⭐ 用團隊的 token
        );
      } else {
        // 6. 半自動模式，等待商家確認
        // 儲存待確認訂單，通知團隊成員
        await notifyTeamMembers(team.id, aiResult.order_data);

        await replyToLine(
          event.replyToken,
          "已收到您的訂單，商家確認後會盡快回覆您！",
          team.line_channel_access_token // ⭐ 用團隊的 token
        );
      }
    }
  }
}

// 回覆 LINE 訊息（動態 token）⭐
async function replyToLine(
  replyToken: string,
  text: string,
  accessToken: string
) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`, // ⭐ 使用傳入的 token
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  return response.json();
}

// 呼叫 AI Parser
async function callAIParser(message: string, userId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-parser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ message, user_id: userId }),
  });

  return response.json();
}
```

### 4.2 LINE Login OAuth 流程

#### 4.2.1 Supabase Auth 設定

```toml
# supabase/config.toml
[auth.external.line]
enabled = true
client_id = "YOUR_LINE_CHANNEL_ID"
client_secret = "YOUR_LINE_CHANNEL_SECRET"
redirect_uri = "https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback"
```

#### 4.2.2 Mobile App 登入流程

```typescript
// mobile/app/(auth)/login.tsx
import { supabase } from "@/lib/supabase";

async function handleLineLogin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "line",
    options: {
      redirectTo: "oflow://auth/callback", // Deep link
      scopes: "profile openid email",
    },
  });

  if (error) {
    console.error("LINE Login failed:", error);
    return;
  }

  // LINE 會開啟瀏覽器進行 OAuth
  // 完成後會回到 App
}

// 處理 OAuth 回調
useEffect(() => {
  // 監聽 deep link
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === "SIGNED_IN") {
        // 登入成功，取得 user 資訊
        const user = session?.user;

        // 檢查是否第一次登入（需要建立 users 記錄）
        const { data: existingUser } = await supabase
          .from("users")
          .select()
          .eq("line_user_id", user?.id)
          .single();

        if (!existingUser) {
          // 第一次登入，建立商家資料
          await supabase.from("users").insert({
            line_user_id: user?.id,
            line_display_name: user?.user_metadata?.name,
            line_picture_url: user?.user_metadata?.picture,
            merchant_name: user?.user_metadata?.name || "我的商店",
          });
        }

        // 導航到主畫面
        router.replace("/(main)/(tabs)/today");
      }
    }
  );

  return () => {
    authListener?.subscription.unsubscribe();
  };
}, []);
```

### 4.3 LINE Messaging API 整合

#### 4.3.1 推送訊息給顧客

```typescript
// supabase/functions/_shared/line-client.ts
export class LineClient {
  private channelAccessToken: string;

  constructor() {
    this.channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
  }

  // 推送訊息
  async pushMessage(userId: string, text: string) {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE API error: ${response.statusText}`);
    }

    return response.json();
  }

  // 推送訂單確認訊息
  async pushOrderConfirmation(userId: string, order: any) {
    const text = `
✅ 訂單確認通知

訂單編號：${order.order_number}
取件日期：${order.pickup_date}
取件時間：${order.pickup_time}
金額：NT$ ${order.total_amount}

商品明細：
${order.items.map((item: any) => `• ${item.name} x${item.quantity}`).join("\n")}

感謝您的訂購！
`.trim();

    return this.pushMessage(userId, text);
  }

  // 推送提醒訊息
  async pushReminder(userId: string, reminder: any) {
    const daysText =
      reminder.remind_type === "today"
        ? "今天"
        : `${reminder.remind_type.replace("day", "")} 天後`;
    const text = `
⏰ 訂單提醒

${daysText}有訂單要取件喔！

訂單編號：${reminder.order.order_number}
顧客：${reminder.order.customer_name}
取件時間：${reminder.order.pickup_date} ${reminder.order.pickup_time}
`.trim();

    return this.pushMessage(userId, text);
  }
}
```

---

## 5. 認證授權機制

### 5.1 JWT Token 流程

```
┌──────────────────────────────────────────────────────────┐
│                  認證流程                                  │
└──────────────────────────────────────────────────────────┘

1. 商家在 Mobile App 點擊「LINE 登入」
         ↓
2. App 呼叫 supabase.auth.signInWithOAuth({ provider: 'line' })
         ↓
3. Supabase 導向 LINE OAuth 頁面
         ↓
4. 商家授權後，LINE 回調到 Supabase
         ↓
5. Supabase 生成 JWT Token（包含 user.id）
         ↓
6. App 取得 session（含 access_token 和 refresh_token）
         ↓
7. App 將 token 存入本地（zustand + AsyncStorage）
         ↓
8. 之後每次 API 請求都帶上 Authorization: Bearer <token>
         ↓
9. Edge Function 自動驗證 token（透過 Supabase Auth）
```

### 5.2 Mobile App 認證實作

```typescript
// mobile/lib/supabase.ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

```typescript
// mobile/stores/useAuthStore.ts
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;

  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isLoading: false });
  },

  signIn: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "line",
      options: {
        redirectTo: "oflow://auth/callback",
        scopes: "profile openid",
      },
    });

    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

// 監聽 auth 狀態變化
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
  });
});
```

### 5.3 Edge Function 驗證

```typescript
// supabase/functions/_shared/auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  // Supabase 會自動驗證 JWT
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid or expired token");
  }

  // 取得完整的商家資料
  const { data: merchantUser } = await supabase
    .from("users")
    .select("*")
    .eq("line_user_id", user.id)
    .single();

  return { user, merchantUser, supabase };
}
```

```typescript
// supabase/functions/orders-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

serve(async (req) => {
  try {
    // 驗證 JWT Token
    const { merchantUser, supabase } = await requireAuth(req);

    // 之後的邏輯可以安全使用 merchantUser
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", merchantUser.id)
      .order("created_at", { ascending: false });

    return new Response(JSON.stringify({ orders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### 5.4 API 權限控制

```typescript
// 權限檢查範例：只有訂單的商家可以修改
async function checkOrderPermission(
  orderId: string,
  userId: string,
  supabase: any
) {
  const { data: order } = await supabase
    .from("orders")
    .select("user_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user_id !== userId) {
    throw new Error("Permission denied");
  }

  return true;
}

// 在 Edge Function 中使用
serve(async (req) => {
  const { merchantUser, supabase } = await requireAuth(req);
  const url = new URL(req.url);
  const orderId = url.pathname.split("/").pop();

  if (req.method === "PATCH") {
    // 檢查權限
    await checkOrderPermission(orderId, merchantUser.id, supabase);

    // 繼續更新邏輯...
  }
});
```

---

## 6. 訂閱系統（In-App Purchase + RevenueCat）

### 6.1 為什麼必須使用 IAP？

#### App Store / Google Play 規定

```
✅ 必須使用 IAP 的情況（OFlow 屬於此類）：
├─ 訂閱 App 內的功能或服務
├─ 解鎖進階功能
├─ 移除廣告
└─ 虛擬商品

❌ 不能使用 IAP：
├─ 實體商品（如蛋糕、衣服）
├─ 實體服務（如理髮、按摩）
└─ 外部內容（如電子書、音樂）

⚠️ 違反規定 → 拒絕上架 / 下架
```

#### 費用結構

| 方案             | 抽成比例 | 條件                          |
| ---------------- | -------- | ----------------------------- |
| **標準費率**     | 30%      | 第一年訂閱                    |
| **標準費率**     | 15%      | 第二年起（同一用戶續訂）      |
| **小型企業方案** | 15%      | 年營收 < $1M USD ⭐️ 推薦申請 |

**實際收入計算（100 個付費用戶為例）：**

```
標準費率（第一年）：
├─ 用戶付費：100 × NT$ 300 = NT$ 30,000
├─ Apple/Google 抽成：30,000 × 30% = NT$ 9,000
└─ 實收：NT$ 21,000/月

小型企業方案（推薦）：
├─ 用戶付費：100 × NT$ 300 = NT$ 30,000
├─ Apple/Google 抽成：30,000 × 15% = NT$ 4,500
└─ 實收：NT$ 25,500/月 ⬆️ 多賺 50%！
```

### 6.2 OFlow 訂閱模式

#### 訂閱方案（團隊層級訂閱）⭐

```
┌─────────────────────────────────────────────────────────┐
│            OFlow Pro 訂閱方案（Team-Based）               │
└─────────────────────────────────────────────────────────┘

方案名稱：OFlow Pro（全功能）
產品 ID：oflow_pro_monthly

定價：
├─ 前 3 天：免費試用（功能全開）
└─ 第 4 天起：NT$ 300/月（自動續訂）

⭐ 訂閱單位（重要）：
└─ 1 個團隊 = 1 個 LINE 官方帳號 = 1 份訂閱

⭐ 多人協作支援：
├─ 一個團隊可有無限個成員
├─ 所有成員共享同一份訂閱
├─ 不需要每人都訂閱
└─ 範例：OCake 有 5 位員工，只需付 NT$ 300/月

⭐ 多裝置支援：
├─ 每位成員可在多台裝置登入（iPhone、iPad、Android）
├─ 訂單即時同步（Supabase Realtime）
└─ 操作記錄（誰建立/修改了哪個訂單）

功能包含：
├─ 綁定 LINE 官方帳號
├─ 多人協作管理訂單
├─ 自動 AI 解析訂單
├─ 無限訂單量
├─ 推播提醒
├─ 客戶管理
├─ 營收分析
└─ 團隊成員管理
```

#### 訂閱計費方式

```
情境 1：單人商家
User: Alex
└─ Team: OCake (owner)
    ├─ 訂閱: NT$ 300/月
    └─ 只有 Alex 一人使用

情境 2：多人商家（推薦）
Team: OCake
├─ 訂閱: NT$ 300/月（不是 900/月！）
├─ 成員:
│   ├─ Alex (owner) - iPhone
│   ├─ Betty (admin) - Android
│   └─ Charlie (member) - iPad
└─ 所有人共享訂閱權益

情境 3：用戶加入多個團隊
User: Alex
├─ OCake (owner) → OCake 付 NT$ 300/月
└─ BeautyShop (member) → BeautyShop 付 NT$ 300/月
說明：Alex 自己不用付錢，是團隊付訂閱費用
```

### 6.3 RevenueCat 整合

#### 為什麼選擇 RevenueCat？

```
RevenueCat = IAP 的 Supabase
├─ 統一處理 iOS + Android 訂閱（不用寫兩套）
├─ 自動處理續訂、取消、退款
├─ 提供 Webhook 通知後端
├─ 完整的分析儀表板
├─ 免費額度：每月 $10K USD 收入內免費
└─ 節省數百小時開發時間
```

#### 架構圖

```
┌─────────────────────────────────────────────────────────┐
│              OFlow IAP 訂閱架構流程                        │
└─────────────────────────────────────────────────────────┘

1. 用戶在 App 內點「開始免費試用」
   ↓
2. RevenueCat SDK 發起 In-App Purchase
   ↓
3. Apple App Store / Google Play 處理付款
   ├─ 顯示原生付款介面
   ├─ 驗證 Face ID / 指紋
   └─ 確認訂閱（含 3 天免費試用）
   ↓
4. 付款成功 → RevenueCat 接收通知
   ↓
5. RevenueCat Webhook → Supabase Edge Function
   ↓
6. 更新 users.subscription_status = 'trial'
   ↓
7. App 透過 Realtime 即時更新 UI
   ↓
8. 3 天後自動轉為付費訂閱（除非用戶取消）
```

### 6.4 Mobile App 實作

#### 安裝 RevenueCat SDK

```bash
cd mobile
npm install react-native-purchases
```

#### 初始化設定（團隊層級訂閱）⭐

```typescript
// mobile/lib/purchases.ts
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_API_KEY_IOS = "appl_xxxxxx";
const REVENUECAT_API_KEY_ANDROID = "goog_xxxxxx";

// ⭐ 使用 teamId 作為 app_user_id
export async function initializePurchases(teamId: string) {
  // 設定 API Key
  await Purchases.configure({
    apiKey:
      Platform.OS === "ios"
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID,
  });

  // ⭐ 設定 Team ID（關聯到團隊，不是個人）
  // RevenueCat 的 app_user_id = team_id
  // 這樣同一個團隊的所有成員都共享訂閱狀態
  await Purchases.logIn(teamId);

  console.log("✅ RevenueCat initialized for team:", teamId);
}

// 說明：
// - 當用戶登入 App 並選擇團隊後，呼叫 initializePurchases(currentTeam.id)
// - RevenueCat 會將訂閱狀態綁定到這個 team_id
// - 團隊內所有成員切換到該團隊時，都會看到相同的訂閱狀態
```

#### useSubscription Hook

```typescript
// mobile/hooks/useSubscription.ts
import { useState, useEffect } from "react";
import Purchases from "react-native-purchases";
import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  // 檢查訂閱狀態
  const checkSubscription = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();

      // 檢查是否有 'pro' entitlement
      const isActive = customerInfo.entitlements.active["pro"] !== undefined;

      setIsSubscribed(isActive);

      if (isActive) {
        setSubscriptionInfo({
          expiresDate: customerInfo.entitlements.active["pro"].expirationDate,
          productIdentifier:
            customerInfo.entitlements.active["pro"].productIdentifier,
          willRenew: customerInfo.entitlements.active["pro"].willRenew,
        });
      }

      return isActive;
    } catch (error) {
      console.error("Check subscription error:", error);
      return false;
    }
  };

  // 購買訂閱
  const subscribe = async () => {
    setIsLoading(true);
    try {
      // 1. 取得可用的訂閱方案
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        throw new Error("No subscription offerings available");
      }

      const monthlyPackage = offerings.current.availablePackages.find(
        (pkg) => pkg.identifier === "oflow_pro_monthly"
      );

      if (!monthlyPackage) {
        throw new Error("Monthly subscription not found");
      }

      // 2. 發起購買
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);

      // 3. 檢查訂閱狀態
      const isActive = customerInfo.entitlements.active["pro"] !== undefined;

      if (isActive) {
        setIsSubscribed(true);
        Alert.alert("🎉 訂閱成功！", "前 3 天免費試用，之後每月 NT$ 300", [
          { text: "開始使用" },
        ]);
      }

      return isActive;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error:", error);
        Alert.alert("訂閱失敗", error.message || "請稍後再試");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 恢復購買（換裝置時）
  const restorePurchases = async () => {
    setIsLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isActive = customerInfo.entitlements.active["pro"] !== undefined;

      if (isActive) {
        setIsSubscribed(true);
        Alert.alert("✅ 恢復成功", "您的訂閱已恢復");
      } else {
        Alert.alert("❌ 未找到訂閱", "請先訂閱 OFlow Pro");
      }

      return isActive;
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert("恢復失敗", "請稍後再試");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 取消訂閱（導向設定頁面）
  const manageSubscription = async () => {
    try {
      await Purchases.showManagementURL();
    } catch (error) {
      Alert.alert(
        "管理訂閱",
        Platform.OS === "ios"
          ? "請前往「設定 > Apple ID > 訂閱項目」管理"
          : "請前往 Google Play 管理訂閱"
      );
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return {
    isSubscribed,
    isLoading,
    subscriptionInfo,
    subscribe,
    checkSubscription,
    restorePurchases,
    manageSubscription,
  };
}
```

#### UI 組件：訂閱卡片

```typescript
// mobile/components/SubscriptionCard.tsx
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/native/Card";
import { Button } from "@/components/native/Button";

export function SubscriptionCard() {
  const {
    isSubscribed,
    isLoading,
    subscriptionInfo,
    subscribe,
    restorePurchases,
    manageSubscription,
  } = useSubscription();

  // 已訂閱狀態
  if (isSubscribed) {
    return (
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
        <View className="flex-row items-center mb-2">
          <Text className="text-white text-lg font-bold">✨ OFlow Pro</Text>
          <View className="ml-2 bg-white/20 px-2 py-1 rounded">
            <Text className="text-white text-xs">訂閱中</Text>
          </View>
        </View>

        <Text className="text-white/90 text-sm mb-4">
          所有功能已解鎖，感謝您的支持！
        </Text>

        {subscriptionInfo?.expiresDate && (
          <Text className="text-white/70 text-xs mb-4">
            下次續訂：
            {new Date(subscriptionInfo.expiresDate).toLocaleDateString("zh-TW")}
          </Text>
        )}

        <Button variant="secondary" size="sm" onPress={manageSubscription}>
          管理訂閱
        </Button>
      </Card>
    );
  }

  // 未訂閱狀態
  return (
    <Card className="border-2 border-blue-500">
      <View className="p-6">
        <Text className="text-xl font-bold mb-2">升級到 OFlow Pro</Text>

        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-green-600 mr-2">✓</Text>
            <Text className="text-gray-700">前 3 天免費試用</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-green-600 mr-2">✓</Text>
            <Text className="text-gray-700">無限訂單處理</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-green-600 mr-2">✓</Text>
            <Text className="text-gray-700">AI 自動解析訂單</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-green-600 mr-2">✓</Text>
            <Text className="text-gray-700">多裝置同步使用</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-green-600 mr-2">✓</Text>
            <Text className="text-gray-700">隨時可以取消</Text>
          </View>
        </View>

        <View className="bg-blue-50 p-3 rounded-lg mb-4">
          <Text className="text-center text-gray-600 text-sm">
            試用期結束後
          </Text>
          <Text className="text-center text-2xl font-bold text-blue-600 my-1">
            NT$ 300
          </Text>
          <Text className="text-center text-gray-600 text-sm">
            每月自動續訂
          </Text>
        </View>

        <Button onPress={subscribe} loading={isLoading} className="mb-2">
          開始 3 天免費試用
        </Button>

        <Button variant="ghost" size="sm" onPress={restorePurchases}>
          恢復購買
        </Button>
      </View>
    </Card>
  );
}
```

#### 在 App 啟動時初始化

```typescript
// mobile/app/_layout.tsx
import { useEffect } from 'react'
import { initializePurchases } from '@/lib/purchases'
import { useAuthStore } from '@/stores/useAuthStore'

export default function RootLayout() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      // 用 LINE User ID 初始化 RevenueCat
      initializePurchases(user.id)
    }
  }, [user])

  return (
    // ... layout code
  )
}
```

### 6.5 後端整合（RevenueCat Webhook）

#### Edge Function: revenuecat-webhook

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const event = await req.json();

    console.log("📥 RevenueCat Event:", event.type);

    const lineUserId = event.app_user_id; // 這是我們在 logIn() 時設定的 LINE User ID

    switch (event.type) {
      case "INITIAL_PURCHASE":
        // 首次購買（試用期開始）
        await supabase
          .from("users")
          .update({
            subscription_status: "trial",
            trial_started_at: new Date(),
            trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 天後
            revenuecat_customer_id: event.id,
            subscription_product_id: event.product_id,
            subscription_platform: event.store,
          })
          .eq("line_user_id", lineUserId);

        // 記錄交易
        await supabase.from("subscription_transactions").insert({
          user_id: (
            await supabase
              .from("users")
              .select("id")
              .eq("line_user_id", lineUserId)
              .single()
          ).data?.id,
          revenuecat_transaction_id: event.id,
          revenuecat_event_type: "INITIAL_PURCHASE",
          product_id: event.product_id,
          platform: event.store,
          price: event.price,
          currency: event.currency,
          purchased_at: new Date(),
          expires_at: new Date(event.expiration_at_ms),
          raw_data: event,
        });

        console.log("✅ Trial started for user:", lineUserId);
        break;

      case "RENEWAL":
        // 續訂（試用期結束後或每月續訂）
        await supabase
          .from("users")
          .update({
            subscription_status: "active",
            subscription_started_at: new Date(),
            subscription_current_period_end: new Date(event.expiration_at_ms),
          })
          .eq("line_user_id", lineUserId);

        await supabase.from("subscription_transactions").insert({
          user_id: (
            await supabase
              .from("users")
              .select("id")
              .eq("line_user_id", lineUserId)
              .single()
          ).data?.id,
          revenuecat_transaction_id: event.id,
          revenuecat_event_type: "RENEWAL",
          product_id: event.product_id,
          platform: event.store,
          price: event.price,
          currency: event.currency,
          purchased_at: new Date(),
          expires_at: new Date(event.expiration_at_ms),
          raw_data: event,
        });

        console.log("✅ Subscription renewed for user:", lineUserId);
        break;

      case "CANCELLATION":
        // 用戶取消訂閱（但仍可用到期末）
        await supabase
          .from("users")
          .update({
            subscription_status: "cancelled",
          })
          .eq("line_user_id", lineUserId);

        console.log("⚠️ Subscription cancelled for user:", lineUserId);
        break;

      case "EXPIRATION":
        // 訂閱過期
        await supabase
          .from("users")
          .update({
            subscription_status: "expired",
          })
          .eq("line_user_id", lineUserId);

        console.log("❌ Subscription expired for user:", lineUserId);
        break;

      case "BILLING_ISSUE":
        // 扣款失敗
        await supabase
          .from("users")
          .update({
            subscription_status: "billing_issue",
          })
          .eq("line_user_id", lineUserId);

        console.log("💳 Billing issue for user:", lineUserId);
        break;

      default:
        console.log("ℹ️ Unhandled event type:", event.type);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

#### 設定 RevenueCat Webhook URL

在 RevenueCat Dashboard 設定：

```
Webhook URL:
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/revenuecat-webhook

Event Types（勾選）:
☑ INITIAL_PURCHASE
☑ RENEWAL
☑ CANCELLATION
☑ EXPIRATION
☑ BILLING_ISSUE
```

### 6.6 訂閱狀態保護

#### Edge Function 中檢查訂閱

```typescript
// supabase/functions/_shared/subscription.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireActiveSubscription(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  // 取得當前用戶
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 取得商家資料
  const { data: merchantUser } = await supabase
    .from("users")
    .select("*")
    .eq("line_user_id", user.id)
    .single();

  if (!merchantUser) {
    throw new Error("User not found");
  }

  // 檢查訂閱狀態
  const { data: isValid } = await supabase.rpc("check_subscription_valid", {
    p_user_id: merchantUser.id,
  });

  if (!isValid) {
    throw new Error(
      "Subscription expired. Please renew to continue using OFlow."
    );
  }

  return { user, merchantUser, supabase };
}
```

#### 在需要訂閱的 API 中使用

```typescript
// supabase/functions/orders-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireActiveSubscription } from "../_shared/subscription.ts";

serve(async (req) => {
  try {
    // 檢查訂閱狀態
    const { merchantUser, supabase } = await requireActiveSubscription(req);

    // 繼續處理訂單邏輯...
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", merchantUser.id);

    return new Response(JSON.stringify({ orders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: "SUBSCRIPTION_REQUIRED",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

### 6.7 產品設定（App Store / Google Play）

#### App Store Connect 設定

```
1. 前往 App Store Connect
2. 選擇你的 App → 功能 → App 內購買項目
3. 點擊「+」建立新產品
4. 選擇「自動續訂訂閱」

產品設定：
├─ 參考名稱：OFlow Pro Monthly
├─ 產品 ID：oflow_pro_monthly
├─ 訂閱群組：OFlow Subscriptions
└─ 價格：Tier 10 (NT$ 300)

試用期設定：
└─ 3 天免費試用

訂閱時長：
└─ 1 個月

審查資訊：
└─ 截圖：顯示訂閱功能的畫面
```

#### Google Play Console 設定

```
1. 前往 Google Play Console
2. 選擇你的 App → 營利 → 產品 → 訂閱
3. 建立訂閱

產品設定：
├─ 產品 ID：oflow_pro_monthly
├─ 名稱：OFlow Pro
└─ 說明：OFlow 全功能訂閱

定價：
└─ NT$ 300/月

試用期：
└─ 3 天免費試用

計費週期：
└─ 每 1 個月
```

### 6.8 申請小型企業方案（省 50% 手續費！）

#### Apple Small Business Program

```
條件：
└─ 過去 12 個月營收 < $1M USD

申請網址：
https://developer.apple.com/app-store/small-business-program/

好處：
├─ 手續費從 30% → 15%
└─ 自動適用，無需修改程式碼

申請流程：
1. 前往申請網址
2. 同意條款
3. 等待審核（通常 1-2 週）
4. 核准後自動生效
```

#### Google Play 15% 費率

```
條件：
└─ 前 $1M USD 收入

好處：
├─ 前 $1M 收入手續費 15%
└─ 超過 $1M 的部分才收 30%

自動適用：
└─ 無需申請，Google Play 自動計算
```

---

## 7. LINE 官方帳號綁定

### 7.1 為什麼需要綁定官方帳號？

```
┌─────────────────────────────────────────────────────────┐
│           LINE 整合架構（重要觀念）                         │
└─────────────────────────────────────────────────────────┘

LINE Login（用於登入 OFlow App）
├─ 用途：商家用 LINE 帳號登入 OFlow
├─ 範圍：只能取得商家的基本資料（名稱、頭像）
└─ 無法：讀取商家的個人 LINE 對話 ❌

LINE Official Account（用於接收訂單）
├─ 用途：商家的「品牌官方帳號」（如：小美甜點）
├─ 顧客：加「小美甜點」官方帳號為好友
├─ 訊息：顧客傳訊息給官方帳號 → OFlow Webhook 接收
└─ OFlow：代商家自動回覆顧客 ✅

結論：
├─ LINE Login = 登入驗證
└─ LINE Official Account = 接收訂單訊息
```

### 7.2 綁定流程（商家視角）

```
┌─────────────────────────────────────────────────────────┐
│              商家綁定 LINE 官方帳號流程                      │
└─────────────────────────────────────────────────────────┘

前置作業（商家需要先完成）：
1️⃣ 建立 LINE Official Account
   → 前往 https://manager.line.biz/
   → 建立官方帳號（如：小美甜點）

2️⃣ 啟用 Messaging API
   → 在 LINE Official Account Manager
   → 設定 → Messaging API → 啟用

3️⃣ 建立 Channel
   → 會自動跳轉到 LINE Developers Console
   → 取得 Channel ID、Channel Secret、Channel Access Token

在 OFlow App 中綁定：
4️⃣ 登入 OFlow App（用 LINE Login）

5️⃣ 進入「設定」→「綁定 LINE 官方帳號」

6️⃣ 輸入三個資訊：
   ├─ Channel ID
   ├─ Channel Secret
   └─ Channel Access Token

7️⃣ 點擊「驗證並綁定」

8️⃣ OFlow 驗證 Token 有效性
   ├─ 測試呼叫 LINE API
   └─ 取得官方帳號名稱

9️⃣ 綁定成功！
   ├─ OFlow 自動設定 Webhook URL
   └─ 開始接收訂單訊息

🔟 分享官方帳號 QR Code 給客人
   └─ 客人加好友後即可開始訂單
```

### 7.3 Mobile App 實作

#### 綁定設定頁面

```typescript
// mobile/app/(main)/(tabs)/settings.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const [isBinding, setIsBinding] = useState(false);

  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");

  const handleBindLineAccount = async () => {
    if (!channelId || !channelSecret || !channelAccessToken) {
      Alert.alert("錯誤", "請填寫所有欄位");
      return;
    }

    setIsBinding(true);
    try {
      // 呼叫後端 Edge Function 驗證並綁定
      const { data, error } = await supabase.functions.invoke(
        "bind-line-channel",
        {
          body: {
            channel_id: channelId,
            channel_secret: channelSecret,
            channel_access_token: channelAccessToken,
          },
        }
      );

      if (error) throw error;

      Alert.alert(
        "✅ 綁定成功！",
        `已綁定官方帳號：${data.channel_name}\n\n現在可以開始接收訂單了！`,
        [{ text: "太好了！" }]
      );

      // 清空輸入
      setChannelId("");
      setChannelSecret("");
      setChannelAccessToken("");
    } catch (error: any) {
      Alert.alert("綁定失敗", error.message || "請檢查輸入的資訊是否正確");
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <SectionHeader title="LINE 官方帳號綁定" />

        <Card className="p-4 mb-4">
          <Text className="font-semibold text-lg mb-2">
            綁定你的 LINE 官方帳號
          </Text>
          <Text className="text-sm text-gray-600 mb-4">
            綁定後即可自動接收顧客的訂單訊息
          </Text>

          {/* Channel ID */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1">Channel ID</Text>
            <TextInput
              value={channelId}
              onChangeText={setChannelId}
              placeholder="1234567890"
              className="border border-gray-300 rounded-lg p-3"
              keyboardType="numeric"
            />
          </View>

          {/* Channel Secret */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1">Channel Secret</Text>
            <TextInput
              value={channelSecret}
              onChangeText={setChannelSecret}
              placeholder="abc123def456..."
              className="border border-gray-300 rounded-lg p-3"
              secureTextEntry
            />
          </View>

          {/* Channel Access Token */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1">
              Channel Access Token
            </Text>
            <TextInput
              value={channelAccessToken}
              onChangeText={setChannelAccessToken}
              placeholder="xyz789..."
              className="border border-gray-300 rounded-lg p-3"
              secureTextEntry
              multiline
            />
          </View>

          <Button onPress={handleBindLineAccount} loading={isBinding}>
            驗證並綁定
          </Button>

          {/* 教學連結 */}
          <TouchableOpacity
            onPress={() => {
              // 開啟教學頁面或影片
              Linking.openURL("https://oflow.app/how-to-bind-line");
            }}
            className="mt-3"
          >
            <Text className="text-blue-600 text-center text-sm">
              📖 如何取得這些資訊？
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}
```

### 7.4 後端實作（綁定驗證）

#### Edge Function: bind-line-channel

```typescript
// supabase/functions/bind-line-channel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  try {
    // 取得當前用戶
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { channel_id, channel_secret, channel_access_token } =
      await req.json();

    // 1. 驗證 Channel Access Token 是否有效
    const lineResponse = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${channel_access_token}`,
      },
    });

    if (!lineResponse.ok) {
      throw new Error("Invalid Channel Access Token");
    }

    const botInfo = await lineResponse.json();

    // 2. 設定 Webhook URL
    const webhookUrl = `${Deno.env.get(
      "SUPABASE_URL"
    )}/functions/v1/line-webhook`;

    const setWebhookResponse = await fetch(
      "https://api.line.me/v2/bot/channel/webhook/endpoint",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channel_access_token}`,
        },
        body: JSON.stringify({
          endpoint: webhookUrl,
        }),
      }
    );

    if (!setWebhookResponse.ok) {
      console.warn("Failed to set webhook, but continuing...");
    }

    // 3. 儲存到資料庫
    const { error: updateError } = await supabase
      .from("users")
      .update({
        line_channel_id: channel_id,
        line_channel_secret: channel_secret,
        line_channel_access_token: channel_access_token,
        line_channel_name: botInfo.displayName,
        line_webhook_verified: true,
        line_connected_at: new Date().toISOString(),
      })
      .eq("line_user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel_name: botInfo.displayName,
        webhook_url: webhookUrl,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

### 7.5 更新 LINE Webhook（支援多商家）

```typescript
// supabase/functions/line-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const signature = req.headers.get("x-line-signature");
    const body = await req.text();
    const { events, destination } = JSON.parse(body);

    // destination = Bot User ID，用於識別是哪個商家的官方帳號
    console.log("📥 Webhook from bot:", destination);

    // 1. 根據 destination 查找對應的商家
    const { data: merchantUser } = await supabase
      .from("users")
      .select("*")
      .eq("line_channel_id", destination)
      .single();

    if (!merchantUser) {
      console.error("❌ Merchant not found for bot:", destination);
      return new Response("Bot not registered", { status: 404 });
    }

    // 2. 驗證簽章
    const hash = createHmac("sha256", merchantUser.line_channel_secret)
      .update(body)
      .digest("base64");

    if (hash !== signature) {
      return new Response("Invalid signature", { status: 403 });
    }

    // 3. 處理每個事件
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        await handleTextMessage(event, merchantUser, supabase);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});

async function handleTextMessage(event: any, merchantUser: any, supabase: any) {
  const { message, source } = event;
  const customerId = source.userId; // 顧客的 LINE ID
  const messageText = message.text;

  console.log(`💬 Message from ${customerId}: ${messageText}`);

  // 1. 儲存訊息
  await supabase.from("line_messages").insert({
    user_id: merchantUser.id,
    line_message_id: message.id,
    line_user_id: customerId,
    message_type: "text",
    message_text: messageText,
  });

  // 2. 如果啟用 AI，呼叫 AI Parser
  if (merchantUser.ai_enabled) {
    const aiResult = await callAIParser(messageText, merchantUser.id);

    if (aiResult.success && aiResult.order_data) {
      // 3. 生成訂單
      const order = aiResult.order_data;

      if (merchantUser.auto_mode) {
        // 自動模式：直接建立訂單
        await createOrder(merchantUser.id, customerId, order, supabase);

        // 回覆顧客
        await replyToLine(
          merchantUser.line_channel_access_token,
          event.replyToken,
          `✅ 訂單已確認！\n取件時間：${order.pickup_date} ${order.pickup_time}`
        );
      } else {
        // 半自動模式：通知商家確認
        await notifyMerchant(merchantUser.id, order);

        await replyToLine(
          merchantUser.line_channel_access_token,
          event.replyToken,
          "已收到您的訂單，商家確認後會盡快回覆您！"
        );
      }
    }
  }
}

async function replyToLine(
  accessToken: string,
  replyToken: string,
  text: string
) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}
```

---

## 8. AI 服務整合

### 8.1 AI Parser 架構

```typescript
// supabase/functions/ai-parser/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

serve(async (req) => {
  const { message, user_id } = await req.json();

  try {
    const result = await parseOrderFromMessage(message, user_id);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function parseOrderFromMessage(message: string, userId: string) {
  const systemPrompt = `
你是 OFlow 智慧訂單助手，專門從對話中提取訂單資訊。

請從以下訊息中提取訂單資訊，並以 JSON 格式回覆：

{
  "is_order": true/false,           // 是否為訂單訊息
  "confidence": 0.0-1.0,            // 信心度
  "customer_name": "...",           // 顧客名稱
  "customer_phone": "...",          // 電話（如果有）
  "items": [                        // 商品列表
    {
      "name": "商品名稱",
      "quantity": 數量,
      "price": 價格,                // 如果有提到
      "notes": "備註"               // 如果有
    }
  ],
  "pickup_date": "YYYY-MM-DD",      // 取件日期
  "pickup_time": "HH:MM",           // 取件時間
  "total_amount": 總金額,            // 如果能推算出來
  "notes": "其他備註"
}

規則：
1. 如果訊息不是訂單（例如打招呼、問問題），is_order 設為 false
2. 日期推算：「明天」= 今天+1天，「下週五」= 推算出具體日期
3. 如果資訊不完整，confidence 降低
4. 價格如果沒提到，設為 0
5. 商品名稱要標準化（例如「巴斯克 6 吋」→「巴斯克蛋糕 6吋」）

今天日期：${new Date().toISOString().split("T")[0]}
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const aiResponse = completion.choices[0].message.content;
  const parsed = JSON.parse(aiResponse);

  return {
    success: parsed.is_order && parsed.confidence >= 0.7,
    confidence: parsed.confidence,
    order_data: parsed.is_order ? parsed : null,
    raw_response: parsed,
  };
}
```

### 6.2 AI 成本控制策略

```typescript
// AI 使用記錄表
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 使用資訊
  function_name TEXT NOT NULL,              -- 哪個功能呼叫 AI
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  total_cost DECIMAL(10,4) NOT NULL,        -- 成本（美金）

  -- 結果
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成本監控 function
CREATE OR REPLACE FUNCTION check_ai_budget(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  monthly_usage DECIMAL;
  monthly_limit DECIMAL := 50.00;  -- 每個商家每月 $50 USD 上限
BEGIN
  SELECT COALESCE(SUM(total_cost), 0) INTO monthly_usage
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', NOW());

  RETURN monthly_usage < monthly_limit;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Edge Function 中使用
async function parseWithCostControl(message: string, userId: string) {
  // 檢查預算
  const { data: canUseAI } = await supabase
    .rpc('check_ai_budget', { p_user_id: userId })

  if (!canUseAI) {
    throw new Error('AI budget exceeded for this month')
  }

  // 呼叫 AI
  const completion = await openai.chat.completions.create({...})

  // 記錄使用量
  const usage = completion.usage
  const cost = (usage.prompt_tokens * 0.00001 + usage.completion_tokens * 0.00003) // GPT-4 pricing

  await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    function_name: 'ai-parser',
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    total_cost: cost
  })

  return completion
}
```

### 6.3 AI 快取優化

```typescript
// 對相似訊息使用快取，減少 AI 呼叫
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_hash TEXT UNIQUE NOT NULL,        -- 訊息的 hash
  parsed_result JSONB NOT NULL,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_cache_hash ON ai_cache(message_hash);

// 在 AI Parser 中使用快取
async function parseWithCache(message: string, userId: string) {
  // 計算訊息 hash（去除空白、標點符號後）
  const normalized = message.toLowerCase().replace(/[^\w\s]/g, '')
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  )
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // 檢查快取
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('parsed_result')
    .eq('message_hash', hashHex)
    .single()

  if (cached) {
    // 快取命中，增加計數
    await supabase
      .from('ai_cache')
      .update({ hit_count: cached.hit_count + 1 })
      .eq('message_hash', hashHex)

    return { ...cached.parsed_result, from_cache: true }
  }

  // 快取未命中，呼叫 AI
  const result = await callOpenAI(message, userId)

  // 儲存到快取
  await supabase.from('ai_cache').insert({
    message_hash: hashHex,
    parsed_result: result
  })

  return result
}
```

---

## 7. 部署與開發流程

### 7.1 本地開發環境設定

#### 7.1.1 安裝 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

#### 7.1.2 初始化專案

```bash
cd /Users/alex/Desktop/OFlow-monorepo

# 初始化 Supabase（會建立 supabase/ 資料夾）
supabase init

# 啟動本地 Supabase（包含 PostgreSQL、Auth、Edge Functions）
supabase start
```

輸出會顯示：

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJh...
service_role key: eyJh...
```

#### 7.1.3 環境變數設定

```bash
# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# supabase/.env (用於 Edge Functions)
OPENAI_API_KEY=sk-...
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
```

#### 7.1.4 部署 Database Schema

```bash
# 建立 migration 檔案
supabase migration new initial_schema

# 編輯 supabase/migrations/XXXXXX_initial_schema.sql
# （複製前面的 SQL Schema）

# 套用 migration
supabase db push
```

#### 7.1.5 開發 Edge Functions

```bash
# 建立新 Function
supabase functions new orders-api

# 本地測試 Function
supabase functions serve orders-api

# 呼叫測試
curl -X POST http://localhost:54321/functions/v1/orders-api \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'
```

### 7.2 生產環境部署

#### 7.2.1 建立 Supabase 專案

1. 前往 [https://supabase.com](https://supabase.com)
2. 建立新專案（選擇地區：Singapore 或 Tokyo，較靠近台灣）
3. 記下專案的：
   - Project URL: `https://xxx.supabase.co`
   - anon public key
   - service_role key（保密！）

#### 7.2.2 連結本地專案到遠端

```bash
# 登入 Supabase
supabase login

# 連結到遠端專案
supabase link --project-ref YOUR_PROJECT_REF

# 推送 migrations
supabase db push

# 部署 Edge Functions
supabase functions deploy line-webhook
supabase functions deploy ai-parser
supabase functions deploy orders-api
supabase functions deploy notifications
```

#### 7.2.3 設定環境變數（生產環境）

```bash
# 設定 Edge Functions 的環境變數
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set LINE_CHANNEL_SECRET=...
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=...

# 查看已設定的 secrets
supabase secrets list
```

#### 7.2.4 設定 LINE Webhook URL

在 LINE Developers Console 設定：

```
Webhook URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/line-webhook
```

啟用「Use webhook」並驗證 URL。

### 7.3 CI/CD 自動部署

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - "supabase/**"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to Supabase project
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Push database migrations
        run: supabase db push

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy line-webhook
          supabase functions deploy ai-parser
          supabase functions deploy orders-api
          supabase functions deploy notifications

      - name: Set secrets
        run: |
          supabase secrets set OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          supabase secrets set LINE_CHANNEL_SECRET=${{ secrets.LINE_CHANNEL_SECRET }}
          supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
```

### 7.4 監控與除錯

#### 7.4.1 查看 Edge Function Logs

```bash
# 本地查看
supabase functions logs orders-api

# 或在 Supabase Dashboard
# Project > Edge Functions > [Function Name] > Logs
```

#### 7.4.2 查看資料庫查詢效能

```sql
-- 查看慢查詢
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 查看表格大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 7.4.3 錯誤追蹤（整合 Sentry）

```typescript
// supabase/functions/_shared/sentry.ts
import * as Sentry from "https://deno.land/x/sentry/index.ts";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("ENVIRONMENT") || "production",
});

export function captureError(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// 在 Edge Function 中使用
try {
  // ... 業務邏輯
} catch (error) {
  captureError(error, { function: "orders-api", userId });
  throw error;
}
```

---

## 8. 開發路徑規劃

### Phase 1: 基礎建設（第 1-2 週）

#### ✅ 任務清單

- [ ] **專案設定**
  - [ ] 建立 Supabase 專案
  - [ ] 安裝 Supabase CLI
  - [ ] 初始化本地開發環境
- [ ] **資料庫建立**
  - [ ] 建立完整 Schema（users, orders, customers, etc.）
  - [ ] 設定 RLS 政策
  - [ ] 建立 Database Functions（create_order, generate_order_number）
  - [ ] 建立 Triggers（auto update_at, create reminders）
  - [ ] 測試資料庫功能
- [ ] **基本 API 開發**
  - [ ] `orders-api`: 訂單 CRUD（GET, POST, PATCH, DELETE）
  - [ ] `customers-api`: 顧客查詢
  - [ ] 統一錯誤處理
  - [ ] API 測試（使用 Postman 或 curl）
- [ ] **Mobile App 整合**
  - [ ] 安裝 `@supabase/supabase-js`
  - [ ] 設定 Supabase client
  - [ ] 改寫 `useOrderStore` 串接真實 API
  - [ ] 測試訂單列表、訂單詳情頁面

#### 🎯 階段目標

完成資料庫與基本 API，Mobile App 可以讀取和建立訂單。

---

### Phase 2: LINE 整合（第 3-4 週）

#### ✅ 任務清單

- [ ] **LINE Webhook 開發**
  - [ ] 建立 `line-webhook` Edge Function
  - [ ] 實作簽章驗證
  - [ ] 處理文字訊息事件
  - [ ] 儲存訊息到 `line_messages` 表
  - [ ] 測試接收 LINE 訊息
- [ ] **LINE Login OAuth**
  - [ ] 在 Supabase Auth 設定 LINE Provider
  - [ ] 在 LINE Developers 設定 OAuth
  - [ ] Mobile App 實作 LINE 登入
  - [ ] 處理 OAuth 回調
  - [ ] 建立/更新 users 記錄
  - [ ] 測試登入流程
- [ ] **LINE Messaging API**
  - [ ] 建立 LineClient 類別
  - [ ] 實作推送訊息功能
  - [ ] 實作訂單確認訊息模板
  - [ ] 測試推送訊息到 LINE

#### 🎯 階段目標

商家可以用 LINE 登入 App，系統可以接收 LINE 訊息並推送通知。

---

### Phase 3: AI 整合（第 5-6 週）

#### ✅ 任務清單

- [ ] **AI Parser 開發**
  - [ ] 建立 `ai-parser` Edge Function
  - [ ] 設定 OpenAI API
  - [ ] 撰寫 System Prompt
  - [ ] 測試各種訂單格式（明確、模糊、非訂單）
  - [ ] 調整 Prompt 提升準確度
- [ ] **AI 與 Webhook 整合**
  - [ ] 在 `line-webhook` 中呼叫 `ai-parser`
  - [ ] 根據 AI 結果建立訂單
  - [ ] 處理自動模式 vs 半自動模式
  - [ ] 回覆 LINE 訊息給顧客
- [ ] **成本控制**
  - [ ] 建立 `ai_usage_logs` 表
  - [ ] 實作使用量追蹤
  - [ ] 實作預算檢查
  - [ ] 實作 AI 快取機制
- [ ] **Mobile App 整合**
  - [ ] 顯示 AI 解析的訂單（待確認列表）
  - [ ] 商家可以確認/修改/拒絕 AI 訂單
  - [ ] 設定頁面：切換自動/半自動模式

#### 🎯 階段目標

AI 可以自動從 LINE 對話生成訂單，商家可以在 App 中確認。

---

### Phase 4: 推播通知（第 7 週）

#### ✅ 任務清單

- [ ] **提醒系統開發**
  - [ ] 確認 `reminders` 表和 trigger 正常運作
  - [ ] 建立 `notifications` Edge Function
  - [ ] 實作定時檢查（使用 Supabase Cron 或外部 scheduler）
  - [ ] 發送推播到 Mobile App（Expo Notifications）
  - [ ] 發送推播到 LINE（給商家）
- [ ] **Mobile App 推播整合**
  - [ ] 設定 Expo Notifications
  - [ ] 請求推播權限
  - [ ] 儲存 push token 到資料庫
  - [ ] 測試接收推播
  - [ ] 點擊推播導航到對應訂單

#### 🎯 階段目標

系統自動在訂單前 N 天推播提醒給商家。

---

### Phase 5: 進階功能（第 8+ 週）

#### ✅ 任務清單

- [ ] **分析 API**
  - [ ] `analytics/summary`: 營收摘要
  - [ ] `analytics/dashboard`: Dashboard 資料
  - [ ] 效能優化（使用 Materialized Views）
- [ ] **Realtime 同步**
  - [ ] 啟用 Supabase Realtime
  - [ ] Mobile App 訂閱 orders 表變更
  - [ ] 訂單狀態即時更新到 UI
- [ ] **進階功能**
  - [ ] 批次匯出訂單（CSV）
  - [ ] 商品目錄管理
  - [ ] 顧客標籤與分群
  - [ ] 營收趨勢圖表

#### 🎯 階段目標

完善系統功能，提升使用者體驗。

---

## 9. Team-Centric 架構變更總結

### 9.1 核心變更清單

#### 資料庫變更 ⭐

| 變更項目       | 舊架構                  | 新架構                                  | 影響                         |
| -------------- | ----------------------- | --------------------------------------- | ---------------------------- |
| **核心實體**   | `users` 擁有所有資料    | `teams` 擁有所有資料                    | 所有業務邏輯改為以團隊為中心 |
| **新增 Table** | -                       | `teams`, `team_members`, `team_invites` | 支援團隊協作                 |
| **訂單歸屬**   | `orders.user_id`        | `orders.team_id` + `orders.created_by`  | 追蹤操作者                   |
| **顧客歸屬**   | `customers.user_id`     | `customers.team_id`                     | 團隊共享顧客資料             |
| **LINE 訊息**  | `line_messages.user_id` | `line_messages.team_id`                 | 團隊共享對話記錄             |
| **訂閱狀態**   | 在 `users` 表           | 在 `teams` 表                           | 團隊層級訂閱                 |

#### API 變更 ⭐

| API 端點         | 變更內容                    | 影響                       |
| ---------------- | --------------------------- | -------------------------- |
| **所有訂單 API** | 新增必要參數 `team_id`      | 需要指定操作哪個團隊的資料 |
| **所有顧客 API** | 新增必要參數 `team_id`      | 需要指定操作哪個團隊的資料 |
| **新增**         | `teams-api`                 | 團隊 CRUD                  |
| **新增**         | `team-members-api`          | 成員管理、邀請機制         |
| **新增**         | `bind-line-channel`         | 綁定 LINE 官方帳號到團隊   |
| **LINE Webhook** | 改用 `destination` 識別團隊 | 支援多團隊多官方帳號       |

#### RLS 政策變更 ⭐

```sql
-- 舊政策（User-Centric）
WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid())

-- 新政策（Team-Centric）
WHERE team_id IN (
  SELECT team_id FROM team_members
  WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid())
)
```

#### Database Functions 變更 ⭐

| 函數名稱                   | 變更內容                                         |
| -------------------------- | ------------------------------------------------ |
| `create_order`             | 改為 `p_team_id` + `p_created_by`                |
| `get_daily_summary`        | 改為 `p_team_id`                                 |
| `check_subscription_valid` | 改為檢查團隊訂閱狀態                             |
| `initialize_trial`         | 改為初始化團隊試用期                             |
| **新增**                   | `get_user_teams(p_user_id)` - 取得用戶的所有團隊 |
| **新增**                   | `accept_team_invite(code, user_id)` - 加入團隊   |

#### Mobile App 變更 ⭐

| 變更項目       | 說明                                      |
| -------------- | ----------------------------------------- |
| **登入流程**   | 登入後需選擇/創建團隊                     |
| **團隊切換**   | 新增團隊切換器（TeamSwitcher）            |
| **RevenueCat** | `app_user_id = team_id`（不是 `user_id`） |
| **API 呼叫**   | 所有 API 需帶上 `currentTeamId`           |
| **Realtime**   | 訂閱團隊的訂單變更（`team_id = ?`）       |
| **新增 Store** | `useTeamStore` 管理當前團隊狀態           |

### 9.2 Migration 策略

#### 對於已有用戶的資料遷移

```sql
-- 1. 為每個現有 user 建立對應的 team
INSERT INTO teams (id, name, slug, line_channel_id, line_channel_secret,
                   line_channel_access_token, subscription_status, ...)
SELECT
  gen_random_uuid(),
  merchant_name,
  LOWER(REPLACE(merchant_name, ' ', '_')),
  line_channel_id,
  line_channel_secret,
  line_channel_access_token,
  subscription_status,
  ...
FROM users;

-- 2. 將 user 加入為 team 的 owner
INSERT INTO team_members (team_id, user_id, role)
SELECT t.id, u.id, 'owner'
FROM users u
JOIN teams t ON t.line_channel_id = u.line_channel_id;

-- 3. 更新訂單的 team_id
UPDATE orders o
SET team_id = tm.team_id
FROM team_members tm
WHERE o.user_id = tm.user_id;

-- 4. 更新顧客的 team_id
UPDATE customers c
SET team_id = tm.team_id
FROM team_members tm
WHERE c.user_id = tm.user_id;

-- 5. 清理 users 表（移除業務欄位）
ALTER TABLE users DROP COLUMN line_channel_id;
ALTER TABLE users DROP COLUMN subscription_status;
-- ... 其他業務欄位
```

### 9.3 開發檢查清單

當實作此架構時，請確認：

#### Backend Checklist ✅

- [ ] 建立所有新的 Table（`teams`, `team_members`, `team_invites`, `team_settings`）
- [ ] 更新所有 Table 的外鍵（`user_id` → `team_id`）
- [ ] 實作所有 RLS 政策（基於 `team_members` 的權限檢查）
- [ ] 更新所有 Database Functions 參數
- [ ] 實作團隊相關的 Edge Functions (`teams-api`, `team-members-api`, `bind-line-channel`)
- [ ] 更新 LINE Webhook 處理流程（使用 `destination` 識別團隊）
- [ ] 更新 RevenueCat Webhook 處理（訂閱狀態更新到 `teams` 表）

#### Frontend Checklist ✅

- [ ] 實作 `useTeamStore`（當前團隊狀態管理）
- [ ] 實作團隊選擇/創建 UI
- [ ] 實作 `TeamSwitcher` 組件
- [ ] 更新 RevenueCat 初始化（使用 `teamId`）
- [ ] 更新所有 API 呼叫（加上 `team_id` 參數）
- [ ] 更新 Realtime 訂閱（過濾 `team_id`）
- [ ] 實作團隊成員管理 UI
- [ ] 實作邀請碼功能

#### Testing Checklist ✅

- [ ] 測試多人同時操作同一團隊的訂單
- [ ] 測試用戶切換團隊後的資料隔離
- [ ] 測試團隊訂閱狀態在所有成員間同步
- [ ] 測試 LINE Webhook 多團隊處理
- [ ] 測試權限控制（owner/admin/member）
- [ ] 測試邀請碼加入團隊流程

### 9.4 關鍵注意事項 ⚠️

1. **訂閱綁定**：RevenueCat 的 `app_user_id` 必須是 `team_id`，不是 `user_id`
2. **LINE 官方帳號**：`teams.line_channel_id` 必須是 `UNIQUE`，一個官方帳號只能綁定一個團隊
3. **權限檢查**：所有 API 都要檢查用戶是否為該團隊成員，且有對應權限
4. **操作追蹤**：`orders.created_by` 和 `updated_by` 用於記錄操作者，方便審計
5. **團隊隔離**：RLS 政策必須確保團隊間的資料完全隔離
6. **Realtime 過濾**：前端訂閱 Realtime 時必須過濾 `team_id = currentTeam.id`

---

## 10. 附錄

### 10.1 常見問題 (FAQ)

**Q1: Supabase Edge Functions 有流量限制嗎？**
A: 免費方案：500K 次請求/月，2GB 傳輸量。付費方案無限制。

**Q2: RLS 會影響效能嗎？**
A: 輕微影響，但安全性提升遠大於效能損失。可在 Dashboard 查看查詢計畫優化。

**Q3: 如何處理大量訂單的效能問題？**
A: 1) 建立正確的索引 2) 使用分頁 3) 考慮使用 Materialized Views 4) 快取熱門查詢

**Q4: AI 解析失敗怎麼辦？**
A: 1) 降低 auto_mode，改用半自動 2) 儲存失敗案例，持續優化 Prompt 3) 提供手動建單功能

**Q5: 如何備份資料？**
A: Supabase 自動每日備份。也可用 `pg_dump` 手動備份：

```bash
supabase db dump -f backup.sql
```

### 10.2 成本估算

#### Supabase 方案

- **Free**: 500MB DB, 2GB 傳輸, 500K Edge Function 請求 → **$0/月**
- **Pro**: 8GB DB, 250GB 傳輸, 2M 請求 → **$25/月**

#### RevenueCat（IAP 管理）

- **Free**: 每月 $10K USD 收入內免費 → **$0/月**
- **Grow**: 超過 $10K → $299/月（通常不會用到）

#### Apple / Google 手續費（IAP）

- **標準費率**: 30% (第一年) / 15% (第二年起)
- **小型企業方案**: 15% (年營收 < $1M USD) ⭐ 推薦申請

**收入分成範例（100 個付費用戶）：**

```
用戶付費：100 × NT$ 300 = NT$ 30,000/月

標準費率：
├─ Apple/Google 抽成：30,000 × 30% = NT$ 9,000
└─ 實收：NT$ 21,000/月

小型企業方案：
├─ Apple/Google 抽成：30,000 × 15% = NT$ 4,500
└─ 實收：NT$ 25,500/月 ⬆️ 多賺 21%！
```

#### OpenAI 方案（GPT-4o）

- Input: $2.5 / 1M tokens
- Output: $10 / 1M tokens
- 預估：每次解析 ~500 tokens，每月 1000 次 → **~$6/月**

#### LINE Messaging API

- 免費方案：500 則/月 → **$0/月**
- 付費方案：¥0.30/則 (約 $0.002) → 1000 則 **~$2/月**

#### 總成本分析

**基礎設施成本（你要付的）：**

- 小規模（<50 訂單/天）：
  - Supabase Free + RevenueCat Free + OpenAI + LINE → **$0-10/月**
- 中規模（50-200 訂單/天）：
  - Supabase Pro + RevenueCat Free + OpenAI + LINE → **$25-40/月**

**收入拆分（100 個付費用戶為例）：**

```
總營收：NT$ 30,000/月

成本：
├─ Apple/Google (15%): NT$ 4,500
├─ 基礎設施: NT$ 1,000
└─ 淨收入: NT$ 24,500 (約 82%)
```

**損益平衡點：**

- 只需 5-10 個付費用戶即可損益平衡
- 超過 10 個用戶就開始獲利
- 100 個用戶 → 淨利約 NT$ 24,500/月

### 10.3 參考資源

#### 核心技術

- [Supabase 官方文件](https://supabase.com/docs)
- [Supabase Edge Functions 教學](https://supabase.com/docs/guides/functions)
- [PostgreSQL 官方文件](https://www.postgresql.org/docs/)

#### LINE 整合

- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Login 文件](https://developers.line.biz/en/docs/line-login/)
- [LINE Developers Console](https://developers.line.biz/)
- [LINE Official Account Manager](https://manager.line.biz/)

#### 訂閱系統

- [RevenueCat 官方文件](https://www.revenuecat.com/docs)
- [React Native Purchases SDK](https://www.revenuecat.com/docs/installation/reactnative)
- [App Store Connect 訂閱設定](https://developer.apple.com/app-store/subscriptions/)
- [Google Play 訂閱設定](https://developer.android.com/google/play/billing/subscriptions)
- [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/)

#### AI 服務

- [OpenAI API 文件](https://platform.openai.com/docs/api-reference)
- [GPT-4 定價](https://openai.com/pricing)

---

## 📝 文件版本

- **版本**: 2.0
- **更新日期**: 2025-10-20
- **作者**: OFlow Team
- **適用範圍**: 後端系統實作（含 IAP 訂閱系統 + LINE 官方帳號綁定）

**v2.0 更新內容：**

- ✅ 新增完整的 In-App Purchase (IAP) 訂閱系統
- ✅ 新增 RevenueCat 整合指南
- ✅ 新增 LINE 官方帳號綁定流程
- ✅ 更新資料庫 Schema（訂閱欄位）
- ✅ 新增 App Store / Google Play 產品設定指南
- ✅ 新增小型企業方案申請指南
- ✅ 更新成本估算（含 IAP 手續費分析）

---

## 🎉 開始建立你的 OFlow 後端系統！

### 快速開始建議

**第 1 週：基礎建設**

1. 建立 Supabase 專案
2. 部署資料庫 Schema
3. 設定 LINE Developers Console
4. 在 RevenueCat 註冊帳號

**第 2 週：核心功能**

1. 實作 LINE Login（商家登入）
2. 實作訂閱系統（RevenueCat + IAP）
3. 實作 LINE 官方帳號綁定

**第 3 週：進階功能**

1. 實作 LINE Webhook（接收訊息）
2. 整合 AI Parser（訂單解析）
3. 實作訂單管理 API

**第 4 週：測試與上線**

1. 在 Sandbox 環境測試 IAP
2. 申請小型企業方案
3. 準備 App Store / Google Play 上架

### 重要提醒

⚠️ **必須使用 IAP**

- 訂閱 App 功能必須使用 In-App Purchase
- 不能使用第三方金流（綠界、藍新等）
- 違反規定會被拒絕上架

⭐ **立即申請小型企業方案**

- Apple Small Business Program（手續費 15%）
- 可省下 50% 的平台手續費
- 只需年營收 < $1M USD

📚 **完整文件涵蓋**

- 資料庫設計（PostgreSQL + RLS）
- API 設計（Edge Functions）
- LINE 整合（Login + Webhook + Messaging API）
- 訂閱系統（RevenueCat + IAP）
- AI 服務（OpenAI GPT-4）
- 部署流程（Supabase CLI + EAS）

---

**有任何問題隨時回來參考這份文件！祝開發順利！** 🚀
