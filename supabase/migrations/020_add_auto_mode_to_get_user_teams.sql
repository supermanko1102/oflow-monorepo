-- Migration: 新增 auto_mode 到 get_user_teams 函數
-- 讓前端可以取得團隊的自動模式設定

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
  line_channel_id TEXT,
  auto_mode BOOLEAN  -- 新增：自動模式設定
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
    t.line_channel_id,
    t.auto_mode  -- 新增：返回自動模式設定
  FROM team_members tm
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id
    AND t.deleted_at IS NULL
  ORDER BY tm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

