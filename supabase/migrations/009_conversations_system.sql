-- ═══════════════════════════════════════════════════════════════════
-- OFlow 對話追蹤系統（Conversations System）
-- 版本：v1.0
-- 建立日期：2025-10-26
-- 功能：支援 LINE 多輪對話訂單建立
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Table: conversations（對話追蹤）
-- 說明：追蹤客人與團隊的對話狀態，支援多輪對話建立訂單
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  
  -- 對話狀態
  status TEXT DEFAULT 'collecting_info', -- collecting_info（收集中）/ completed（已建單）/ abandoned（已放棄）
  
  -- AI 已收集的資訊
  collected_data JSONB DEFAULT '{}',
  
  -- 還需要補充的欄位
  missing_fields TEXT[],
  
  -- 關聯訂單（建單後才有值）
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- 時間戳記
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一約束：每個團隊的每個 LINE 用戶同時只能有一個進行中的對話
  CONSTRAINT unique_active_conversation UNIQUE (team_id, line_user_id, status)
);

-- 索引
CREATE INDEX idx_conversations_team_id ON conversations(team_id);
CREATE INDEX idx_conversations_line_user_id ON conversations(line_user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_order_id ON conversations(order_id);

-- 註解
COMMENT ON TABLE conversations IS '對話追蹤表 - 支援多輪對話建立訂單';
COMMENT ON COLUMN conversations.collected_data IS 'AI 已收集到的部分訂單資訊（JSONB）';
COMMENT ON COLUMN conversations.missing_fields IS '還需要補充的欄位列表';

-- ───────────────────────────────────────────────────────────────────
-- 修改 orders 表：新增 conversation_id
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON orders(conversation_id);

COMMENT ON COLUMN orders.conversation_id IS '關聯的對話 ID（用於追蹤對話記錄）';

-- ───────────────────────────────────────────────────────────────────
-- 修改 line_messages 表：新增 conversation_id 和 role
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE line_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE line_messages ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'; -- 'customer' / 'ai'

CREATE INDEX IF NOT EXISTS idx_line_messages_conversation ON line_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_messages_role ON line_messages(role);

COMMENT ON COLUMN line_messages.conversation_id IS '所屬對話 ID';
COMMENT ON COLUMN line_messages.role IS '訊息角色：customer（客人）/ ai（AI 助手）';

-- ───────────────────────────────────────────────────────────────────
-- Function: get_or_create_conversation
-- 說明：取得或建立對話記錄（同一個 LINE 用戶在同一個團隊只能有一個進行中的對話）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_team_id UUID,
  p_line_user_id TEXT
)
RETURNS TABLE(
  id UUID,
  team_id UUID,
  line_user_id TEXT,
  status TEXT,
  collected_data JSONB,
  missing_fields TEXT[],
  order_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- 查找進行中的對話（collecting_info 狀態）
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.team_id = p_team_id 
    AND c.line_user_id = p_line_user_id 
    AND c.status = 'collecting_info'
  ORDER BY c.last_message_at DESC
  LIMIT 1;

  -- 如果找到，更新最後訊息時間
  IF v_conversation_id IS NOT NULL THEN
    UPDATE conversations
    SET last_message_at = NOW(),
        updated_at = NOW()
    WHERE conversations.id = v_conversation_id;
  ELSE
    -- 如果沒有找到，建立新對話
    INSERT INTO conversations (team_id, line_user_id, status)
    VALUES (p_team_id, p_line_user_id, 'collecting_info')
    RETURNING conversations.id INTO v_conversation_id;
  END IF;

  -- 回傳對話記錄
  RETURN QUERY
  SELECT 
    c.id, c.team_id, c.line_user_id, c.status, 
    c.collected_data, c.missing_fields, c.order_id,
    c.last_message_at, c.created_at, c.updated_at
  FROM conversations c
  WHERE c.id = v_conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_conversation IS '取得或建立對話記錄（同一用戶只保持一個進行中的對話）';

-- ───────────────────────────────────────────────────────────────────
-- Function: get_conversation_history
-- 說明：取得對話的最近 N 條訊息（包含客人和 AI）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  role TEXT,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm.role,
    lm.message_text AS message,
    lm.created_at
  FROM line_messages lm
  WHERE lm.conversation_id = p_conversation_id
  ORDER BY lm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_conversation_history IS '取得對話的最近 N 條訊息記錄';

-- ───────────────────────────────────────────────────────────────────
-- Function: update_conversation_data
-- 說明：更新對話中 AI 已收集的資訊和缺少的欄位
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_data(
  p_conversation_id UUID,
  p_collected_data JSONB,
  p_missing_fields TEXT[]
)
RETURNS VOID AS $$
BEGIN
  UPDATE conversations
  SET 
    collected_data = p_collected_data,
    missing_fields = p_missing_fields,
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_conversation_data IS '更新對話中已收集的資訊和缺少的欄位';

-- ───────────────────────────────────────────────────────────────────
-- Function: complete_conversation
-- 說明：標記對話完成並關聯訂單
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_conversation(
  p_conversation_id UUID,
  p_order_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- 更新對話狀態
  UPDATE conversations
  SET 
    status = 'completed',
    order_id = p_order_id,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- 更新訂單的 conversation_id
  UPDATE orders
  SET conversation_id = p_conversation_id
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_conversation IS '標記對話完成並建立雙向關聯（對話 ↔ 訂單）';

-- ───────────────────────────────────────────────────────────────────
-- Function: get_order_conversation
-- 說明：取得訂單的完整對話記錄（用於前端顯示）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_order_conversation(
  p_order_id UUID
)
RETURNS TABLE(
  role TEXT,
  message TEXT,
  message_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- 取得訂單關聯的對話 ID
  SELECT conversation_id INTO v_conversation_id
  FROM orders
  WHERE id = p_order_id;

  -- 如果沒有對話記錄，回傳空結果
  IF v_conversation_id IS NULL THEN
    RETURN;
  END IF;

  -- 回傳完整對話記錄（依時間順序）
  RETURN QUERY
  SELECT 
    lm.role,
    lm.message_text AS message,
    lm.created_at AS message_timestamp
  FROM line_messages lm
  WHERE lm.conversation_id = v_conversation_id
  ORDER BY lm.created_at ASC; -- 順序排列（舊到新）
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_order_conversation IS '取得訂單的完整對話記錄（依時間順序）';

-- ───────────────────────────────────────────────────────────────────
-- Function: cleanup_abandoned_conversations
-- 說明：清理超過 24 小時無回應的對話（標記為 abandoned）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_abandoned_conversations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 更新超過 24 小時無回應的對話狀態
  UPDATE conversations
  SET 
    status = 'abandoned',
    updated_at = NOW()
  WHERE status = 'collecting_info'
    AND last_message_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_abandoned_conversations IS '清理超過 24 小時無回應的對話（可用於定時任務）';

-- ───────────────────────────────────────────────────────────────────
-- 修改 create_order_from_ai 函數：支援 conversation_id
-- ───────────────────────────────────────────────────────────────────

-- 先刪除舊版本的函數
DROP FUNCTION IF EXISTS create_order_from_ai(UUID, TEXT, TEXT, JSONB, DECIMAL, DATE, TIME, UUID, TEXT, TEXT);

-- 建立新版本（新增 conversation_id 參數）
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
  p_customer_notes TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL -- 新增參數
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
    original_message, line_conversation_id, conversation_id,
    created_at
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount, p_pickup_date, p_pickup_time,
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

COMMENT ON FUNCTION create_order_from_ai IS '從 AI 解析結果建立訂單，支援對話關聯';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow 對話追蹤系統建立完成！';
  RAISE NOTICE '✅ 已建立：';
  RAISE NOTICE '  - conversations 表';
  RAISE NOTICE '  - orders.conversation_id 欄位';
  RAISE NOTICE '  - line_messages.conversation_id 和 role 欄位';
  RAISE NOTICE '  - 6 個對話管理函數';
  RAISE NOTICE '✅ 多輪對話訂單系統已就緒！';
END $$;

