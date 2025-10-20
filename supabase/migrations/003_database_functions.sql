-- ═══════════════════════════════════════════════════════════════════
-- OFlow Database Functions
-- 業務邏輯函數（訂單、訂閱、團隊協作）
-- 版本：v1.0
-- 建立日期：2025-10-20
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 訂單相關函數
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 生成訂單編號（團隊層級）
-- 格式：ORD-YYYYMMDD-XXX
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION generate_order_number IS '生成團隊層級的訂單編號，格式：ORD-YYYYMMDD-XXX';

-- ───────────────────────────────────────────────────────────────────
-- 建立訂單（團隊版本）
-- 自動處理：顧客查找/建立、訂單編號生成、統計更新
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION create_order IS '建立訂單，自動處理顧客查找/建立、訂單編號生成、統計更新';

-- ───────────────────────────────────────────────────────────────────
-- 取得團隊今日訂單摘要
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION get_daily_summary IS '取得團隊指定日期的訂單摘要統計';

-- ═══════════════════════════════════════════════════════════════════
-- 訂閱相關函數
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 檢查團隊訂閱是否有效
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION check_subscription_valid IS '檢查團隊訂閱是否有效（試用期或付費中）';

-- ───────────────────────────────────────────────────────────────────
-- 自動更新過期的訂閱狀態
-- 建議：每天執行一次（透過 Supabase Cron 或外部 scheduler）
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION update_expired_subscriptions IS '自動更新過期的訂閱狀態，建議每天執行';

-- ───────────────────────────────────────────────────────────────────
-- 初始化新團隊試用期
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION initialize_trial IS '初始化新團隊的 3 天免費試用期';

-- ═══════════════════════════════════════════════════════════════════
-- 團隊協作相關函數
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 取得用戶的所有團隊
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION get_user_teams IS '取得用戶加入的所有團隊及相關資訊';

-- ───────────────────────────────────────────────────────────────────
-- 生成邀請碼
-- 格式：TEAMSLUG-XXXXXX
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_invite_code(p_team_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
BEGIN
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  RETURN UPPER(p_team_slug) || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invite_code IS '生成團隊邀請碼，格式：TEAMSLUG-XXXXXX';

-- ───────────────────────────────────────────────────────────────────
-- 驗證並使用邀請碼加入團隊
-- ───────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION accept_team_invite IS '驗證邀請碼並加入團隊，返回團隊 ID';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow Database Functions 建立完成！';
  RAISE NOTICE '✅ 已建立 9 個函數：';
  RAISE NOTICE '';
  RAISE NOTICE '訂單相關：';
  RAISE NOTICE '  - generate_order_number(team_id)';
  RAISE NOTICE '  - create_order(...)';
  RAISE NOTICE '  - get_daily_summary(team_id, date)';
  RAISE NOTICE '';
  RAISE NOTICE '訂閱相關：';
  RAISE NOTICE '  - check_subscription_valid(team_id)';
  RAISE NOTICE '  - update_expired_subscriptions()';
  RAISE NOTICE '  - initialize_trial(team_id)';
  RAISE NOTICE '';
  RAISE NOTICE '團隊協作：';
  RAISE NOTICE '  - get_user_teams(user_id)';
  RAISE NOTICE '  - generate_invite_code(team_slug)';
  RAISE NOTICE '  - accept_team_invite(invite_code, user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：執行 004_triggers.sql 建立自動化觸發器';
END $$;

