-- ═══════════════════════════════════════════════════════════════════
-- 診斷 create_order_from_ai 函數狀態
-- 版本：v1.0
-- 建立日期：2025-10-27
-- 說明：檢查函數是否存在、參數簽名、權限設定
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 檢查 1: 函數是否存在及數量
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  func_count INTEGER;
  func_record RECORD;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '[診斷] 開始檢查 create_order_from_ai 函數';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  
  -- 計算函數數量
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'create_order_from_ai'
  AND n.nspname = 'public';
  
  RAISE NOTICE '[診斷] 找到 % 個 create_order_from_ai 函數', func_count;
  
  IF func_count = 0 THEN
    RAISE NOTICE '[診斷] ❌ 函數不存在！';
  ELSIF func_count > 1 THEN
    RAISE NOTICE '[診斷] ⚠️  檢測到多個函數重載版本！';
  ELSE
    RAISE NOTICE '[診斷] ✅ 函數存在（唯一版本）';
  END IF;
  
  RAISE NOTICE '────────────────────────────────────────────────────────────';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 檢查 2: 函數詳細資訊（參數、所有者、安全設定）
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '[診斷] 函數詳細資訊：';
  RAISE NOTICE '────────────────────────────────────────────────────────────';
  
  FOR func_record IN
    SELECT 
      p.oid,
      p.proname AS function_name,
      pg_get_function_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS return_type,
      p.pronargs AS arg_count,
      p.prosecdef AS is_security_definer,
      pg_catalog.pg_get_userbyid(p.proowner) AS owner,
      p.proacl AS acl
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_order_from_ai'
    AND n.nspname = 'public'
  LOOP
    RAISE NOTICE '[診斷] 函數名稱: %', func_record.function_name;
    RAISE NOTICE '[診斷] 參數數量: %', func_record.arg_count;
    RAISE NOTICE '[診斷] 返回類型: %', func_record.return_type;
    RAISE NOTICE '[診斷] 所有者: %', func_record.owner;
    RAISE NOTICE '[診斷] SECURITY DEFINER: %', func_record.is_security_definer;
    RAISE NOTICE '[診斷] 權限 (ACL): %', func_record.acl;
    RAISE NOTICE '[診斷] 參數簽名:';
    RAISE NOTICE '%', func_record.arguments;
    RAISE NOTICE '────────────────────────────────────────────────────────────';
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 檢查 3: 檢查特定角色的執行權限
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_anon_access BOOLEAN;
  has_authenticated_access BOOLEAN;
  has_service_role_access BOOLEAN;
BEGIN
  RAISE NOTICE '[診斷] 檢查角色權限：';
  RAISE NOTICE '────────────────────────────────────────────────────────────';
  
  -- 檢查 anon 角色
  SELECT has_function_privilege('anon', 'public.create_order_from_ai(uuid, text, text, jsonb, numeric, uuid, text, date, time without time zone, text, boolean, text, text, integer, text, text, uuid)', 'EXECUTE')
  INTO has_anon_access;
  RAISE NOTICE '[診斷] anon 角色執行權限: %', COALESCE(has_anon_access::text, '無法檢查');
  
  -- 檢查 authenticated 角色
  SELECT has_function_privilege('authenticated', 'public.create_order_from_ai(uuid, text, text, jsonb, numeric, uuid, text, date, time without time zone, text, boolean, text, text, integer, text, text, uuid)', 'EXECUTE')
  INTO has_authenticated_access;
  RAISE NOTICE '[診斷] authenticated 角色執行權限: %', COALESCE(has_authenticated_access::text, '無法檢查');
  
  -- 檢查 service_role 角色
  SELECT has_function_privilege('service_role', 'public.create_order_from_ai(uuid, text, text, jsonb, numeric, uuid, text, date, time without time zone, text, boolean, text, text, integer, text, text, uuid)', 'EXECUTE')
  INTO has_service_role_access;
  RAISE NOTICE '[診斷] service_role 角色執行權限: %', COALESCE(has_service_role_access::text, '無法檢查');
  
  RAISE NOTICE '────────────────────────────────────────────────────────────';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 檢查 4: 列出所有參數名稱和類型
-- ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  func_oid OID;
  param_record RECORD;
  param_num INTEGER := 1;
BEGIN
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'create_order_from_ai'
  AND n.nspname = 'public'
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    RAISE NOTICE '[診斷] 函數參數列表（按順序）：';
    RAISE NOTICE '────────────────────────────────────────────────────────────';
    
    FOR param_record IN
      SELECT 
        unnest(proargnames) AS param_name,
        unnest(proargtypes::regtype[]::text[]) AS param_type
      FROM pg_proc
      WHERE oid = func_oid
    LOOP
      RAISE NOTICE '[診斷]   %: % %', param_num, param_record.param_name, param_record.param_type;
      param_num := param_num + 1;
    END LOOP;
  END IF;
  
  RAISE NOTICE '────────────────────────────────────────────────────────────';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 診斷總結
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '[診斷] 診斷完成！';
  RAISE NOTICE '[診斷] 請檢查上述輸出，特別注意：';
  RAISE NOTICE '[診斷]   1. 函數是否存在且唯一';
  RAISE NOTICE '[診斷]   2. 參數順序和類型是否正確';
  RAISE NOTICE '[診斷]   3. service_role 是否有執行權限';
  RAISE NOTICE '[診斷]   4. SECURITY DEFINER 設定';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

