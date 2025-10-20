-- ═══════════════════════════════════════════════════════════════════
-- OFlow 資料庫初始 Schema
-- Team-Centric Architecture（以團隊為核心）
-- 版本：v1.0
-- 建立日期：2025-10-20
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 核心表格：Team-Centric 架構
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Table: teams（團隊 - 核心主體）⭐
-- 說明：團隊是 OFlow 的核心實體，擁有訂閱、LINE 官方帳號、訂單等所有業務資料
-- ───────────────────────────────────────────────────────────────────
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
  subscription_status TEXT DEFAULT 'trial',  -- trial, active, expired, cancelled
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

-- 註解
COMMENT ON TABLE teams IS '團隊表 - OFlow 的核心實體，擁有訂閱、LINE 官方帳號、訂單等所有業務資料';
COMMENT ON COLUMN teams.line_channel_id IS 'LINE 官方帳號 Channel ID，一個團隊對應一個官方帳號';
COMMENT ON COLUMN teams.subscription_status IS '訂閱狀態：trial（試用）、active（付費中）、expired（過期）、cancelled（已取消）';
COMMENT ON COLUMN teams.revenuecat_customer_id IS 'RevenueCat Customer ID，格式：team_{team_id}';

-- ───────────────────────────────────────────────────────────────────
-- Table: users（用戶 - 登入身份）
-- 說明：只存個人登入資訊，不包含業務資料
-- ───────────────────────────────────────────────────────────────────
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

-- 註解
COMMENT ON TABLE users IS '用戶表 - 只存個人登入資訊，不包含業務資料';
COMMENT ON COLUMN users.line_user_id IS 'LINE Login 的 User ID（個人帳號，不是官方帳號）';
COMMENT ON COLUMN users.current_team_id IS '用戶最後使用的團隊（用於自動選擇）';

-- ───────────────────────────────────────────────────────────────────
-- Table: team_members（團隊成員關聯）
-- 說明：一個用戶可以加入多個團隊，一個團隊可以有多個成員
-- ───────────────────────────────────────────────────────────────────
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

-- 註解
COMMENT ON TABLE team_members IS '團隊成員關聯表 - 一個用戶可以加入多個團隊';
COMMENT ON COLUMN team_members.role IS '角色：owner（擁有者）、admin（管理員）、member（成員）';

-- ───────────────────────────────────────────────────────────────────
-- Table: team_invites（團隊邀請）
-- 說明：團隊邀請碼管理
-- ───────────────────────────────────────────────────────────────────
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

-- 註解
COMMENT ON TABLE team_invites IS '團隊邀請碼表';

-- ═══════════════════════════════════════════════════════════════════
-- 業務資料表：所有資料屬於團隊
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Table: customers（顧客資料）
-- 說明：屬於團隊，不是個人
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊

  -- 顧客資訊
  name TEXT NOT NULL,
  phone TEXT,
  line_user_id TEXT,                      -- LINE ID (顧客的個人 LINE)
  email TEXT,

  -- 統計資訊
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,

  -- 備註與標籤
  notes TEXT,
  tags TEXT[],                            -- ['VIP', '常客', '過敏體質']

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

-- 註解
COMMENT ON TABLE customers IS '顧客表 - 屬於團隊，不是個人';
COMMENT ON COLUMN customers.team_id IS '所屬團隊 ID';

-- ───────────────────────────────────────────────────────────────────
-- Table: orders（訂單）
-- 說明：屬於團隊
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,      -- ⭐ 屬於團隊
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- 訂單基本資訊
  order_number TEXT UNIQUE NOT NULL,      -- ORD-20251020-001
  customer_name TEXT NOT NULL,            -- 顧客名稱（冗余）
  customer_phone TEXT,

  -- 訂單內容
  items JSONB NOT NULL,                   -- 商品列表
  total_amount DECIMAL(10,2) NOT NULL,

  -- 取件資訊
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  pickup_method TEXT DEFAULT 'store',     -- store, delivery
  delivery_address TEXT,

  -- 訂單狀態
  status TEXT DEFAULT 'pending',          -- pending, confirmed, completed, cancelled
  source TEXT DEFAULT 'auto',             -- auto, semi-auto, manual

  -- LINE 對話相關
  line_conversation_id TEXT,
  original_message TEXT,

  -- 備註
  notes TEXT,                             -- 商家內部備註
  customer_notes TEXT,                    -- 顧客備註

  -- 操作記錄（誰建立、誰修改）⭐
  created_by UUID REFERENCES users(id),   -- 建立者
  updated_by UUID REFERENCES users(id),   -- 最後修改者

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_orders_team_id ON orders(team_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);

-- 複合索引（常見查詢）
CREATE INDEX idx_orders_team_status_pickup ON orders(team_id, status, pickup_date);

-- 註解
COMMENT ON TABLE orders IS '訂單表 - 屬於團隊';
COMMENT ON COLUMN orders.team_id IS '所屬團隊 ID';
COMMENT ON COLUMN orders.created_by IS '建立訂單的用戶（用於追蹤多人協作）';
COMMENT ON COLUMN orders.updated_by IS '最後修改訂單的用戶';
COMMENT ON COLUMN orders.items IS '商品列表 JSON 格式：[{"name": "巴斯克蛋糕 6吋", "quantity": 1, "price": 450, "notes": "少糖"}]';

-- ───────────────────────────────────────────────────────────────────
-- Table: line_messages（LINE 對話紀錄）
-- 說明：屬於團隊
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊

  -- LINE 訊息資訊
  line_message_id TEXT UNIQUE NOT NULL,   -- LINE Message ID
  line_user_id TEXT NOT NULL,             -- 發送者 LINE ID（顧客）
  message_type TEXT NOT NULL,             -- text, image, sticker, location
  message_text TEXT,
  message_data JSONB,

  -- AI 解析結果
  ai_parsed BOOLEAN DEFAULT false,
  ai_result JSONB,
  ai_confidence DECIMAL(3,2),             -- AI 信心度 0.00-1.00
  order_id UUID REFERENCES orders(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_line_messages_team_id ON line_messages(team_id);
CREATE INDEX idx_line_messages_line_user_id ON line_messages(line_user_id);
CREATE INDEX idx_line_messages_created_at ON line_messages(created_at DESC);
CREATE INDEX idx_line_messages_ai_parsed ON line_messages(ai_parsed) WHERE ai_parsed = false;

-- 註解
COMMENT ON TABLE line_messages IS 'LINE 對話記錄 - 屬於團隊';

-- ───────────────────────────────────────────────────────────────────
-- Table: reminders（提醒通知）
-- 說明：屬於團隊
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- ⭐ 屬於團隊
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- 提醒類型
  remind_type TEXT NOT NULL,              -- 7day, 3day, 1day, today
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

-- 註解
COMMENT ON TABLE reminders IS '提醒通知 - 屬於團隊';

-- ───────────────────────────────────────────────────────────────────
-- Table: team_settings（團隊進階設定）
-- 說明：基本設定已整合在 teams 表中，此表用於存放進階設定
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,

  -- 營業設定
  business_hours JSONB,                   -- 營業時間
  holidays DATE[],                        -- 公休日

  -- 訂單設定
  order_lead_time_days INT DEFAULT 3,     -- 訂單提前天數
  max_daily_orders INT DEFAULT 20,        -- 每日最大接單數

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

-- 索引
CREATE INDEX idx_team_settings_team_id ON team_settings(team_id);

-- 註解
COMMENT ON TABLE team_settings IS '團隊進階設定 - 基本設定在 teams 表';
COMMENT ON COLUMN team_settings.business_hours IS '營業時間 JSON 格式：{"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}';

-- ───────────────────────────────────────────────────────────────────
-- Table: subscription_transactions（訂閱交易記錄）
-- 說明：屬於團隊
-- ───────────────────────────────────────────────────────────────────
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

-- 註解
COMMENT ON TABLE subscription_transactions IS '訂閱交易記錄 - 屬於團隊';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

-- 輸出建立結果
DO $$
BEGIN
  RAISE NOTICE '✅ OFlow 資料庫 Schema 建立完成！';
  RAISE NOTICE '✅ 已建立 10 個表格：';
  RAISE NOTICE '   - teams (團隊)';
  RAISE NOTICE '   - users (用戶)';
  RAISE NOTICE '   - team_members (團隊成員)';
  RAISE NOTICE '   - team_invites (團隊邀請)';
  RAISE NOTICE '   - customers (顧客)';
  RAISE NOTICE '   - orders (訂單)';
  RAISE NOTICE '   - line_messages (LINE 對話)';
  RAISE NOTICE '   - reminders (提醒)';
  RAISE NOTICE '   - team_settings (團隊設定)';
  RAISE NOTICE '   - subscription_transactions (訂閱交易)';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：執行 002_rls_policies.sql 建立權限控制';
END $$;

