-- ═══════════════════════════════════════════════════════════════════
-- 團隊刪除功能（硬刪除）
-- 版本：v1.0
-- 建立日期：2025-10-27
-- 說明：只有 owner 可以刪除團隊，刪除後永久移除，無法復原
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 刪除團隊（硬刪除，永久移除）
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_team(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_team IS '刪除團隊（硬刪除），只有 owner 可執行，資料永久移除無法復原';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ 團隊刪除功能已建立！';
  RAISE NOTICE '✅ 已建立函數：';
  RAISE NOTICE '  - delete_team(team_id, user_id) - 硬刪除團隊';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  注意：刪除為永久性操作，無法復原！';
END $$;

