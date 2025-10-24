-- ═══════════════════════════════════════════════════════════════════
-- 新增 Bot User ID 欄位
-- 解決 LINE Webhook destination 與 Channel ID 不一致的問題
-- 版本：v1.1
-- 建立日期：2025-10-24
-- ═══════════════════════════════════════════════════════════════════

-- 新增 line_bot_user_id 欄位
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS line_bot_user_id TEXT;

-- 建立索引（用於 Webhook 查詢）
CREATE INDEX IF NOT EXISTS idx_teams_line_bot_user_id 
ON teams(line_bot_user_id);

-- 註解
COMMENT ON COLUMN teams.line_bot_user_id IS 'LINE Bot User ID（U 開頭），用於 Webhook destination 比對';

-- 更新現有資料（如果有的話，將 line_channel_id 以 U 開頭的視為 Bot User ID）
UPDATE teams 
SET line_bot_user_id = line_channel_id
WHERE line_channel_id LIKE 'U%'
  AND line_bot_user_id IS NULL;

-- 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 已新增 line_bot_user_id 欄位';
  RAISE NOTICE '📝 line_channel_id: Channel ID（純數字，用於顯示）';
  RAISE NOTICE '📝 line_bot_user_id: Bot User ID（U 開頭，用於 Webhook）';
END $$;

