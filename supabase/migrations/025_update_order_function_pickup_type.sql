-- ───────────────────────────────────────────────────────────────────
-- Migration: 更新 create_order_from_ai 函數支援 pickup_type 和 pickup_location
-- Date: 2025-11-10
-- Description: 加入 pickup_type（store/meetup）和 pickup_location 參數
-- ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS create_order_from_ai CASCADE;

CREATE OR REPLACE FUNCTION create_order_from_ai(
  -- 必填參數（沒有默認值）
  p_team_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_line_message_id UUID,
  p_original_message TEXT,
  -- 通用參數（預約/交付日期時間）
  p_appointment_date DATE,
  p_appointment_time TIME,
  -- 可選參數（有默認值）
  p_delivery_method TEXT DEFAULT 'pickup',
  p_pickup_type TEXT DEFAULT NULL,           -- 新增：store（店取）或 meetup（面交）
  p_pickup_location TEXT DEFAULT NULL,        -- 新增：取貨/面交地點
  p_requires_frozen BOOLEAN DEFAULT false,
  p_store_info TEXT DEFAULT NULL,
  p_shipping_address TEXT DEFAULT NULL,
  p_service_duration INTEGER DEFAULT NULL,
  p_service_notes TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL
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

  -- 建立訂單（加入 pickup_type 和 pickup_location）
  INSERT INTO orders (
    team_id, customer_id, order_number, customer_name, customer_phone,
    items, total_amount, 
    pickup_date, pickup_time,
    delivery_method,
    pickup_type, pickup_location,            -- 新增欄位
    requires_frozen, store_info, shipping_address,
    service_duration, service_notes,
    source, status, notes, customer_notes,
    original_message, line_conversation_id, conversation_id,
    created_at
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount,
    p_appointment_date, p_appointment_time,
    p_delivery_method,
    p_pickup_type, p_pickup_location,        -- 新增值
    p_requires_frozen, p_store_info, p_shipping_address,
    p_service_duration, p_service_notes,
    'auto', 'pending', NULL, p_customer_notes,
    p_original_message, v_line_user_id, p_conversation_id,
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
  -- 只在預約/交付日期是未來時才建立提醒
  IF p_appointment_date > CURRENT_DATE THEN
    -- 7天前提醒
    IF p_appointment_date - INTERVAL '7 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '7day',
        (p_appointment_date - INTERVAL '7 days')::DATE + TIME '09:00:00',
        '7天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 7 天後處理'
      );
    END IF;

    -- 3天前提醒
    IF p_appointment_date - INTERVAL '3 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '3day',
        (p_appointment_date - INTERVAL '3 days')::DATE + TIME '09:00:00',
        '3天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 3 天後處理'
      );
    END IF;

    -- 1天前提醒
    IF p_appointment_date - INTERVAL '1 day' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '1day',
        (p_appointment_date - INTERVAL '1 day')::DATE + TIME '09:00:00',
        '明天訂單提醒',
        '訂單 ' || v_order_number || ' 將於明天處理'
      );
    END IF;

    -- 當天提醒
    INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
    VALUES (
      p_team_id, v_order_id, 'today',
      p_appointment_date + TIME '08:00:00',
      '今日訂單提醒',
      '訂單 ' || v_order_number || ' 今天要處理'
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_order_from_ai IS '從 AI 解析結果建立訂單（v2.2），支援 pickup_type（店取/面交）和 pickup_location';

