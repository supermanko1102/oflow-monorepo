-- 修改 get_user_teams 函數，加入 line_channel_id 欄位
-- 讓前端能夠判斷團隊是否已完成 LINE webhook 設定

-- 先刪除舊函數
DROP FUNCTION IF EXISTS get_user_teams(UUID);

-- 重新創建函數，包含 line_channel_id 欄位
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  role TEXT,
  member_count INT,
  order_count INT,
  subscription_status TEXT,
  line_channel_name TEXT,
  line_channel_id TEXT  -- 新增此欄位，用於判斷是否已完成 LINE 設定
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    tm.role,
    t.member_count,
    t.total_orders AS order_count,
    t.subscription_status,
    t.line_channel_name,
    t.line_channel_id  -- 新增此欄位
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  WHERE tm.user_id = p_user_id
    AND t.deleted_at IS NULL
  ORDER BY tm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_teams IS '取得用戶加入的所有團隊及相關資訊（包含 LINE 設定狀態）';

