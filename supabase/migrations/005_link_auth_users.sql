-- ═══════════════════════════════════════════════════════════════════
-- 連結 Supabase Auth 與 Public Users
-- 版本：v1.1
-- 建立日期：2025-10-23
-- 說明：新增 auth_user_id 欄位，讓 RLS policies 可以使用 auth.uid()
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. 在 users 表新增 auth_user_id 欄位
-- ───────────────────────────────────────────────────────────────────

-- 新增欄位（允許 NULL，因為現有使用者可能還沒有 auth_user_id）
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 建立外鍵約束（關聯到 auth.users）
ALTER TABLE users 
  ADD CONSTRAINT fk_users_auth_user_id 
  FOREIGN KEY (auth_user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 建立唯一索引（一個 auth user 只能對應一個 public user）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- 註解
COMMENT ON COLUMN users.auth_user_id IS 'Supabase Auth User ID（關聯到 auth.users）';

-- ───────────────────────────────────────────────────────────────────
-- 2. 更新 RLS Policies - users 表
-- ───────────────────────────────────────────────────────────────────

-- 刪除舊的 policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- 建立新的 policies（使用 auth_user_id）
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────
-- 3. 更新 RLS Policies - teams 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view their teams" ON teams;
DROP POLICY IF EXISTS "Owners can update team" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;

CREATE POLICY "Members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Owners can update team"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND role = 'owner'
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (true); -- 任何已登入用戶都可以建立團隊

-- ───────────────────────────────────────────────────────────────────
-- 4. 更新 RLS Policies - team_members 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view team members" ON team_members;
DROP POLICY IF EXISTS "Owners can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams" ON team_members;

CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND (role = 'owner' OR role = 'admin')
    )
  );

CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  WITH CHECK (true); -- 透過邀請碼加入時需要

-- ───────────────────────────────────────────────────────────────────
-- 5. 更新 RLS Policies - team_invites 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view team invites" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can create invites" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can update invites" ON team_invites;

CREATE POLICY "Members can view team invites"
  ON team_invites FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Owners and admins can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND (tm.role = 'owner' OR tm.role = 'admin' OR tm.can_invite_members = true)
    )
  );

CREATE POLICY "Owners and admins can update invites"
  ON team_invites FOR UPDATE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND (tm.role = 'owner' OR tm.role = 'admin')
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 6. 更新 RLS Policies - orders 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view orders" ON orders;
DROP POLICY IF EXISTS "Team members can insert orders" ON orders;
DROP POLICY IF EXISTS "Team members can update orders" ON orders;
DROP POLICY IF EXISTS "Team members can delete orders" ON orders;

CREATE POLICY "Team members can view orders"
  ON orders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can update orders"
  ON orders FOR UPDATE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can delete orders"
  ON orders FOR DELETE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_orders = true
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 7. 更新 RLS Policies - customers 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view customers" ON customers;
DROP POLICY IF EXISTS "Team members can manage customers" ON customers;

CREATE POLICY "Team members can view customers"
  ON customers FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can manage customers"
  ON customers FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_customers = true
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 8. 更新 RLS Policies - line_messages 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view messages" ON line_messages;

CREATE POLICY "Team members can view messages"
  ON line_messages FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 9. 更新 RLS Policies - reminders 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view reminders" ON reminders;

CREATE POLICY "Team members can view reminders"
  ON reminders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 10. 更新 RLS Policies - team_settings 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view settings" ON team_settings;
DROP POLICY IF EXISTS "Owners and admins can manage settings" ON team_settings;

CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Owners and admins can manage settings"
  ON team_settings FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_settings = true
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND tm.can_manage_settings = true
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 11. 更新 RLS Policies - subscription_transactions 表
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Team members can view transactions" ON subscription_transactions;

CREATE POLICY "Team members can view transactions"
  ON subscription_transactions FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- ───────────────────────────────────────────────────────────────────
-- 完成訊息
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies 更新完成！';
  RAISE NOTICE '✅ 所有 policies 現在使用 auth.uid() 進行驗證';
  RAISE NOTICE '✅ auth_user_id 欄位已新增至 users 表';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒：';
  RAISE NOTICE '   - 現有使用者需要重新登入以建立 auth_user_id 關聯';
  RAISE NOTICE '   - 確保 Edge Function 已部署並正確設定環境變數';
  RAISE NOTICE '   - 測試 RLS 是否正確運作';
END $$;

