-- ═══════════════════════════════════════════════════════════════════
-- 建立團隊相關函數
-- 版本：v1.1
-- 建立日期：2025-10-23
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 建立團隊並自動加入擁有者
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_team_with_owner(
  p_user_id UUID,
  p_team_name TEXT,
  p_line_channel_id TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT 'bakery'
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  invite_code TEXT
) AS $$
DECLARE
  v_team_id UUID;
  v_slug TEXT;
  v_invite_code TEXT;
BEGIN
  -- 生成 slug（簡化版，將空格轉為短橫線，轉小寫）
  v_slug := LOWER(REGEXP_REPLACE(p_team_name, '\s+', '-', 'g'));
  
  -- 確保 slug 唯一（如果重複，加上隨機後綴）
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
  END LOOP;

  -- 建立團隊
  INSERT INTO teams (
    name, 
    slug, 
    line_channel_id, 
    business_type,
    subscription_status,
    trial_started_at,
    trial_ends_at
  )
  VALUES (
    p_team_name,
    v_slug,
    p_line_channel_id,
    p_business_type,
    'trial',
    NOW(),
    NOW() + INTERVAL '3 days'
  )
  RETURNING id INTO v_team_id;

  -- 將建立者加入為 owner
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    can_manage_orders,
    can_manage_customers,
    can_manage_settings,
    can_view_analytics,
    can_invite_members
  )
  VALUES (
    v_team_id,
    p_user_id,
    'owner',
    true,
    true,
    true,
    true,
    true
  );

  -- 生成邀請碼
  v_invite_code := generate_invite_code(v_slug);
  
  -- 建立預設邀請碼
  INSERT INTO team_invites (
    team_id,
    invite_code,
    invited_by,
    role,
    is_active
  )
  VALUES (
    v_team_id,
    v_invite_code,
    p_user_id,
    'member',
    true
  );

  -- 回傳團隊資訊
  RETURN QUERY
  SELECT 
    v_team_id,
    p_team_name,
    v_slug,
    v_invite_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_team_with_owner IS '建立團隊並自動加入擁有者，返回團隊資訊和邀請碼';

-- ───────────────────────────────────────────────────────────────────
-- 離開團隊
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION leave_team(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_role TEXT;
  v_owner_count INT;
BEGIN
  -- 檢查成員是否存在
  SELECT role INTO v_member_role
  FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  IF v_member_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- 如果是 owner，檢查是否還有其他 owner
  IF v_member_role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM team_members
    WHERE team_id = p_team_id AND role = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot leave team: You are the only owner. Transfer ownership or delete the team.';
    END IF;
  END IF;

  -- 移除成員
  DELETE FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  -- 更新團隊成員數
  UPDATE teams
  SET member_count = member_count - 1
  WHERE id = p_team_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION leave_team IS '離開團隊，如果是唯一 owner 則無法離開';

-- ───────────────────────────────────────────────────────────────────
-- 取得團隊成員列表
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_team_members(p_team_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  user_name TEXT,
  user_picture_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ,
  can_manage_orders BOOLEAN,
  can_manage_customers BOOLEAN,
  can_manage_settings BOOLEAN,
  can_view_analytics BOOLEAN,
  can_invite_members BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.user_id,
    u.line_display_name AS user_name,
    u.line_picture_url AS user_picture_url,
    tm.role,
    tm.joined_at,
    tm.can_manage_orders,
    tm.can_manage_customers,
    tm.can_manage_settings,
    tm.can_view_analytics,
    tm.can_invite_members
  FROM team_members tm
  JOIN users u ON u.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_team_members IS '取得團隊的所有成員列表';

-- ───────────────────────────────────────────────────────────────────
-- 取得或建立團隊邀請碼
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_invite_code(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_invite_code TEXT;
  v_team_slug TEXT;
BEGIN
  -- 檢查用戶是否有權限
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id 
      AND user_id = p_user_id
      AND (role IN ('owner', 'admin') OR can_invite_members = true)
  ) THEN
    RAISE EXCEPTION 'User does not have permission to generate invite codes';
  END IF;

  -- 查找現有的活躍邀請碼
  SELECT invite_code INTO v_invite_code
  FROM team_invites
  WHERE team_id = p_team_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR uses_count < max_uses)
  ORDER BY created_at DESC
  LIMIT 1;

  -- 如果沒有，建立新的
  IF v_invite_code IS NULL THEN
    SELECT slug INTO v_team_slug FROM teams WHERE id = p_team_id;
    v_invite_code := generate_invite_code(v_team_slug);
    
    INSERT INTO team_invites (
      team_id,
      invite_code,
      invited_by,
      role,
      is_active
    )
    VALUES (
      p_team_id,
      v_invite_code,
      p_user_id,
      'member',
      true
    );
  END IF;

  RETURN v_invite_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_invite_code IS '取得或建立團隊邀請碼（需要權限）';

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '✅ 團隊建立函數已建立！';
  RAISE NOTICE '✅ 新增函數：';
  RAISE NOTICE '  - create_team_with_owner(user_id, team_name, ...)';
  RAISE NOTICE '  - leave_team(team_id, user_id)';
  RAISE NOTICE '  - get_team_members(team_id)';
  RAISE NOTICE '  - get_or_create_invite_code(team_id, user_id)';
END $$;

