-- ═══════════════════════════════════════════════════════════════════
-- 修復 create_order_from_ai 函數權限問題
-- 版本：v1.0
-- 建立日期：2025-10-27
-- 說明：授予正確的執行權限，確保 Edge Function 可以調用
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 授予執行權限給所有相關角色
-- ───────────────────────────────────────────────────────────────────

-- 授予 service_role（Edge Function 使用）
GRANT EXECUTE ON FUNCTION public.create_order_from_ai(
  UUID, TEXT, TEXT, JSONB, NUMERIC, UUID, TEXT, DATE, TIME,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) TO service_role;

-- 授予 authenticated（已登入用戶）
GRANT EXECUTE ON FUNCTION public.create_order_from_ai(
  UUID, TEXT, TEXT, JSONB, NUMERIC, UUID, TEXT, DATE, TIME,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) TO authenticated;

-- 授予 anon（匿名用戶，如果需要）
GRANT EXECUTE ON FUNCTION public.create_order_from_ai(
  UUID, TEXT, TEXT, JSONB, NUMERIC, UUID, TEXT, DATE, TIME,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) TO anon;

DO $$
BEGIN
  RAISE NOTICE '[Migration 017] ✅ 已授予執行權限給 service_role、authenticated、anon';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 設置 SECURITY DEFINER（確保函數在創建者權限下執行）
-- ───────────────────────────────────────────────────────────────────

ALTER FUNCTION public.create_order_from_ai(
  UUID, TEXT, TEXT, JSONB, NUMERIC, UUID, TEXT, DATE, TIME,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '[Migration 017] ✅ 已設置 SECURITY DEFINER';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 設置搜索路徑（安全性最佳實踐）
-- ───────────────────────────────────────────────────────────────────

ALTER FUNCTION public.create_order_from_ai(
  UUID, TEXT, TEXT, JSONB, NUMERIC, UUID, TEXT, DATE, TIME,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) SET search_path = public, pg_temp;

DO $$
BEGIN
  RAISE NOTICE '[Migration 017] ✅ 已設置 search_path';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 驗證權限設置
-- ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
  has_service_role_access BOOLEAN;
  is_security_definer BOOLEAN;
BEGIN
  -- 檢查 service_role 權限
  SELECT has_function_privilege(
    'service_role',
    'public.create_order_from_ai(uuid, text, text, jsonb, numeric, uuid, text, date, time without time zone, text, boolean, text, text, integer, text, text, uuid)',
    'EXECUTE'
  ) INTO has_service_role_access;
  
  -- 檢查 SECURITY DEFINER 設定
  SELECT prosecdef INTO is_security_definer
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'create_order_from_ai'
  AND n.nspname = 'public'
  LIMIT 1;
  
  IF has_service_role_access THEN
    RAISE NOTICE '[Migration 017] ✅ service_role 有執行權限';
  ELSE
    RAISE WARNING '[Migration 017] ⚠️  service_role 沒有執行權限';
  END IF;
  
  IF is_security_definer THEN
    RAISE NOTICE '[Migration 017] ✅ SECURITY DEFINER 已啟用';
  ELSE
    RAISE WARNING '[Migration 017] ⚠️  SECURITY DEFINER 未啟用';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Migration 017 完成！';
  RAISE NOTICE '✅ create_order_from_ai 函數權限已修復';
  RAISE NOTICE '✅ 已授予權限：service_role、authenticated、anon';
  RAISE NOTICE '✅ SECURITY DEFINER 已啟用';
  RAISE NOTICE '✅ search_path 已設置';
  RAISE NOTICE '';
  RAISE NOTICE '📋 下一步：重新部署 Edge Function';
  RAISE NOTICE '   supabase functions deploy line-webhook --no-verify-jwt';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

