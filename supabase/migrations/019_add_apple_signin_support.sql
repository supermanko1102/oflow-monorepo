-- ═══════════════════════════════════════════════════════════════════
-- OFlow Apple Sign In 支援
-- 版本：v1.2
-- 建立日期：2025-11-07
-- 說明：新增 Apple Sign In 支援，允許多種登入方式
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. 修改 users 表，支援多登入方式
-- ───────────────────────────────────────────────────────────────────

-- 1.1 將 line_user_id 改為 NULLABLE（保留 UNIQUE）
-- 原本是 NOT NULL，改為允許 NULL（Apple 用戶不會有 LINE ID）
ALTER TABLE users ALTER COLUMN line_user_id DROP NOT NULL;

-- 1.2 新增 Apple Sign In 欄位
-- apple_user_id 來自 Apple ID Token 的 'sub' claim
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id TEXT UNIQUE;

-- 1.3 新增登入方式識別欄位
-- 用於標記用戶使用的登入方式
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'line';

-- 1.4 新增約束：確保至少有一種登入方式
-- LINE 用戶必須有 line_user_id，Apple 用戶必須有 apple_user_id
ALTER TABLE users ADD CONSTRAINT check_auth_provider 
  CHECK (
    (auth_provider = 'line' AND line_user_id IS NOT NULL) OR
    (auth_provider = 'apple' AND apple_user_id IS NOT NULL)
  );

-- ───────────────────────────────────────────────────────────────────
-- 2. 索引優化
-- ───────────────────────────────────────────────────────────────────

-- 2.1 為 apple_user_id 建立索引（用於登入查詢）
CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users(apple_user_id);

-- 2.2 為 auth_provider 建立索引（用於統計查詢）
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- ───────────────────────────────────────────────────────────────────
-- 3. 註解
-- ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN users.apple_user_id IS 'Apple Sign In User ID (sub from ID Token)';
COMMENT ON COLUMN users.auth_provider IS '登入方式：line | apple';

-- ───────────────────────────────────────────────────────────────────
-- 4. 完成訊息
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ Apple Sign In 支援已啟用！';
  RAISE NOTICE '✅ users.line_user_id 已改為 NULLABLE';
  RAISE NOTICE '✅ users.apple_user_id 欄位已新增';
  RAISE NOTICE '✅ users.auth_provider 欄位已新增（預設值：line）';
  RAISE NOTICE '✅ 約束條件已新增：確保至少有一種登入方式';
  RAISE NOTICE '✅ 索引已建立：idx_users_apple_user_id, idx_users_auth_provider';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒：';
  RAISE NOTICE '   - 現有 LINE 用戶不受影響（auth_provider 預設為 line）';
  RAISE NOTICE '   - Apple 用戶和 LINE 用戶為獨立帳號（不綁定）';
  RAISE NOTICE '   - RLS 政策不需修改（仍透過 auth_user_id 運作）';
  RAISE NOTICE '   - 需要部署 auth-apple-callback Edge Function';
END $$;

