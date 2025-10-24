-- ═══════════════════════════════════════════════════════════════════
-- OFlow AI 訂單生成相關函數
-- 版本：v1.0
-- 建立日期：2025-10-24
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 從 AI 解析結果建立訂單
-- 自動處理：顧客查找/建立、訂單編號生成、統計更新、提醒建立
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_order_from_ai(
  p_team_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_pickup_date DATE,
  p_pickup_time TIME,
  p_line_message_id UUID,
  p_original_message TEXT,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
  v_order_number TEXT;
  v_line_user_id TEXT;
BEGIN
  -- 生成訂單編號（團隊層級）
  v_order_number := generate_order_number(p_team_id);

  -- 從 LINE 訊息取得顧客的 LINE ID
  SELECT line_user_id INTO v_line_user_id
  FROM line_messages
  WHERE id = p_line_message_id;

  -- 查找或建立顧客（在團隊內）
  -- 先用電話查找
  IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE team_id = p_team_id AND phone = p_customer_phone;
  END IF;

  -- 如果電話找不到，用 LINE ID 查找
  IF v_customer_id IS NULL AND v_line_user_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE team_id = p_team_id AND line_user_id = v_line_user_id;
  END IF;

  -- 如果都找不到，建立新顧客
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (team_id, name, phone, line_user_id)
    VALUES (p_team_id, p_customer_name, p_customer_phone, v_line_user_id)
    RETURNING id INTO v_customer_id;
  ELSE
    -- 更新現有顧客的資訊（如果有新資訊）
    UPDATE customers
    SET
      name = COALESCE(p_customer_name, name),
      phone = COALESCE(NULLIF(p_customer_phone, ''), phone),
      line_user_id = COALESCE(v_line_user_id, line_user_id),
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  -- 建立訂單
  INSERT INTO orders (
    team_id, customer_id, order_number, customer_name, customer_phone,
    items, total_amount, pickup_date, pickup_time, 
    source, status, notes, customer_notes,
    original_message, line_conversation_id,
    created_at
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount, p_pickup_date, p_pickup_time,
    'auto', 'pending', NULL, p_customer_notes,
    p_original_message, v_line_user_id,
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- 關聯 LINE 訊息與訂單
  UPDATE line_messages
  SET order_id = v_order_id
  WHERE id = p_line_message_id;

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

  -- 建立提醒（7天、3天、1天）
  -- 只在取件日期是未來時才建立提醒
  IF p_pickup_date > CURRENT_DATE THEN
    -- 7天前提醒
    IF p_pickup_date - INTERVAL '7 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '7day',
        (p_pickup_date - INTERVAL '7 days')::DATE + TIME '09:00:00',
        '7天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 7 天後取貨'
      );
    END IF;

    -- 3天前提醒
    IF p_pickup_date - INTERVAL '3 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '3day',
        (p_pickup_date - INTERVAL '3 days')::DATE + TIME '09:00:00',
        '3天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 3 天後取貨'
      );
    END IF;

    -- 1天前提醒
    IF p_pickup_date - INTERVAL '1 day' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '1day',
        (p_pickup_date - INTERVAL '1 day')::DATE + TIME '09:00:00',
        '明天訂單提醒',
        '訂單 ' || v_order_number || ' 將於明天取貨'
      );
    END IF;

    -- 當天提醒
    INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
    VALUES (
      p_team_id, v_order_id, 'today',
      p_pickup_date + TIME '08:00:00',
      '今日訂單提醒',
      '訂單 ' || v_order_number || ' 今天要取貨'
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_order_from_ai IS '從 AI 解析結果建立訂單，自動處理顧客、統計、提醒';

-- ───────────────────────────────────────────────────────────────────
-- 檢查團隊是否已設定 LINE 官方帳號
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_team_line_configured(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  team_record RECORD;
BEGIN
  SELECT 
    line_channel_id, 
    line_channel_secret, 
    line_channel_access_token 
  INTO team_record 
  FROM teams 
  WHERE id = p_team_id;

  IF team_record IS NULL THEN
    RETURN false;
  END IF;

  -- 檢查必要的 LINE 設定是否都已填寫
  IF team_record.line_channel_id IS NOT NULL 
     AND team_record.line_channel_secret IS NOT NULL 
     AND team_record.line_channel_access_token IS NOT NULL THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_team_line_configured IS '檢查團隊是否已完整設定 LINE 官方帳號';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow AI 訂單相關函數建立完成！';
  RAISE NOTICE '✅ 已建立 2 個函數：';
  RAISE NOTICE '  - create_order_from_ai(...)';
  RAISE NOTICE '  - check_team_line_configured(team_id)';
END $$;

