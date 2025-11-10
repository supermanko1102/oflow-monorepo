-- ───────────────────────────────────────────────────────────────────
-- Migration: 新增對話輪數追蹤
-- Date: 2025-11-10
-- Description: 在 conversations 表中新增 turn_count 欄位，用於追蹤對話輪數，避免無限對話
-- ───────────────────────────────────────────────────────────────────

-- 新增 turn_count 欄位
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS turn_count INT DEFAULT 0;

-- 新增索引（用於查詢超過特定輪數的對話）
CREATE INDEX IF NOT EXISTS idx_conversations_turn_count ON conversations(turn_count);

-- 註解
COMMENT ON COLUMN conversations.turn_count IS 'AI 回覆的次數（對話輪數），用於限制對話輪數避免無限對話';

-- 更新現有對話的 turn_count（設為 0）
UPDATE conversations SET turn_count = 0 WHERE turn_count IS NULL;

