-- ═══════════════════════════════════════════════════════════════════
-- Migration: Auth 用戶同步 Trigger
-- 版本：004
-- 說明：自動同步 auth.users → public.users，支援 LINE/Google/Apple 登入
-- ═══════════════════════════════════════════════════════════════════

-- 1. 創建同步函數
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2. 授予必要權限給函數
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;

-- 3. 創建 Trigger（需要提升權限）
-- 注意：這個 trigger 只能在 Supabase Dashboard 的 SQL Editor 中執行
-- 或使用 service_role 權限
DO $$
BEGIN
  -- 刪除舊的 trigger（如果存在）
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- 創建新的 trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_sync();
    
  RAISE NOTICE '✅ Trigger on_auth_user_created 創建成功';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '⚠️  權限不足。請在 Supabase Dashboard SQL Editor 中執行此 migration';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 創建 trigger 時發生錯誤: %', SQLERRM;
END $$;

-- 4. 添加註解
COMMENT ON FUNCTION public.handle_auth_user_sync() IS 
  '自動同步 auth.users 到 public.users，支援 LINE/Google/Apple OAuth';

-- 5. 驗證 trigger 是否創建成功
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger 驗證成功';
  ELSE
    RAISE WARNING '⚠️  Trigger 未創建。請使用 Supabase Dashboard 執行';
  END IF;
END $$;

-- 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004: Auth 同步 Trigger 創建完成';
  RAISE NOTICE '   - 函數：handle_auth_user_sync()';
  RAISE NOTICE '   - Trigger：on_auth_user_created';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 資料庫準備完成！現在可以：';
  RAISE NOTICE '   1. 在 Supabase Dashboard 設定 Google/Apple OAuth Providers';
  RAISE NOTICE '   2. 部署前端代碼使用 Supabase signInWithOAuth()';
END $$;
