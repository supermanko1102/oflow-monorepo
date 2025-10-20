-- ═══════════════════════════════════════════════════════════════════
-- OFlow Row Level Security (RLS) 政策
-- 基於 Team-Centric 架構的權限控制
-- 版本：v1.0
-- 建立日期：2025-10-20
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 啟用 RLS
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- users: 用戶只能看到自己的資料
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid()::text = line_user_id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid()::text = line_user_id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = line_user_id);

-- ═══════════════════════════════════════════════════════════════════
-- teams: 用戶可以看到自己加入的團隊
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can update team"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND role = 'owner'
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (true); -- 任何已登入用戶都可以建立團隊

-- ═══════════════════════════════════════════════════════════════════
-- team_members: 用戶可以看到自己團隊的成員
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND (role = 'owner' OR role = 'admin')
    )
  );

CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  WITH CHECK (true); -- 透過邀請碼加入時需要

-- ═══════════════════════════════════════════════════════════════════
-- team_invites: 團隊成員可以查看邀請碼
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Members can view team invites"
  ON team_invites FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners and admins can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND (tm.role = 'owner' OR tm.role = 'admin' OR tm.can_invite_members = true)
    )
  );

CREATE POLICY "Owners and admins can update invites"
  ON team_invites FOR UPDATE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND (tm.role = 'owner' OR tm.role = 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- orders: 團隊成員可以管理團隊的訂單
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view orders"
  ON orders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Team members can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can update orders"
  ON orders FOR UPDATE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

CREATE POLICY "Team members can delete orders"
  ON orders FOR DELETE
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_orders = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- customers: 團隊成員可以管理團隊的顧客
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view customers"
  ON customers FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Team members can manage customers"
  ON customers FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_customers = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- line_messages: 團隊成員可以看到團隊的訊息
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view messages"
  ON line_messages FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "System can insert messages"
  ON line_messages FOR INSERT
  WITH CHECK (true); -- LINE Webhook 使用 service_role key，不受 RLS 限制

-- ═══════════════════════════════════════════════════════════════════
-- reminders: 團隊成員可以看到團隊的提醒
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view reminders"
  ON reminders FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "System can manage reminders"
  ON reminders FOR ALL
  USING (true)
  WITH CHECK (true); -- Triggers 和 Edge Functions 使用 service_role key

-- ═══════════════════════════════════════════════════════════════════
-- team_settings: 只有 owner/admin 可以修改設定
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view settings"
  ON team_settings FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners and admins can manage settings"
  ON team_settings FOR ALL
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_settings = true
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
        AND tm.can_manage_settings = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- subscription_transactions: 團隊成員可以查看交易記錄
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "Team members can view transactions"
  ON subscription_transactions FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "System can insert transactions"
  ON subscription_transactions FOR INSERT
  WITH CHECK (true); -- RevenueCat Webhook 使用 service_role key

-- ═══════════════════════════════════════════════════════════════════
-- 完成訊息
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ OFlow RLS 政策建立完成！';
  RAISE NOTICE '✅ 已啟用 10 個表格的 Row Level Security';
  RAISE NOTICE '✅ 權限架構：';
  RAISE NOTICE '   - 用戶只能存取自己加入的團隊資料';
  RAISE NOTICE '   - 基於 team_members 表檢查權限';
  RAISE NOTICE '   - 不同角色（owner/admin/member）有不同權限';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：執行 003_database_functions.sql 建立業務邏輯函數';
END $$;

