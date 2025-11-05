-- ============================================
-- OFlow App Store 審核用測試帳號設定腳本
-- ============================================
-- 用途：為 iOS App Store 審核建立完整的測試環境
-- 執行時機：提交審核前
-- 清理時機：審核通過後可保留或刪除
-- ============================================

-- ============================================
-- Step 1: 建立測試用 Auth User
-- ============================================
-- ⚠️ 注意：此步驟需要在 Supabase Dashboard 手動執行
-- 路徑：Supabase Dashboard > Authentication > Users > Add User
-- 
-- 建議設定：
--   Email: appstore-reviewer@oflow-test.com
--   Password: TestReviewer2025! （記得記錄）
--   Email Confirmed: ✅ 勾選
--
-- 建立後，請複製 User ID (UUID)，將在下面的腳本中使用

-- ============================================
-- Step 2: 建立 public.users 測試資料
-- ============================================
-- ⚠️ 請將 {AUTH_USER_ID} 替換為 Step 1 建立的 User ID

-- 先查詢是否已存在測試用戶
SELECT id, line_user_id, line_display_name 
FROM public.users 
WHERE line_user_id = 'TEST_REVIEWER_LINE_ID';

-- 如果不存在，則建立
INSERT INTO public.users (
  id,
  line_user_id,
  line_display_name,
  line_picture_url,
  line_email,
  auth_user_id,
  preferred_language,
  created_at,
  updated_at,
  last_login_at
) VALUES (
  gen_random_uuid(),
  'TEST_REVIEWER_LINE_ID',
  'App Store 審核員（測試帳號）',
  NULL,
  'appstore-reviewer@oflow-test.com',
  '{AUTH_USER_ID}', -- ⚠️ 替換為 Step 1 的 User ID
  'zh-TW',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (line_user_id) DO UPDATE SET
  line_display_name = EXCLUDED.line_display_name,
  auth_user_id = EXCLUDED.auth_user_id,
  updated_at = NOW();

-- 取得剛建立的 user_id，後續步驟會用到
SELECT id as test_user_id, line_user_id, line_display_name 
FROM public.users 
WHERE line_user_id = 'TEST_REVIEWER_LINE_ID';

-- ============================================
-- Step 3: 建立測試團隊（使用 create_team_with_owner 函數）
-- ============================================
-- ⚠️ 請將 {TEST_USER_ID} 替換為 Step 2 查詢到的 user_id

-- 檢查是否已存在測試團隊
SELECT t.id, t.name, t.slug 
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';

-- 建立測試團隊（如果不存在）
DO $$
DECLARE
  v_test_user_id UUID;
  v_team_result RECORD;
BEGIN
  -- 取得測試用戶 ID
  SELECT id INTO v_test_user_id 
  FROM public.users 
  WHERE line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 檢查是否已有團隊
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = v_test_user_id
  ) THEN
    -- 建立測試團隊
    SELECT * INTO v_team_result
    FROM create_team_with_owner(
      p_user_id := v_test_user_id,
      p_team_name := 'OFlow 審核測試店',
      p_line_channel_id := NULL,
      p_business_type := 'bakery'
    );
    
    RAISE NOTICE '測試團隊已建立: % (ID: %)', v_team_result.team_name, v_team_result.team_id;
  ELSE
    RAISE NOTICE '測試用戶已有團隊，跳過建立';
  END IF;
END $$;

-- 取得測試團隊 ID，後續步驟會用到
SELECT t.id as test_team_id, t.name, t.slug, t.business_type
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';

-- ============================================
-- Step 4: 設定測試團隊為「已完成 LINE 設定」狀態
-- ============================================
-- 這樣審核員登入後可以直接進入主頁面，不會卡在設定流程

DO $$
DECLARE
  v_test_team_id UUID;
BEGIN
  -- 取得測試團隊 ID
  SELECT t.id INTO v_test_team_id
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  JOIN users u ON u.id = tm.user_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 更新團隊 LINE 設定（模擬已完成設定）
  UPDATE teams SET
    line_channel_id = 'TEST_CHANNEL_ID_FOR_REVIEW',
    line_channel_secret = 'test_secret',
    line_channel_access_token = 'test_token',
    line_channel_name = '@oflow-test',
    line_bot_user_id = 'U_test_bot_user_id',
    line_webhook_verified = true,
    line_connected_at = NOW(),
    updated_at = NOW()
  WHERE id = v_test_team_id;
  
  RAISE NOTICE '團隊 LINE 設定已完成';
END $$;

-- ============================================
-- Step 5: 建立測試顧客資料
-- ============================================

DO $$
DECLARE
  v_test_team_id UUID;
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_customer_3_id UUID;
BEGIN
  -- 取得測試團隊 ID
  SELECT t.id INTO v_test_team_id
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  JOIN users u ON u.id = tm.user_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 建立顧客 1
  INSERT INTO customers (
    id, team_id, name, phone, line_user_id, 
    total_orders, total_spent, notes, tags,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_test_team_id, '王小明', '0912345678', 'line_user_001',
    2, 1200.00, '常客，喜歡巴斯克蛋糕', ARRAY['VIP', '常客'],
    NOW() - INTERVAL '30 days', NOW()
  ) 
  ON CONFLICT (team_id, phone) DO NOTHING
  RETURNING id INTO v_customer_1_id;
  
  -- 建立顧客 2
  INSERT INTO customers (
    id, team_id, name, phone, line_user_id,
    total_orders, total_spent, notes,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_test_team_id, '李小華', '0923456789', 'line_user_002',
    1, 600.00, '第一次購買',
    NOW() - INTERVAL '7 days', NOW()
  )
  ON CONFLICT (team_id, phone) DO NOTHING
  RETURNING id INTO v_customer_2_id;
  
  -- 建立顧客 3
  INSERT INTO customers (
    id, team_id, name, phone, line_user_id,
    total_orders, total_spent,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_test_team_id, '張美美', '0934567890', 'line_user_003',
    1, 450.00,
    NOW() - INTERVAL '2 days', NOW()
  )
  ON CONFLICT (team_id, phone) DO NOTHING
  RETURNING id INTO v_customer_3_id;
  
  RAISE NOTICE '測試顧客已建立';
END $$;

-- ============================================
-- Step 6: 建立測試商品資料
-- ============================================

DO $$
DECLARE
  v_test_team_id UUID;
BEGIN
  -- 取得測試團隊 ID
  SELECT t.id INTO v_test_team_id
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  JOIN users u ON u.id = tm.user_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 商品 1: 巴斯克蛋糕 6吋
  INSERT INTO products (
    team_id, name, price, description, category, unit,
    stock, low_stock_threshold, is_available, sort_order,
    metadata, created_at, updated_at
  ) VALUES (
    v_test_team_id, '巴斯克蛋糕 6吋', 450.00,
    '經典巴斯克蛋糕，濃郁香醇，入口即化',
    '蛋糕', '個',
    5, 2, true, 1,
    '{"allergens": ["蛋", "奶"], "storage": "refrigerated", "shelf_life_days": 3}'::jsonb,
    NOW(), NOW()
  );
  
  -- 商品 2: 檸檬塔
  INSERT INTO products (
    team_id, name, price, description, category, unit,
    stock, low_stock_threshold, is_available, sort_order,
    metadata, created_at, updated_at
  ) VALUES (
    v_test_team_id, '檸檬塔', 120.00,
    '酸甜適中的檸檬塔，清爽不膩',
    '塔類', '個',
    10, 3, true, 2,
    '{"allergens": ["蛋", "奶", "小麥"], "storage": "refrigerated", "shelf_life_days": 5}'::jsonb,
    NOW(), NOW()
  );
  
  -- 商品 3: 巧克力蛋糕 8吋
  INSERT INTO products (
    team_id, name, price, description, category, unit,
    stock, low_stock_threshold, is_available, sort_order,
    metadata, created_at, updated_at
  ) VALUES (
    v_test_team_id, '巧克力蛋糕 8吋', 750.00,
    '濃郁黑巧克力蛋糕，適合慶生',
    '蛋糕', '個',
    3, 1, true, 3,
    '{"allergens": ["蛋", "奶", "小麥"], "storage": "refrigerated", "shelf_life_days": 3}'::jsonb,
    NOW(), NOW()
  );
  
  -- 商品 4: 草莓生乳捲
  INSERT INTO products (
    team_id, name, price, description, category, unit,
    stock, low_stock_threshold, is_available, sort_order,
    metadata, created_at, updated_at
  ) VALUES (
    v_test_team_id, '草莓生乳捲', 380.00,
    '新鮮草莓搭配綿密鮮奶油',
    '蛋糕卷', '條',
    8, 2, true, 4,
    '{"allergens": ["蛋", "奶"], "storage": "refrigerated", "shelf_life_days": 2}'::jsonb,
    NOW(), NOW()
  );
  
  RAISE NOTICE '測試商品已建立';
END $$;

-- ============================================
-- Step 7: 建立測試訂單（不同狀態）
-- ============================================

DO $$
DECLARE
  v_test_team_id UUID;
  v_test_user_id UUID;
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_customer_3_id UUID;
  v_order_1_id UUID;
  v_order_2_id UUID;
  v_order_3_id UUID;
  v_order_4_id UUID;
  v_order_5_id UUID;
BEGIN
  -- 取得測試團隊和用戶 ID
  SELECT u.id, t.id INTO v_test_user_id, v_test_team_id
  FROM users u
  JOIN team_members tm ON tm.user_id = u.id
  JOIN teams t ON t.id = tm.team_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 取得顧客 ID
  SELECT id INTO v_customer_1_id FROM customers 
  WHERE team_id = v_test_team_id AND phone = '0912345678';
  
  SELECT id INTO v_customer_2_id FROM customers 
  WHERE team_id = v_test_team_id AND phone = '0923456789';
  
  SELECT id INTO v_customer_3_id FROM customers 
  WHERE team_id = v_test_team_id AND phone = '0934567890';
  
  -- 訂單 1: 今日待處理訂單
  v_order_1_id := gen_random_uuid();
  INSERT INTO orders (
    id, team_id, customer_id, order_number,
    customer_name, customer_phone,
    items, total_amount,
    pickup_date, pickup_time, delivery_method,
    status, source,
    notes, customer_notes,
    created_by, created_at, updated_at
  ) VALUES (
    v_order_1_id, v_test_team_id, v_customer_1_id,
    'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-001',
    '王小明', '0912345678',
    '[{"name": "巴斯克蛋糕 6吋", "quantity": 1, "price": 450, "notes": ""}]'::jsonb,
    450.00,
    CURRENT_DATE, '15:00:00', 'pickup',
    'pending', 'auto',
    '需要冷藏保存', '今天下午要取貨',
    v_test_user_id, NOW() - INTERVAL '2 hours', NOW()
  );
  
  -- 訂單 2: 今日已確認訂單
  v_order_2_id := gen_random_uuid();
  INSERT INTO orders (
    id, team_id, customer_id, order_number,
    customer_name, customer_phone,
    items, total_amount,
    pickup_date, pickup_time, delivery_method,
    status, source,
    notes,
    created_by, confirmed_at, created_at, updated_at
  ) VALUES (
    v_order_2_id, v_test_team_id, v_customer_2_id,
    'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-002',
    '李小華', '0923456789',
    '[{"name": "檸檬塔", "quantity": 3, "price": 120, "notes": ""}, {"name": "草莓生乳捲", "quantity": 1, "price": 380, "notes": ""}]'::jsonb,
    740.00,
    CURRENT_DATE, '18:00:00', 'pickup',
    'confirmed', 'semi-auto',
    '已確認，等待取貨',
    v_test_user_id, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '3 hours', NOW()
  );
  
  -- 訂單 3: 明天的訂單
  v_order_3_id := gen_random_uuid();
  INSERT INTO orders (
    id, team_id, customer_id, order_number,
    customer_name, customer_phone,
    items, total_amount,
    pickup_date, pickup_time, delivery_method,
    status, source,
    customer_notes,
    created_by, created_at, updated_at
  ) VALUES (
    v_order_3_id, v_test_team_id, v_customer_3_id,
    'ORD-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYYMMDD') || '-001',
    '張美美', '0934567890',
    '[{"name": "巧克力蛋糕 8吋", "quantity": 1, "price": 750, "notes": "生日蛋糕，請寫「生日快樂 Mary」"}]'::jsonb,
    750.00,
    CURRENT_DATE + INTERVAL '1 day', '12:00:00', 'pickup',
    'pending', 'auto',
    '生日蛋糕，請寫「生日快樂 Mary」',
    v_test_user_id, NOW() - INTERVAL '6 hours', NOW()
  );
  
  -- 訂單 4: 後天的訂單
  v_order_4_id := gen_random_uuid();
  INSERT INTO orders (
    id, team_id, customer_id, order_number,
    customer_name, customer_phone,
    items, total_amount,
    pickup_date, pickup_time, delivery_method,
    status, source,
    created_by, confirmed_at, created_at, updated_at
  ) VALUES (
    v_order_4_id, v_test_team_id, v_customer_1_id,
    'ORD-' || TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'YYYYMMDD') || '-001',
    '王小明', '0912345678',
    '[{"name": "巴斯克蛋糕 6吋", "quantity": 2, "price": 450, "notes": ""}, {"name": "檸檬塔", "quantity": 2, "price": 120, "notes": ""}]'::jsonb,
    1140.00,
    CURRENT_DATE + INTERVAL '2 days', '14:00:00', 'pickup',
    'confirmed', 'manual',
    v_test_user_id, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '1 day', NOW()
  );
  
  -- 訂單 5: 昨天已完成的訂單
  v_order_5_id := gen_random_uuid();
  INSERT INTO orders (
    id, team_id, customer_id, order_number,
    customer_name, customer_phone,
    items, total_amount,
    pickup_date, pickup_time, delivery_method,
    status, source,
    created_by, confirmed_at, completed_at, created_at, updated_at
  ) VALUES (
    v_order_5_id, v_test_team_id, v_customer_2_id,
    'ORD-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '-001',
    '李小華', '0923456789',
    '[{"name": "草莓生乳捲", "quantity": 1, "price": 380, "notes": ""}]'::jsonb,
    380.00,
    CURRENT_DATE - INTERVAL '1 day', '16:00:00', 'pickup',
    'completed', 'auto',
    v_test_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days', NOW()
  );
  
  RAISE NOTICE '測試訂單已建立';
END $$;

-- ============================================
-- Step 8: 更新團隊統計資料
-- ============================================

DO $$
DECLARE
  v_test_team_id UUID;
  v_total_orders INT;
  v_total_revenue DECIMAL(10,2);
BEGIN
  -- 取得測試團隊 ID
  SELECT t.id INTO v_test_team_id
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  JOIN users u ON u.id = tm.user_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 計算統計資料
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_total_orders, v_total_revenue
  FROM orders
  WHERE team_id = v_test_team_id;
  
  -- 更新團隊統計
  UPDATE teams SET
    total_orders = v_total_orders,
    total_revenue = v_total_revenue,
    member_count = 1,
    updated_at = NOW()
  WHERE id = v_test_team_id;
  
  RAISE NOTICE '團隊統計已更新: % 筆訂單, $% 營收', v_total_orders, v_total_revenue;
END $$;

-- ============================================
-- Step 9: 驗證測試資料建立結果
-- ============================================

-- 查看測試用戶資訊
SELECT 
  u.id as user_id,
  u.line_user_id,
  u.line_display_name,
  u.auth_user_id,
  u.created_at
FROM users u
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';

-- 查看測試團隊資訊
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.slug,
  t.business_type,
  t.line_channel_id,
  t.subscription_status,
  t.trial_ends_at,
  t.total_orders,
  t.total_revenue,
  t.member_count
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';

-- 查看測試顧客
SELECT 
  c.name,
  c.phone,
  c.total_orders,
  c.total_spent,
  c.tags
FROM customers c
JOIN teams t ON t.id = c.team_id
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID'
ORDER BY c.created_at;

-- 查看測試商品
SELECT 
  p.name,
  p.price,
  p.category,
  p.stock,
  p.is_available
FROM products p
JOIN teams t ON t.id = p.team_id
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID'
ORDER BY p.sort_order;

-- 查看測試訂單
SELECT 
  o.order_number,
  o.customer_name,
  o.pickup_date,
  o.pickup_time,
  o.total_amount,
  o.status,
  o.source,
  o.created_at
FROM orders o
JOIN teams t ON t.id = o.team_id
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID'
ORDER BY o.pickup_date DESC, o.pickup_time DESC;

-- ============================================
-- 清理腳本（審核通過後可選擇執行）
-- ============================================

/*
-- ⚠️ 警告：此腳本會刪除所有測試資料！
-- 只在審核通過後，且確定不再需要測試帳號時執行

DO $$
DECLARE
  v_test_team_id UUID;
  v_test_user_id UUID;
BEGIN
  -- 取得測試團隊和用戶 ID
  SELECT u.id, t.id INTO v_test_user_id, v_test_team_id
  FROM users u
  JOIN team_members tm ON tm.user_id = u.id
  JOIN teams t ON t.id = tm.team_id
  WHERE u.line_user_id = 'TEST_REVIEWER_LINE_ID';
  
  -- 刪除順序（外鍵依賴關係）
  DELETE FROM reminders WHERE team_id = v_test_team_id;
  DELETE FROM line_messages WHERE team_id = v_test_team_id;
  DELETE FROM conversations WHERE team_id = v_test_team_id;
  DELETE FROM orders WHERE team_id = v_test_team_id;
  DELETE FROM products WHERE team_id = v_test_team_id;
  DELETE FROM customers WHERE team_id = v_test_team_id;
  DELETE FROM team_invites WHERE team_id = v_test_team_id;
  DELETE FROM team_settings WHERE team_id = v_test_team_id;
  DELETE FROM team_members WHERE team_id = v_test_team_id;
  DELETE FROM teams WHERE id = v_test_team_id;
  DELETE FROM users WHERE id = v_test_user_id;
  
  -- 注意：auth.users 需要在 Supabase Dashboard 手動刪除
  
  RAISE NOTICE '測試資料已清理完成';
END $$;
*/

-- ============================================
-- 完成！
-- ============================================
-- 接下來請執行以下步驟：
-- 1. 在 Supabase Dashboard 登入測試帳號取得 session tokens
-- 2. 將 tokens 填入 mobile/app/(auth)/login.tsx
-- 3. 測試登入功能
-- 4. 提交 App Store 審核
-- 5. 審核通過後，註解掉登入頁面的測試按鈕
-- ============================================

