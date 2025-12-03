


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") IS '驗證邀請碼並加入團隊，返回團隊 ID';



CREATE OR REPLACE FUNCTION "public"."apply_daily_revenue_delta"("p_team_id" "uuid", "p_date" "date", "p_amount" numeric, "p_method" "text", "p_direction" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    IF p_date IS NULL OR p_team_id IS NULL OR p_amount IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO public.daily_revenue (
      team_id, revenue_date, total_revenue, order_count,
      cash_total, transfer_total, other_total
    )
    VALUES (
      p_team_id, p_date,
      CASE WHEN p_direction = 1 THEN p_amount ELSE -p_amount END,
      CASE WHEN p_direction = 1 THEN 1 ELSE -1 END,
      CASE WHEN COALESCE(p_method, 'cash') = 'cash'
           THEN CASE WHEN p_direction=1 THEN p_amount ELSE -p_amount END ELSE 0 END,
      CASE WHEN p_method = 'transfer'
           THEN CASE WHEN p_direction=1 THEN p_amount ELSE -p_amount END ELSE 0 END,
      CASE WHEN p_method = 'other'
           THEN CASE WHEN p_direction=1 THEN p_amount ELSE -p_amount END ELSE 0 END
    )
    ON CONFLICT (team_id, revenue_date)
    DO UPDATE SET
      total_revenue   = daily_revenue.total_revenue + EXCLUDED.total_revenue,
      order_count     = daily_revenue.order_count + EXCLUDED.order_count,
      cash_total      = daily_revenue.cash_total + EXCLUDED.cash_total,
      transfer_total  = daily_revenue.transfer_total + EXCLUDED.transfer_total,
      other_total     = daily_revenue.other_total + EXCLUDED.other_total,
      updated_at      = now();
  END;
  $$;


ALTER FUNCTION "public"."apply_daily_revenue_delta"("p_team_id" "uuid", "p_date" "date", "p_amount" numeric, "p_method" "text", "p_direction" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_orders"("tid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    select exists(
      select 1 from public.team_members tm
      where tm.team_id = tid
        and tm.user_id = current_app_user_id()
        and tm.can_manage_orders = true
    );
  $$;


ALTER FUNCTION "public"."can_manage_orders"("tid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") IS '檢查團隊訂閱是否有效（試用期或付費中）';



CREATE OR REPLACE FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") IS '檢查團隊是否已完整設定 LINE 官方帳號';



CREATE OR REPLACE FUNCTION "public"."cleanup_abandoned_conversations"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."cleanup_abandoned_conversations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_abandoned_conversations"() IS '清理超過 24 小時無回應的對話（可用於定時任務）';



CREATE OR REPLACE FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") IS '標記對話完成並建立雙向關聯（對話 ↔ 訂單）';



CREATE OR REPLACE FUNCTION "public"."create_default_team_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_default_team_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_team_settings"() IS '新團隊建立時自動建立預設設定';



CREATE OR REPLACE FUNCTION "public"."create_dev_user"("email_input" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  new_user_id uuid := gen_random_uuid();
  user_password text := 'Dev1234!';
  fake_line_id text := 'dev_line_' || replace(cast(gen_random_uuid() as text), '-', '');
begin
  -- Check if user already exists in auth.users
  if exists (select 1 from auth.users where email = email_input) then
    raise notice 'User with email % already exists', email_input;
    return;
  end if;

  -- Insert into auth.users
  -- We set the provider metadata to 'line' and provide a fake line_user_id
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    email_input,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider": "line", "providers": ["email"]}',
    jsonb_build_object(
      'auth_provider', 'line', 
      'display_name', 'Dev User',
      'line_user_id', fake_line_id
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  raise notice 'User created: % / %', email_input, user_password;
end;
$$;


ALTER FUNCTION "public"."create_dev_user"("email_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text" DEFAULT 'auto'::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text", "p_notes" "text") IS '建立訂單，自動處理顧客查找/建立、訂單編號生成、統計更新';



CREATE OR REPLACE FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text" DEFAULT 'pickup'::"text", "p_pickup_type" "text" DEFAULT NULL::"text", "p_pickup_location" "text" DEFAULT NULL::"text", "p_requires_frozen" boolean DEFAULT false, "p_store_info" "text" DEFAULT NULL::"text", "p_shipping_address" "text" DEFAULT NULL::"text", "p_service_duration" integer DEFAULT NULL::integer, "p_service_notes" "text" DEFAULT NULL::"text", "p_customer_notes" "text" DEFAULT NULL::"text", "p_conversation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes" "text", "p_conversation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes" "text", "p_conversation_id" "uuid") IS '從 AI 解析結果建立訂單（v2.2），支援 pickup_type（店取/面交）和 pickup_location';



CREATE OR REPLACE FUNCTION "public"."create_order_from_ai"("p_conversation_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_line_message_id" "uuid", "p_original_message" "text", "p_team_id" "uuid", "p_total_amount" numeric, "p_customer_notes" "text" DEFAULT NULL::"text", "p_pickup_date" "date" DEFAULT NULL::"date", "p_pickup_time" time without time zone DEFAULT NULL::time without time zone, "p_status" "text" DEFAULT 'draft'::"text", "p_delivery_method" "text" DEFAULT 'pickup'::"text", "p_pickup_type" "text" DEFAULT NULL::"text", "p_pickup_location" "text" DEFAULT NULL::"text", "p_requires_frozen" boolean DEFAULT false, "p_store_info" "text" DEFAULT NULL::"text", "p_shipping_address" "text" DEFAULT NULL::"text", "p_service_duration" integer DEFAULT NULL::integer, "p_service_notes" "text" DEFAULT NULL::"text", "p_customer_notes_extended" "text" DEFAULT NULL::"text", "p_appointment_date" "date" DEFAULT NULL::"date", "p_appointment_time" time without time zone DEFAULT NULL::time without time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
  v_order_number TEXT;
  v_line_user_id TEXT;
  v_pickup_date date := COALESCE(p_pickup_date, p_appointment_date);
  v_time time := COALESCE(p_pickup_time, p_appointment_time, TIME '00:00:00');
  v_status text := COALESCE(NULLIF(p_status, ''), 'draft');
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
    items, total_amount, 
    pickup_date, pickup_time,
    delivery_method,
    pickup_type, pickup_location,
    requires_frozen, store_info, shipping_address,
    service_duration, service_notes,
    source, status, notes, customer_notes,
    original_message, line_conversation_id, conversation_id,
    created_at
  )
  VALUES (
    p_team_id, v_customer_id, v_order_number, p_customer_name, p_customer_phone,
    p_items, p_total_amount,
    v_pickup_date, v_time,
    p_delivery_method,
    p_pickup_type, p_pickup_location,
    p_requires_frozen, p_store_info, p_shipping_address,
    p_service_duration, p_service_notes,
    'auto', v_status, NULL, COALESCE(p_customer_notes, p_customer_notes_extended),
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

  -- 建立提醒（僅正式訂單，不包含 draft）
  IF v_status <> 'draft' AND v_pickup_date > CURRENT_DATE THEN
    -- 7天前提醒
    IF v_pickup_date - INTERVAL '7 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '7day',
        (v_pickup_date - INTERVAL '7 days')::DATE + TIME '09:00:00',
        '7天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 7 天後處理'
      );
    END IF;

    -- 3天前提醒
    IF v_pickup_date - INTERVAL '3 days' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '3day',
        (v_pickup_date - INTERVAL '3 days')::DATE + TIME '09:00:00',
        '3天後訂單提醒',
        '訂單 ' || v_order_number || ' 將於 3 天後處理'
      );
    END IF;

    -- 1天前提醒
    IF v_pickup_date - INTERVAL '1 day' > NOW() THEN
      INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
      VALUES (
        p_team_id, v_order_id, '1day',
        (v_pickup_date - INTERVAL '1 day')::DATE + TIME '09:00:00',
        '明天訂單提醒',
        '訂單 ' || v_order_number || ' 將於明天處理'
      );
    END IF;

    -- 當天提醒
    INSERT INTO reminders (team_id, order_id, remind_type, remind_time, title, message)
    VALUES (
      p_team_id, v_order_id, 'today',
      v_pickup_date + TIME '08:00:00',
      '今日訂單提醒',
      '訂單 ' || v_order_number || ' 今天要處理'
    );
  END IF;

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."create_order_from_ai"("p_conversation_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_line_message_id" "uuid", "p_original_message" "text", "p_team_id" "uuid", "p_total_amount" numeric, "p_customer_notes" "text", "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_status" "text", "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes_extended" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_reminders_on_order_confirm"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_reminders_on_order_confirm"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_reminders_on_order_confirm"() IS '訂單確認時自動建立提醒（基於團隊設定的提醒天數）';



CREATE OR REPLACE FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text" DEFAULT NULL::"text", "p_business_type" "text" DEFAULT 'bakery'::"text") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_slug" "text", "invite_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_team_id UUID;
    v_slug TEXT;
    v_invite_code TEXT;
  BEGIN
    v_slug := LOWER(REGEXP_REPLACE(p_team_name, '\s+', '-', 'g'));
    WHILE EXISTS (SELECT 1 FROM teams WHERE slug = v_slug) LOOP
      v_slug := v_slug || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    END LOOP;

    INSERT INTO teams (
      name, slug, line_channel_id, business_type,
      subscription_status, trial_started_at, trial_ends_at
    )
    VALUES (
      p_team_name, v_slug, p_line_channel_id, p_business_type,
      'trial', NOW(), NOW() + INTERVAL '3 days'
    )
    RETURNING id INTO v_team_id;

    INSERT INTO team_members (
      team_id, user_id, role,
      can_manage_orders, can_manage_customers, can_manage_settings,
      can_view_analytics, can_invite_members
    )
    VALUES (
      v_team_id, p_user_id, 'owner',
      true, true, true, true, true
    );

    v_invite_code := generate_invite_code(v_slug);

    INSERT INTO team_invites (
      team_id, invite_code, invited_by, role, is_active
    )
    VALUES (
      v_team_id, v_invite_code, p_user_id, 'admin', true
    );

    RETURN QUERY
    SELECT v_team_id, p_team_name, v_slug, v_invite_code;
  END;
  $$;


ALTER FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text", "p_business_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text", "p_business_type" "text") IS '建立團隊並自動加入擁有者，返回團隊資訊和邀請碼';



CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    select id from public.users where auth_user_id = auth.uid();
  $$;


ALTER FUNCTION "public"."current_app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_member_role TEXT;
  v_team_name TEXT;
  v_member_count INT;
BEGIN
  -- 檢查權限（只有 owner 可以刪除）
  SELECT role INTO v_member_role
  FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  IF v_member_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  IF v_member_role != 'owner' THEN
    RAISE EXCEPTION 'Only team owner can delete the team';
  END IF;

  -- 取得團隊資訊（用於日誌）
  SELECT name, member_count INTO v_team_name, v_member_count
  FROM teams
  WHERE id = p_team_id;

  IF v_team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- 永久刪除團隊（CASCADE 會自動刪除相關資料）
  DELETE FROM teams
  WHERE id = p_team_id;

  RAISE NOTICE '團隊 "%" (成員數: %) 已永久刪除', v_team_name, v_member_count;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") IS '刪除團隊（硬刪除），只有 owner 可執行，資料永久移除無法復原';



CREATE OR REPLACE FUNCTION "public"."delete_user_account"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_record RECORD;
  v_team_member_count INT;
BEGIN
  RAISE NOTICE '開始刪除用戶帳號: %', p_user_id;

  -- 1. 處理用戶所屬的所有團隊
  FOR v_team_record IN 
    SELECT tm.team_id, tm.role, t.name as team_name
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id
  LOOP
    RAISE NOTICE '處理團隊: % (角色: %)', v_team_record.team_name, v_team_record.role;

    -- 如果是 owner，檢查是否為唯一 owner
    IF v_team_record.role = 'owner' THEN
      -- 計算該團隊的成員數
      SELECT COUNT(*) INTO v_team_member_count
      FROM team_members
      WHERE team_id = v_team_record.team_id;

      RAISE NOTICE '團隊 % 成員數: %', v_team_record.team_name, v_team_member_count;

      -- 如果是唯一成員（唯一 owner），刪除整個團隊
      IF v_team_member_count = 1 THEN
        RAISE NOTICE '用戶是團隊 % 的唯一成員，刪除整個團隊', v_team_record.team_name;
        DELETE FROM teams WHERE id = v_team_record.team_id;
      ELSE
        -- 如果團隊有其他成員，嘗試將 owner 轉移給第一個 admin
        DECLARE
          v_new_owner_id UUID;
        BEGIN
          SELECT user_id INTO v_new_owner_id
          FROM team_members
          WHERE team_id = v_team_record.team_id 
            AND user_id != p_user_id
            AND role = 'admin'
          LIMIT 1;

          IF v_new_owner_id IS NOT NULL THEN
            -- 轉移 owner 給 admin
            RAISE NOTICE '將團隊 % 的 owner 轉移給 admin: %', v_team_record.team_name, v_new_owner_id;
            UPDATE team_members
            SET role = 'owner'
            WHERE team_id = v_team_record.team_id AND user_id = v_new_owner_id;
            
            -- 刪除該用戶的成員記錄
            DELETE FROM team_members
            WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
          ELSE
            -- 沒有 admin 可以接手，將 owner 轉移給第一個 member
            SELECT user_id INTO v_new_owner_id
            FROM team_members
            WHERE team_id = v_team_record.team_id 
              AND user_id != p_user_id
            LIMIT 1;

            IF v_new_owner_id IS NOT NULL THEN
              RAISE NOTICE '將團隊 % 的 owner 轉移給 member: %', v_team_record.team_name, v_new_owner_id;
              UPDATE team_members
              SET role = 'owner'
              WHERE team_id = v_team_record.team_id AND user_id = v_new_owner_id;
              
              -- 刪除該用戶的成員記錄
              DELETE FROM team_members
              WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
            ELSE
              -- 理論上不應該到這裡
              RAISE NOTICE '無法找到接手者，刪除整個團隊';
              DELETE FROM teams WHERE id = v_team_record.team_id;
            END IF;
          END IF;
        END;
      END IF;
    ELSE
      -- 如果不是 owner，直接移除成員記錄
      RAISE NOTICE '從團隊 % 移除成員', v_team_record.team_name;
      DELETE FROM team_members
      WHERE team_id = v_team_record.team_id AND user_id = p_user_id;
    END IF;
  END LOOP;

  -- 2. 刪除 public.users 記錄
  RAISE NOTICE '刪除 public.users 記錄';
  DELETE FROM users WHERE id = p_user_id;

  -- 3. 刪除 auth.users 記錄
  -- 注意：這需要從 auth.users 表刪除，需要 service_role 權限
  -- 在 Edge Function 中處理
  
  RAISE NOTICE '用戶帳號刪除完成: %', p_user_id;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") IS '刪除用戶帳號（永久刪除），符合 Apple App Store 要求。如果用戶是團隊唯一 owner，將自動刪除該團隊。';



CREATE OR REPLACE FUNCTION "public"."generate_invite_code"("p_team_slug" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  random_part TEXT;
BEGIN
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  RETURN UPPER(p_team_slug) || '-' || random_part;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"("p_team_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_invite_code"("p_team_slug" "text") IS '生成團隊邀請碼，格式：TEAMSLUG-XXXXXX';



CREATE OR REPLACE FUNCTION "public"."generate_order_number"("p_team_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_order_number"("p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_order_number"("p_team_id" "uuid") IS '生成團隊層級的訂單編號，格式：ORD-YYYYMMDD-XXX';



CREATE OR REPLACE FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer DEFAULT 5) RETURNS TABLE("role" "text", "message" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer) IS '取得對話的最近 N 條訊息記錄';



CREATE OR REPLACE FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") IS '取得團隊指定日期的訂單摘要統計';



CREATE OR REPLACE FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") RETURNS TABLE("id" "uuid", "team_id" "uuid", "line_user_id" "text", "status" "text", "collected_data" "jsonb", "missing_fields" "text"[], "order_id" "uuid", "last_message_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") IS '取得或建立對話記錄（同一用戶只保持一個進行中的對話）';



CREATE OR REPLACE FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_invite_code TEXT;
    v_team_slug TEXT;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = p_user_id
        AND (role IN ('owner', 'admin') OR can_invite_members = true)
    ) THEN
      RAISE EXCEPTION 'User does not have permission to generate invite codes';
    END IF;

    SELECT invite_code INTO v_invite_code
    FROM team_invites
    WHERE team_id = p_team_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR uses_count < max_uses)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite_code IS NULL THEN
      SELECT slug INTO v_team_slug FROM teams WHERE id = p_team_id;
      v_invite_code := generate_invite_code(v_team_slug);

      INSERT INTO team_invites (
        team_id, invite_code, invited_by, role, is_active
      )
      VALUES (
        p_team_id, v_invite_code, p_user_id, 'admin', true
      );
    END IF;

    RETURN v_invite_code;
  END;
  $$;


ALTER FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") IS '取得或建立團隊邀請碼（需要權限）';



CREATE OR REPLACE FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") RETURNS TABLE("role" "text", "message" "text", "message_timestamp" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") IS '取得訂單的完整對話記錄（依時間順序）';



CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") RETURNS TABLE("member_id" "uuid", "user_id" "uuid", "user_name" "text", "user_picture_url" "text", "role" "text", "joined_at" timestamp with time zone, "can_manage_orders" boolean, "can_manage_customers" boolean, "can_manage_settings" boolean, "can_view_analytics" boolean, "can_invite_members" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.user_id,
    u.line_display_name AS user_name,
    u.line_picture_url AS user_picture_url,
    tm.role,
    tm.joined_at,
    tm.can_manage_orders,
    tm.can_manage_customers,
    tm.can_manage_settings,
    tm.can_view_analytics,
    tm.can_invite_members
  FROM team_members tm
  JOIN users u ON u.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.joined_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_team_members"("p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") IS '取得團隊的所有成員列表';



CREATE OR REPLACE FUNCTION "public"."get_user_teams"("p_user_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_slug" "text", "role" "text", "member_count" integer, "order_count" integer, "subscription_status" "text", "line_channel_name" "text", "line_channel_id" "text", "auto_mode" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    tm.role,
    COALESCE(t.member_count, 0) AS member_count,
    COALESCE(t.total_orders, 0) AS order_count,
    t.subscription_status,
    t.line_channel_name,
    t.line_channel_id,
    COALESCE(t.auto_mode, false) AS auto_mode
  FROM team_members tm
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id
    AND t.deleted_at IS NULL
  ORDER BY tm.joined_at DESC, t.id;
END;
$$;


ALTER FUNCTION "public"."get_user_teams"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_line_user_id TEXT;
  v_google_user_id TEXT;
  v_apple_user_id TEXT;
  v_provider TEXT;
  v_display_name TEXT;
  v_picture_url TEXT;
BEGIN
  -- 從 user_metadata 提取資訊
  v_line_user_id := NEW.raw_user_meta_data->>'line_user_id';
  v_google_user_id := NEW.raw_user_meta_data->>'google_user_id';
  v_apple_user_id := NEW.raw_user_meta_data->>'apple_user_id';
  v_provider := COALESCE(
    NEW.raw_user_meta_data->>'auth_provider',
    NEW.raw_app_meta_data->>'provider',
    'unknown'
  );
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  v_picture_url := COALESCE(
    NEW.raw_user_meta_data->>'picture_url',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 如果是 Google/Apple OAuth，從 sub 取得 ID
  IF v_provider = 'google' AND v_google_user_id IS NULL THEN
    v_google_user_id := NEW.raw_user_meta_data->>'sub';
  END IF;
  
  IF v_provider = 'apple' AND v_apple_user_id IS NULL THEN
    v_apple_user_id := NEW.raw_user_meta_data->>'sub';
  END IF;

  -- Upsert 到 public.users
  -- 優先使用各 provider 的 ID 作為衝突檢查
  INSERT INTO public.users (
    auth_user_id,
    line_user_id,
    google_user_id,
    apple_user_id,
    line_display_name,
    line_email,
    line_picture_url,
    auth_provider,
    last_login_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_line_user_id,
    v_google_user_id,
    v_apple_user_id,
    v_display_name,
    NEW.email,
    v_picture_url,
    v_provider,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    line_user_id = COALESCE(EXCLUDED.line_user_id, users.line_user_id),
    google_user_id = COALESCE(EXCLUDED.google_user_id, users.google_user_id),
    apple_user_id = COALESCE(EXCLUDED.apple_user_id, users.apple_user_id),
    line_display_name = COALESCE(EXCLUDED.line_display_name, users.line_display_name),
    line_email = COALESCE(EXCLUDED.line_email, users.line_email),
    line_picture_url = COALESCE(EXCLUDED.line_picture_url, users.line_picture_url),
    auth_provider = EXCLUDED.auth_provider,
    last_login_at = NOW(),
    updated_at = NOW();

  RAISE NOTICE '[Auth Sync] Synced user: % (provider: %)', NEW.id, v_provider;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_sync"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_auth_user_sync"() IS '自動同步 auth.users 到 public.users，支援 LINE/Google/Apple OAuth';



CREATE OR REPLACE FUNCTION "public"."initialize_trial"("p_team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE teams
  SET
    subscription_status = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '3 days'
  WHERE id = p_team_id;
END;
$$;


ALTER FUNCTION "public"."initialize_trial"("p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_trial"("p_team_id" "uuid") IS '初始化新團隊的 3 天免費試用期';



CREATE OR REPLACE FUNCTION "public"."is_team_member"("tid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
    select exists(
      select 1 from public.team_members tm
      where tm.team_id = tid and tm.user_id = current_app_user_id()
    );
  $$;


ALTER FUNCTION "public"."is_team_member"("tid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_member_role TEXT;
  v_owner_count INT;
BEGIN
  -- 檢查成員是否存在
  SELECT role INTO v_member_role
  FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  IF v_member_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- 如果是 owner，檢查是否還有其他 owner
  IF v_member_role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM team_members
    WHERE team_id = p_team_id AND role = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot leave team: You are the only owner. Transfer ownership or delete the team.';
    END IF;
  END IF;

  -- 移除成員
  DELETE FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  -- 更新團隊成員數
  UPDATE teams
  SET member_count = member_count - 1
  WHERE id = p_team_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") IS '離開團隊，如果是唯一 owner 則無法離開';



CREATE OR REPLACE FUNCTION "public"."refresh_daily_revenue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_old_ok boolean := (TG_OP <> 'INSERT')
      AND (OLD.status IN ('paid','completed')) AND OLD.paid_at IS NOT NULL;
    v_new_ok boolean := (TG_OP <> 'DELETE')
      AND (NEW.status IN ('paid','completed')) AND NEW.paid_at IS NOT NULL;
    v_old_date date;
    v_new_date date;
    v_old_method text;
    v_new_method text;
  BEGIN
    IF v_old_ok THEN
      v_old_date := (OLD.paid_at AT TIME ZONE 'UTC')::date;
      v_old_method := COALESCE(OLD.payment_method, 'cash');
      PERFORM public.apply_daily_revenue_delta(OLD.team_id, v_old_date, OLD.total_amount, v_old_method, -1);
    END IF;

    IF v_new_ok THEN
      v_new_date := (NEW.paid_at AT TIME ZONE 'UTC')::date;
      v_new_method := COALESCE(NEW.payment_method, 'cash');
      PERFORM public.apply_daily_revenue_delta(NEW.team_id, v_new_date, NEW.total_amount, v_new_method, 1);
    END IF;

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."refresh_daily_revenue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE conversations
  SET 
    collected_data = p_collected_data,
    missing_fields = p_missing_fields,
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = p_conversation_id;
END;
$$;


ALTER FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) IS '更新對話中已收集的資訊和缺少的欄位';



CREATE OR REPLACE FUNCTION "public"."update_expired_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_expired_subscriptions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_expired_subscriptions"() IS '自動更新過期的訂閱狀態，建議每天執行';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS '自動更新 updated_at 欄位為當前時間';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "line_user_id" "text" NOT NULL,
    "status" "text" DEFAULT 'collecting_info'::"text",
    "collected_data" "jsonb" DEFAULT '{}'::"jsonb",
    "missing_fields" "text"[],
    "order_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "turn_count" integer DEFAULT 0
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS '對話追蹤表 - 支援多輪對話建立訂單';



COMMENT ON COLUMN "public"."conversations"."collected_data" IS 'AI 已收集到的部分訂單資訊（JSONB）';



COMMENT ON COLUMN "public"."conversations"."missing_fields" IS '還需要補充的欄位列表';



COMMENT ON COLUMN "public"."conversations"."turn_count" IS 'AI 回覆的次數（對話輪數），用於限制對話輪數避免無限對話';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text",
    "line_user_id" "text",
    "email" "text",
    "total_orders" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_order_at" timestamp with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS '顧客表 - 屬於團隊，不是個人';



COMMENT ON COLUMN "public"."customers"."team_id" IS '所屬團隊 ID';



CREATE TABLE IF NOT EXISTS "public"."daily_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "revenue_date" "date" NOT NULL,
    "total_revenue" numeric DEFAULT 0 NOT NULL,
    "order_count" integer DEFAULT 0 NOT NULL,
    "cash_total" numeric DEFAULT 0 NOT NULL,
    "transfer_total" numeric DEFAULT 0 NOT NULL,
    "other_total" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "line_message_id" "text" NOT NULL,
    "line_user_id" "text" NOT NULL,
    "message_type" "text" NOT NULL,
    "message_text" "text",
    "message_data" "jsonb",
    "ai_parsed" boolean DEFAULT false,
    "ai_result" "jsonb",
    "ai_confidence" numeric(3,2),
    "order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "conversation_id" "uuid",
    "role" "text" DEFAULT 'customer'::"text"
);


ALTER TABLE "public"."line_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."line_messages" IS 'LINE 對話記錄 - 屬於團隊';



COMMENT ON COLUMN "public"."line_messages"."conversation_id" IS '所屬對話 ID';



COMMENT ON COLUMN "public"."line_messages"."role" IS '訊息角色：customer（客人）/ ai（AI 助手）';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "customer_id" "uuid",
    "order_number" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "items" "jsonb" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "pickup_date" "date" NOT NULL,
    "pickup_time" time without time zone,
    "pickup_method" "text" DEFAULT 'store'::"text",
    "delivery_address" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "source" "text" DEFAULT 'auto'::"text",
    "line_conversation_id" "text",
    "original_message" "text",
    "notes" "text",
    "customer_notes" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "conversation_id" "uuid",
    "delivery_method" "text" DEFAULT 'pickup'::"text",
    "requires_frozen" boolean DEFAULT false,
    "store_info" "text",
    "shipping_address" "text",
    "service_duration" integer,
    "service_notes" "text",
    "payment_method" "text",
    "pickup_type" "text",
    "pickup_location" "text",
    "paid_at" timestamp without time zone,
    CONSTRAINT "orders_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'transfer'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS '訂單表 - 屬於團隊';



COMMENT ON COLUMN "public"."orders"."team_id" IS '所屬團隊 ID';



COMMENT ON COLUMN "public"."orders"."items" IS '商品列表 JSON 格式：[{"name": "巴斯克蛋糕 6吋", "quantity": 1, "price": 450, "notes": "少糖"}]';



COMMENT ON COLUMN "public"."orders"."pickup_date" IS '預約/交付日期：商品型=客人期望收到的日期，服務型=預約日期';



COMMENT ON COLUMN "public"."orders"."pickup_time" IS '預約/交付時間：商品型=客人期望收到的時間，服務型=預約時間';



COMMENT ON COLUMN "public"."orders"."pickup_method" IS '已棄用，請使用 delivery_method';



COMMENT ON COLUMN "public"."orders"."delivery_address" IS '已棄用，請使用 shipping_address';



COMMENT ON COLUMN "public"."orders"."created_by" IS '建立訂單的用戶（用於追蹤多人協作）';



COMMENT ON COLUMN "public"."orders"."updated_by" IS '最後修改訂單的用戶';



COMMENT ON COLUMN "public"."orders"."conversation_id" IS '關聯的對話 ID（用於追蹤對話記錄）';



COMMENT ON COLUMN "public"."orders"."delivery_method" IS '配送/服務方式：pickup(自取)、convenience_store(超商取貨)、black_cat(黑貓宅配)、onsite(到店服務)';



COMMENT ON COLUMN "public"."orders"."requires_frozen" IS '是否需要冷凍配送（商品型專用）';



COMMENT ON COLUMN "public"."orders"."store_info" IS '超商店號/店名（超商取貨專用）';



COMMENT ON COLUMN "public"."orders"."shipping_address" IS '寄送地址（宅配專用）';



COMMENT ON COLUMN "public"."orders"."service_duration" IS '服務時長（分鐘）（服務型專用）';



COMMENT ON COLUMN "public"."orders"."service_notes" IS '服務備註（如：頭髮長度、過敏資訊）（服務型專用）';



COMMENT ON COLUMN "public"."orders"."payment_method" IS '付款方式：cash(現金), transfer(轉帳), other(其他)';



COMMENT ON COLUMN "public"."orders"."pickup_type" IS '取貨類型：store（店取）或 meetup（面交），僅當 delivery_method=pickup 時有值';



COMMENT ON COLUMN "public"."orders"."pickup_location" IS '實際取貨或面交地點';



COMMENT ON COLUMN "public"."orders"."paid_at" IS '付款確認時間：商家確認收到款項的時間';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "unit" "text" DEFAULT '個'::"text" NOT NULL,
    "stock" integer,
    "low_stock_threshold" integer,
    "is_available" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "image_url" "text",
    "total_sold" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS '商品表 - 支援多行業通用管理（烘焙、美容、按摩等）';



COMMENT ON COLUMN "public"."products"."team_id" IS '所屬團隊 ID';



COMMENT ON COLUMN "public"."products"."name" IS '商品名稱（如：巴斯克蛋糕 6吋、剪髮服務）';



COMMENT ON COLUMN "public"."products"."category" IS '商品分類（行業自訂）：烘焙=蛋糕/麵包；美容=剪髮/染髮；按摩=全身/局部';



COMMENT ON COLUMN "public"."products"."unit" IS '單位：個/份/次/小時/盒/條（行業自訂）';



COMMENT ON COLUMN "public"."products"."stock" IS '庫存數量（NULL = 不追蹤庫存，適用於服務型行業）';



COMMENT ON COLUMN "public"."products"."is_available" IS '是否上架（AI 只會推薦上架商品）';



COMMENT ON COLUMN "public"."products"."metadata" IS '行業特定資料（JSONB）：烘焙=過敏原、保存方式；美容=服務時長、適合髮質；按摩=按摩類型、適合部位';



CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "order_id" "uuid",
    "remind_type" "text" NOT NULL,
    "remind_time" timestamp with time zone NOT NULL,
    "sent" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."reminders" IS '提醒通知 - 屬於團隊';



CREATE TABLE IF NOT EXISTS "public"."subscription_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "revenuecat_transaction_id" "text" NOT NULL,
    "revenuecat_event_type" "text" NOT NULL,
    "product_id" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'TWD'::"text",
    "purchased_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_transactions" IS '訂閱交易記錄 - 屬於團隊';



CREATE TABLE IF NOT EXISTS "public"."team_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "invite_code" "text" NOT NULL,
    "invited_by" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "max_uses" integer,
    "uses_count" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_invites" IS '團隊邀請碼表';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "can_manage_orders" boolean DEFAULT true,
    "can_manage_customers" boolean DEFAULT true,
    "can_manage_settings" boolean DEFAULT false,
    "can_view_analytics" boolean DEFAULT true,
    "can_invite_members" boolean DEFAULT false,
    "invited_by" "uuid",
    "invite_accepted_at" timestamp with time zone,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS '團隊成員關聯表 - 一個用戶可以加入多個團隊';



COMMENT ON COLUMN "public"."team_members"."role" IS '角色：owner（擁有者）、admin（管理員）、member（成員）';



CREATE TABLE IF NOT EXISTS "public"."team_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "business_hours" "jsonb",
    "holidays" "date"[],
    "order_lead_time_days" integer DEFAULT 3,
    "max_daily_orders" integer DEFAULT 20,
    "reminder_days" integer[] DEFAULT ARRAY[7, 3, 1],
    "notification_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "ai_auto_confirm" boolean DEFAULT false,
    "ai_confidence_threshold" numeric(3,2) DEFAULT 0.8,
    "custom_fields" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pickup_settings" "jsonb" DEFAULT '{"meetup": {"note": null, "enabled": false, "available_areas": []}, "store_pickup": {"address": null, "enabled": false, "business_hours": null}}'::"jsonb",
    "enable_convenience_store" boolean DEFAULT true,
    "enable_black_cat" boolean DEFAULT true
);


ALTER TABLE "public"."team_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_settings" IS '團隊進階設定 - 基本設定在 teams 表';



COMMENT ON COLUMN "public"."team_settings"."business_hours" IS '營業時間 JSON 格式：{"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}';



COMMENT ON COLUMN "public"."team_settings"."pickup_settings" IS '取貨設定：store_pickup（店取）和 meetup（面交）';



COMMENT ON COLUMN "public"."team_settings"."enable_convenience_store" IS '是否啟用超商取貨';



COMMENT ON COLUMN "public"."team_settings"."enable_black_cat" IS '是否啟用宅配（黑貓）';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "logo_url" "text",
    "line_channel_id" "text",
    "line_channel_secret" "text",
    "line_channel_access_token" "text",
    "line_channel_name" "text",
    "line_webhook_verified" boolean DEFAULT false,
    "line_connected_at" timestamp with time zone,
    "subscription_status" "text" DEFAULT 'trial'::"text",
    "subscription_plan" "text" DEFAULT 'pro'::"text",
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "subscription_started_at" timestamp with time zone,
    "subscription_current_period_end" timestamp with time zone,
    "revenuecat_customer_id" "text",
    "subscription_product_id" "text",
    "subscription_platform" "text",
    "auto_mode" boolean DEFAULT false,
    "ai_enabled" boolean DEFAULT true,
    "notification_enabled" boolean DEFAULT true,
    "timezone" "text" DEFAULT 'Asia/Taipei'::"text",
    "business_type" "text" DEFAULT 'bakery'::"text",
    "total_orders" integer DEFAULT 0,
    "total_revenue" numeric(10,2) DEFAULT 0,
    "member_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "line_bot_user_id" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS '團隊表 - OFlow 的核心實體，擁有訂閱、LINE 官方帳號、訂單等所有業務資料';



COMMENT ON COLUMN "public"."teams"."line_channel_id" IS 'LINE 官方帳號 Channel ID，一個團隊對應一個官方帳號';



COMMENT ON COLUMN "public"."teams"."subscription_status" IS '訂閱狀態：trial（試用）、active（付費中）、expired（過期）、cancelled（已取消）';



COMMENT ON COLUMN "public"."teams"."revenuecat_customer_id" IS 'RevenueCat Customer ID，格式：team_{team_id}';



COMMENT ON COLUMN "public"."teams"."business_type" IS '業務類別：bakery(烘焙)、beauty(美容美髮)、massage(按摩SPA)、nail(美甲美睫)、flower(花店)、craft(手工藝)、pet(寵物美容)、other(其他)';



COMMENT ON COLUMN "public"."teams"."line_bot_user_id" IS 'LINE Bot User ID（U 開頭），用於 Webhook destination 比對';



CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "expo_push_token" "text" NOT NULL,
    "platform" "text",
    "device_id" "text",
    "app_version" "text",
    "project_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_push_tokens_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text",
    "line_display_name" "text",
    "line_picture_url" "text",
    "line_email" "text",
    "preferred_language" "text" DEFAULT 'zh-TW'::"text",
    "current_team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "auth_user_id" "uuid",
    "apple_user_id" "text",
    "auth_provider" "text" DEFAULT 'line'::"text" NOT NULL,
    "google_user_id" "text",
    CONSTRAINT "check_auth_provider" CHECK (((("auth_provider" = 'line'::"text") AND ("line_user_id" IS NOT NULL)) OR (("auth_provider" = 'apple'::"text") AND ("apple_user_id" IS NOT NULL)))),
    CONSTRAINT "users_at_least_one_provider_id" CHECK ((("line_user_id" IS NOT NULL) OR ("google_user_id" IS NOT NULL) OR ("apple_user_id" IS NOT NULL)))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS '用戶表 - 只存個人登入資訊，不包含業務資料';



COMMENT ON COLUMN "public"."users"."line_user_id" IS 'LINE Login 的 User ID（個人帳號，不是官方帳號）';



COMMENT ON COLUMN "public"."users"."current_team_id" IS '用戶最後使用的團隊（用於自動選擇）';



COMMENT ON COLUMN "public"."users"."auth_user_id" IS '連結到 auth.users 的 ID';



COMMENT ON COLUMN "public"."users"."apple_user_id" IS 'Apple OAuth User ID（從 Supabase Auth 同步）';



COMMENT ON COLUMN "public"."users"."auth_provider" IS '登入方式：line, google, apple';



COMMENT ON COLUMN "public"."users"."google_user_id" IS 'Google OAuth User ID（從 Supabase Auth 同步）';



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_team_phone_unique" UNIQUE ("team_id", "phone");



ALTER TABLE ONLY "public"."daily_revenue"
    ADD CONSTRAINT "daily_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_revenue"
    ADD CONSTRAINT "daily_revenue_team_date" UNIQUE ("team_id", "revenue_date");



ALTER TABLE ONLY "public"."line_messages"
    ADD CONSTRAINT "line_messages_line_message_id_key" UNIQUE ("line_message_id");



ALTER TABLE ONLY "public"."line_messages"
    ADD CONSTRAINT "line_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_transactions"
    ADD CONSTRAINT "subscription_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_transactions"
    ADD CONSTRAINT "subscription_transactions_revenuecat_transaction_id_key" UNIQUE ("revenuecat_transaction_id");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_settings"
    ADD CONSTRAINT "team_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_settings"
    ADD CONSTRAINT "team_settings_team_id_key" UNIQUE ("team_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_line_channel_id_key" UNIQUE ("line_channel_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_expo_push_token_key" UNIQUE ("expo_push_token");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_apple_user_id_key" UNIQUE ("apple_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_google_user_id_key" UNIQUE ("google_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_line_user_id_key" UNIQUE ("line_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_line_user_id" ON "public"."conversations" USING "btree" ("line_user_id");



CREATE INDEX "idx_conversations_order_id" ON "public"."conversations" USING "btree" ("order_id");



CREATE INDEX "idx_conversations_status" ON "public"."conversations" USING "btree" ("status");



CREATE INDEX "idx_conversations_team_id" ON "public"."conversations" USING "btree" ("team_id");



CREATE INDEX "idx_conversations_turn_count" ON "public"."conversations" USING "btree" ("turn_count");



CREATE INDEX "idx_customers_line_user_id" ON "public"."customers" USING "btree" ("line_user_id");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_customers_team_id" ON "public"."customers" USING "btree" ("team_id");



CREATE UNIQUE INDEX "idx_customers_team_phone" ON "public"."customers" USING "btree" ("team_id", "phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_line_messages_ai_parsed" ON "public"."line_messages" USING "btree" ("ai_parsed") WHERE ("ai_parsed" = false);



CREATE INDEX "idx_line_messages_conversation" ON "public"."line_messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_line_messages_created_at" ON "public"."line_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_line_messages_line_user_id" ON "public"."line_messages" USING "btree" ("line_user_id");



CREATE INDEX "idx_line_messages_role" ON "public"."line_messages" USING "btree" ("role");



CREATE INDEX "idx_line_messages_team_id" ON "public"."line_messages" USING "btree" ("team_id");



CREATE INDEX "idx_orders_completed_payment" ON "public"."orders" USING "btree" ("team_id", "status", "payment_method", "pickup_date") WHERE ("status" = 'completed'::"text");



CREATE INDEX "idx_orders_conversation_id" ON "public"."orders" USING "btree" ("conversation_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_created_by" ON "public"."orders" USING "btree" ("created_by");



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_delivery_method" ON "public"."orders" USING "btree" ("delivery_method");



CREATE INDEX "idx_orders_paid_at" ON "public"."orders" USING "btree" ("paid_at") WHERE ("paid_at" IS NOT NULL);



CREATE INDEX "idx_orders_payment_method" ON "public"."orders" USING "btree" ("payment_method") WHERE ("payment_method" IS NOT NULL);



CREATE INDEX "idx_orders_pickup_date" ON "public"."orders" USING "btree" ("pickup_date");



CREATE INDEX "idx_orders_pickup_type" ON "public"."orders" USING "btree" ("pickup_type") WHERE ("pickup_type" IS NOT NULL);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_team_delivery" ON "public"."orders" USING "btree" ("team_id", "delivery_method");



CREATE INDEX "idx_orders_team_id" ON "public"."orders" USING "btree" ("team_id");



CREATE INDEX "idx_orders_team_status_pickup" ON "public"."orders" USING "btree" ("team_id", "status", "pickup_date");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_is_available" ON "public"."products" USING "btree" ("is_available");



CREATE INDEX "idx_products_team_available" ON "public"."products" USING "btree" ("team_id", "is_available");



CREATE INDEX "idx_products_team_available_only" ON "public"."products" USING "btree" ("team_id", "category", "name") WHERE ("is_available" = true);



CREATE INDEX "idx_products_team_category" ON "public"."products" USING "btree" ("team_id", "category");



CREATE INDEX "idx_products_team_id" ON "public"."products" USING "btree" ("team_id");



CREATE INDEX "idx_products_team_sort" ON "public"."products" USING "btree" ("team_id", "sort_order");



CREATE INDEX "idx_reminders_order_id" ON "public"."reminders" USING "btree" ("order_id");



CREATE INDEX "idx_reminders_sent" ON "public"."reminders" USING "btree" ("sent", "remind_time") WHERE ("sent" = false);



CREATE INDEX "idx_reminders_team_id" ON "public"."reminders" USING "btree" ("team_id");



CREATE INDEX "idx_subscription_transactions_event_type" ON "public"."subscription_transactions" USING "btree" ("revenuecat_event_type");



CREATE INDEX "idx_subscription_transactions_purchased_at" ON "public"."subscription_transactions" USING "btree" ("purchased_at" DESC);



CREATE INDEX "idx_subscription_transactions_team_id" ON "public"."subscription_transactions" USING "btree" ("team_id");



CREATE INDEX "idx_team_invites_code" ON "public"."team_invites" USING "btree" ("invite_code");



CREATE INDEX "idx_team_invites_team_id" ON "public"."team_invites" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_role" ON "public"."team_members" USING "btree" ("role");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_settings_team_id" ON "public"."team_settings" USING "btree" ("team_id");



CREATE INDEX "idx_teams_business_type" ON "public"."teams" USING "btree" ("business_type");



CREATE INDEX "idx_teams_deleted_at" ON "public"."teams" USING "btree" ("deleted_at");



CREATE INDEX "idx_teams_line_bot_user_id" ON "public"."teams" USING "btree" ("line_bot_user_id");



CREATE INDEX "idx_teams_line_channel_id" ON "public"."teams" USING "btree" ("line_channel_id");



CREATE INDEX "idx_teams_slug" ON "public"."teams" USING "btree" ("slug");



CREATE INDEX "idx_teams_subscription_status" ON "public"."teams" USING "btree" ("subscription_status");



CREATE INDEX "idx_user_push_tokens_last_seen" ON "public"."user_push_tokens" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_user_push_tokens_status" ON "public"."user_push_tokens" USING "btree" ("status");



CREATE INDEX "idx_user_push_tokens_team" ON "public"."user_push_tokens" USING "btree" ("team_id");



CREATE INDEX "idx_user_push_tokens_user" ON "public"."user_push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_users_apple_user_id" ON "public"."users" USING "btree" ("apple_user_id");



CREATE INDEX "idx_users_auth_provider" ON "public"."users" USING "btree" ("auth_provider");



CREATE UNIQUE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_users_current_team_id" ON "public"."users" USING "btree" ("current_team_id");



CREATE INDEX "idx_users_google_user_id" ON "public"."users" USING "btree" ("google_user_id");



CREATE INDEX "idx_users_line_user_id" ON "public"."users" USING "btree" ("line_user_id");



CREATE UNIQUE INDEX "unique_active_conversation" ON "public"."conversations" USING "btree" ("team_id", "line_user_id", "status") WHERE ("status" = ANY (ARRAY['collecting_info'::"text", 'awaiting_merchant_confirmation'::"text", 'requires_manual_handling'::"text"]));



CREATE OR REPLACE TRIGGER "trg_refresh_daily_revenue" AFTER INSERT OR DELETE OR UPDATE OF "status", "paid_at", "total_amount", "payment_method", "team_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_daily_revenue"();



CREATE OR REPLACE TRIGGER "trigger_create_default_team_settings" AFTER INSERT ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_team_settings"();



CREATE OR REPLACE TRIGGER "trigger_create_reminders" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."create_reminders_on_order_confirm"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_settings_updated_at" BEFORE UPDATE ON "public"."team_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_revenue"
    ADD CONSTRAINT "daily_revenue_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_users_auth_user_id" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_messages"
    ADD CONSTRAINT "line_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_messages"
    ADD CONSTRAINT "line_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."line_messages"
    ADD CONSTRAINT "line_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_transactions"
    ADD CONSTRAINT "subscription_transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_settings"
    ADD CONSTRAINT "team_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id");



CREATE POLICY "Members can view team invites" ON "public"."team_invites" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Members can view team members" ON "public"."team_members" FOR SELECT USING ("public"."is_team_member"("team_id"));



CREATE POLICY "Members can view their teams" ON "public"."teams" FOR SELECT USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Owners and admins can create invites" ON "public"."team_invites" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("tm"."role" = 'owner'::"text") OR ("tm"."role" = 'admin'::"text") OR ("tm"."can_invite_members" = true))))));



CREATE POLICY "Owners and admins can manage settings" ON "public"."team_settings" USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_settings" = true))))) WITH CHECK (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_settings" = true)))));



CREATE POLICY "Owners and admins can update invites" ON "public"."team_invites" FOR UPDATE USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("tm"."role" = 'owner'::"text") OR ("tm"."role" = 'admin'::"text"))))));



CREATE POLICY "Owners can manage team members" ON "public"."team_members" USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("tm"."role" = 'owner'::"text") OR ("tm"."role" = 'admin'::"text"))))));



CREATE POLICY "Owners can update team" ON "public"."teams" FOR UPDATE USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("team_members"."role" = 'owner'::"text")))));



CREATE POLICY "Select daily_revenue by team membership" ON "public"."daily_revenue" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM ("public"."team_members" "tm"
     JOIN "public"."users" "u" ON (("u"."id" = "tm"."user_id")))
  WHERE ("u"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Service role can modify daily_revenue" ON "public"."daily_revenue" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert messages" ON "public"."line_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert transactions" ON "public"."subscription_transactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage reminders" ON "public"."reminders" USING (true) WITH CHECK (true);



CREATE POLICY "Team members can delete orders" ON "public"."orders" FOR DELETE USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_orders" = true)))));



CREATE POLICY "Team members can insert orders" ON "public"."orders" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_orders" = true)))));



CREATE POLICY "Team members can manage customers" ON "public"."customers" USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_customers" = true))))) WITH CHECK (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_customers" = true)))));



CREATE POLICY "Team members can manage products" ON "public"."products" USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_orders" = true))))) WITH CHECK (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_orders" = true)))));



CREATE POLICY "Team members can update orders" ON "public"."orders" FOR UPDATE USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("tm"."can_manage_orders" = true)))));



CREATE POLICY "Team members can view customers" ON "public"."customers" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view messages" ON "public"."line_messages" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view orders" ON "public"."orders" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view products" ON "public"."products" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view reminders" ON "public"."reminders" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view settings" ON "public"."team_settings" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Team members can view transactions" ON "public"."subscription_transactions" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can join teams" ON "public"."team_members" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_revenue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read team conversations" ON "public"."conversations" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "read team orders" ON "public"."orders" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access" ON "public"."conversations" USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."subscription_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_can_view_own_conversations" ON "public"."conversations" FOR SELECT USING (("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."team_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_push_tokens_delete_own" ON "public"."user_push_tokens" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "user_push_tokens"."user_id") AND ("u"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "user_push_tokens_insert_own" ON "public"."user_push_tokens" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "user_push_tokens"."user_id") AND ("u"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "user_push_tokens_select_own" ON "public"."user_push_tokens" FOR SELECT USING (("user_id" = ( SELECT "u"."id"
   FROM "public"."users" "u"
  WHERE ("u"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "user_push_tokens_update_own" ON "public"."user_push_tokens" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "user_push_tokens"."user_id") AND ("u"."auth_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "user_push_tokens"."user_id") AND ("u"."auth_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_daily_revenue_delta"("p_team_id" "uuid", "p_date" "date", "p_amount" numeric, "p_method" "text", "p_direction" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_daily_revenue_delta"("p_team_id" "uuid", "p_date" "date", "p_amount" numeric, "p_method" "text", "p_direction" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_daily_revenue_delta"("p_team_id" "uuid", "p_date" "date", "p_amount" numeric, "p_method" "text", "p_direction" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_orders"("tid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_orders"("tid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_orders"("tid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_subscription_valid"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_line_configured"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_abandoned_conversations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_abandoned_conversations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_abandoned_conversations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_conversation"("p_conversation_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_team_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_team_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_team_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_dev_user"("email_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_dev_user"("email_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_dev_user"("email_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order"("p_team_id" "uuid", "p_created_by" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_source" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes" "text", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes" "text", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_team_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_total_amount" numeric, "p_line_message_id" "uuid", "p_original_message" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes" "text", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_conversation_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_line_message_id" "uuid", "p_original_message" "text", "p_team_id" "uuid", "p_total_amount" numeric, "p_customer_notes" "text", "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_status" "text", "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes_extended" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_conversation_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_line_message_id" "uuid", "p_original_message" "text", "p_team_id" "uuid", "p_total_amount" numeric, "p_customer_notes" "text", "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_status" "text", "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes_extended" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_from_ai"("p_conversation_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_items" "jsonb", "p_line_message_id" "uuid", "p_original_message" "text", "p_team_id" "uuid", "p_total_amount" numeric, "p_customer_notes" "text", "p_pickup_date" "date", "p_pickup_time" time without time zone, "p_status" "text", "p_delivery_method" "text", "p_pickup_type" "text", "p_pickup_location" "text", "p_requires_frozen" boolean, "p_store_info" "text", "p_shipping_address" "text", "p_service_duration" integer, "p_service_notes" "text", "p_customer_notes_extended" "text", "p_appointment_date" "date", "p_appointment_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reminders_on_order_confirm"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_reminders_on_order_confirm"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reminders_on_order_confirm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text", "p_business_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text", "p_business_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_user_id" "uuid", "p_team_name" "text", "p_line_channel_id" "text", "p_business_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"("p_team_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"("p_team_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"("p_team_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_history"("p_conversation_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_summary"("p_team_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_team_id" "uuid", "p_line_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_invite_code"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_conversation"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_teams"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_teams"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_teams"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_trial"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_trial"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_trial"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("tid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("tid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("tid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_team"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_daily_revenue"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_revenue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_revenue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_data"("p_conversation_id" "uuid", "p_collected_data" "jsonb", "p_missing_fields" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."daily_revenue" TO "anon";
GRANT ALL ON TABLE "public"."daily_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."line_messages" TO "anon";
GRANT ALL ON TABLE "public"."line_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."line_messages" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_transactions" TO "anon";
GRANT ALL ON TABLE "public"."subscription_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."team_invites" TO "anon";
GRANT ALL ON TABLE "public"."team_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invites" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_settings" TO "anon";
GRANT ALL ON TABLE "public"."team_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."team_settings" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































