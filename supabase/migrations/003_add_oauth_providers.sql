-- ═══════════════════════════════════════════════════════════════════
-- Migration: 添加 OAuth Provider 支援
-- 版本：003
-- 說明：為 users 表添加 Google/Apple OAuth 欄位，準備使用 Supabase Provider
-- ═══════════════════════════════════════════════════════════════════

-- 1. 添加新欄位到 users 表
ALTER TABLE users
  -- OAuth Provider IDs
  ADD COLUMN IF NOT EXISTS google_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS apple_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
  
  -- Provider 資訊
  ADD COLUMN IF NOT EXISTS auth_provider TEXT; -- 'line', 'google', 'apple'

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id);
CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users(apple_user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- 3. 添加註解
COMMENT ON COLUMN users.google_user_id IS 'Google OAuth User ID（從 Supabase Auth 同步）';
COMMENT ON COLUMN users.apple_user_id IS 'Apple OAuth User ID（從 Supabase Auth 同步）';
COMMENT ON COLUMN users.auth_user_id IS '連結到 auth.users 的 ID';
COMMENT ON COLUMN users.auth_provider IS '登入方式：line, google, apple';

-- 4. 更新現有的 line_user_id 約束（如果需要）
-- 讓 line_user_id 可以為 NULL（因為 Google/Apple 用戶可能沒有 LINE ID）
ALTER TABLE users ALTER COLUMN line_user_id DROP NOT NULL;

-- 5. 添加檢查約束：至少要有一個 provider ID
ALTER TABLE users
  ADD CONSTRAINT users_at_least_one_provider_id
  CHECK (
    line_user_id IS NOT NULL OR
    google_user_id IS NOT NULL OR
    apple_user_id IS NOT NULL
  );

-- 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003: OAuth Provider 欄位添加完成';
  RAISE NOTICE '   - 已添加 google_user_id, apple_user_id, auth_user_id';
  RAISE NOTICE '   - 已創建相關索引';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：執行 004_auth_sync_trigger.sql 創建自動同步機制';
END $$;
