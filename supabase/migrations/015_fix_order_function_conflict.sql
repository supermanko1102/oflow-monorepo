-- ═══════════════════════════════════════════════════════════════════
-- 修復 create_order_from_ai 函數衝突問題
-- 版本：v2.1
-- 建立日期：2025-10-27
-- 說明：徹底清除所有舊版本，確保只存在與 LINE Webhook 匹配的版本
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Step 1: 強制刪除所有版本的函數（使用 CASCADE）
-- ───────────────────────────────────────────────────────────────────

-- 不指定參數簽名，刪除所有同名函數
DROP FUNCTION IF EXISTS create_order_from_ai CASCADE;

DO $$
BEGIN
  RAISE NOTICE '[Migration 015] ✅ 已刪除所有版本的 create_order_from_ai 函數';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- Step 2: 重新創建唯一正確版本（與 LINE Webhook 完全匹配）
-- ───────────────────────────────────────────────────────────────────

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
  p_requires_frozen BOOLEAN DEFAULT false,
  p_store_info TEXT DEFAULT NULL,
  p_shipping_address TEXT DEFAULT NULL,
  p_service_duration INTEGER DEFAULT NULL,
  p_service_notes TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL      -- 對話 ID（從 Migration 009）
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

  -- 建立訂單（支援新欄位）
  INSERT INTO orders (
    team_id, customer_id, order_number, customer_name, customer_phone,
    items, total_amount, 
    pickup_date, pickup_time,                -- DB 欄位名保持不變
    delivery_method,                         -- 新增
    requires_frozen, store_info, shipping_address,  -- 商品型專用
    service_duration, service_notes,         -- 服務型專用
    source, status, notes, customer_notes,
    original_message, line_conversation_id, conversation_id,
    created_at
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount,
    p_appointment_date, p_appointment_time,  -- 參數名使用通用命名
    p_delivery_method,
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

COMMENT ON FUNCTION create_order_from_ai IS '從 AI 解析結果建立訂單（v2.1），支援多行業、配送方式、服務型業務，修復函數衝突';

-- ───────────────────────────────────────────────────────────────────
-- Step 3: 驗證函數創建成功
-- ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- 檢查函數是否存在
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'create_order_from_ai';
  
  IF func_count = 1 THEN
    RAISE NOTICE '[Migration 015] ✅ create_order_from_ai 函數已成功創建（唯一版本）';
  ELSIF func_count = 0 THEN
    RAISE EXCEPTION '[Migration 015] ❌ 函數創建失敗';
  ELSE
    RAISE EXCEPTION '[Migration 015] ❌ 檢測到多個函數版本 (%), 需要人工檢查', func_count;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Migration 015 完成！';
  RAISE NOTICE '✅ create_order_from_ai 函數已修復';
  RAISE NOTICE '✅ 函數參數與 LINE Webhook 代碼完全匹配';
  RAISE NOTICE '✅ 支援參數：';
  RAISE NOTICE '  - p_appointment_date / p_appointment_time (通用命名)';
  RAISE NOTICE '  - p_delivery_method (配送方式)';
  RAISE NOTICE '  - p_requires_frozen (冷凍配送)';
  RAISE NOTICE '  - p_service_duration (服務時長)';
  RAISE NOTICE '  - p_conversation_id (對話關聯)';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

