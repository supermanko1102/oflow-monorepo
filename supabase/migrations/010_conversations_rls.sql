-- ═══════════════════════════════════════════════════════════════════
-- OFlow Conversations RLS 政策
-- 版本：v1.0
-- 建立日期：2025-10-26
-- 功能：為 conversations 表設定 Row Level Security 政策
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 啟用 Row Level Security
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────
-- 政策 1：團隊成員可以查看自己團隊的對話
-- ───────────────────────────────────────────────────────────────────
CREATE POLICY "team_members_can_view_own_conversations"
ON conversations FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- ───────────────────────────────────────────────────────────────────
-- 政策 2：Service Role 可以執行所有操作（供 Webhook 和 Functions 使用）
-- ───────────────────────────────────────────────────────────────────
CREATE POLICY "service_role_full_access"
ON conversations FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ───────────────────────────────────────────────────────────────────
-- 政策 3：禁止一般用戶直接插入、更新、刪除對話
-- 說明：對話只能透過 Edge Functions（使用 Service Role）操作
-- ───────────────────────────────────────────────────────────────────
-- 這部分已經由上面的 SELECT 政策和 Service Role 政策涵蓋
-- 沒有明確的 INSERT/UPDATE/DELETE 政策，表示一般用戶無法執行這些操作

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Conversations 表 RLS 政策設定完成！';
  RAISE NOTICE '✅ 已設定：';
  RAISE NOTICE '  - 團隊成員只能查看自己團隊的對話';
  RAISE NOTICE '  - Service Role 可以執行所有操作（Webhook 使用）';
  RAISE NOTICE '  - 一般用戶無法直接修改對話資料';
  RAISE NOTICE '✅ Conversations 表已受到保護！';
END $$;

