-- ═══════════════════════════════════════════════════════════════════
-- OFlow Triggers
-- 自動化觸發器（時間戳更新、提醒建立）
-- 版本：v1.0
-- 建立日期：2025-10-20
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 自動更新 updated_at 時間戳
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Trigger Function：更新 updated_at 欄位
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS '自動更新 updated_at 欄位為當前時間';

-- ───────────────────────────────────────────────────────────────────
-- 套用到各個表格
-- ───────────────────────────────────────────────────────────────────

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

-- ═══════════════════════════════════════════════════════════════════
-- 訂單確認時自動建立提醒
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Trigger Function：訂單狀態變更為 confirmed 時建立提醒
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_reminders_on_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  reminder_days INT[];
  day INT;
  notification_time TIME;
BEGIN
  -- 只在訂單狀態變更為 confirmed 時執行
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    
    -- 取得團隊提醒設定
    SELECT ts.reminder_days, ts.notification_time 
    INTO reminder_days, notification_time
    FROM team_settings ts
    WHERE ts.team_id = NEW.team_id;

    -- 如果沒有設定，使用預設值
    IF reminder_days IS NULL THEN
      reminder_days := ARRAY[7, 3, 1];
    END IF;
    
    IF notification_time IS NULL THEN
      notification_time := '09:00';
    END IF;

    -- 為每個提醒天數建立提醒
    FOREACH day IN ARRAY reminder_days
    LOOP
      -- 只在提醒時間還沒過的情況下建立
      IF (NEW.pickup_date - day) >= CURRENT_DATE THEN
        INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
        VALUES (
          NEW.team_id,
          NEW.id,
          day || 'day',
          (NEW.pickup_date - day * INTERVAL '1 day') + notification_time,
          '訂單提醒',
          format('%s 天後有訂單取件：%s', day, NEW.customer_name)
        );
      END IF;
    END LOOP;

    -- 特別處理當天提醒
    IF NEW.pickup_date = CURRENT_DATE THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        NEW.team_id,
        NEW.id,
        'today',
        NOW() + INTERVAL '5 minutes', -- 5 分鐘後提醒
        '今日訂單提醒',
        format('今天有訂單取件：%s（%s %s）', NEW.customer_name, NEW.pickup_date, NEW.pickup_time)
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_reminders_on_order_confirm IS '訂單確認時自動建立提醒（基於團隊設定的提醒天數）';

-- ───────────────────────────────────────────────────────────────────
-- 套用 Trigger
-- ───────────────────────────────────────────────────────────────────
CREATE TRIGGER trigger_create_reminders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_reminders_on_order_confirm();

-- ═══════════════════════════════════════════════════════════════════
-- 團隊建立時自動初始化設定
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Trigger Function：新團隊建立時自動建立預設設定
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_default_team_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- 建立預設團隊設定
  INSERT INTO team_settings (
    team_id,
    business_hours,
    holidays,
    order_lead_time_days,
    max_daily_orders,
    reminder_days,
    notification_time,
    ai_auto_confirm,
    ai_confidence_threshold
  )
  VALUES (
    NEW.id,
    jsonb_build_object(
      'monday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'thursday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'friday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'saturday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', false),
      'sunday', jsonb_build_object('open', '09:00', 'close', '18:00', 'closed', true)
    ),
    ARRAY[]::DATE[], -- 沒有預設公休日
    3,               -- 預設提前 3 天
    20,              -- 預設每日最多 20 單
    ARRAY[7, 3, 1],  -- 7天前、3天前、1天前提醒
    '09:00',         -- 早上 9 點提醒
    false,           -- 預設不自動確認
    0.8              -- AI 信心度門檻 80%
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_team_settings IS '新團隊建立時自動建立預設設定';

-- ───────────────────────────────────────────────────────────────────
-- 套用 Trigger
-- ───────────────────────────────────────────────────────────────────
CREATE TRIGGER trigger_create_default_team_settings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_team_settings();

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow Triggers 建立完成！';
  RAISE NOTICE '✅ 已建立自動化觸發器：';
  RAISE NOTICE '';
  RAISE NOTICE '自動更新時間戳：';
  RAISE NOTICE '  - users.updated_at';
  RAISE NOTICE '  - teams.updated_at';
  RAISE NOTICE '  - orders.updated_at';
  RAISE NOTICE '  - customers.updated_at';
  RAISE NOTICE '  - team_settings.updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '自動建立提醒：';
  RAISE NOTICE '  - 訂單確認時建立 7天/3天/1天 提醒';
  RAISE NOTICE '  - 基於團隊設定的提醒天數和時間';
  RAISE NOTICE '';
  RAISE NOTICE '自動初始化設定：';
  RAISE NOTICE '  - 新團隊建立時自動建立預設設定';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 所有資料庫 Migrations 執行完成！';
END $$;

