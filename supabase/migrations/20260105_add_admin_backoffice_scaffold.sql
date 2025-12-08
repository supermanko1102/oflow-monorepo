-- Admin / Backoffice scaffold
-- 1) admin_users table (who can operate with elevated scope)
-- 2) is_admin() helper
-- 3) Admin-bypass RLS policies for core tables

-- ================
-- Admin identities
-- ================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('support', 'ops', 'supervisor', 'owner')),
  scopes TEXT[] NOT NULL DEFAULT '{}', -- optional fine-grained scopes
  disabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS 'Backoffice/admin whitelist (mapped to Supabase auth_user_id)';
COMMENT ON COLUMN public.admin_users.auth_user_id IS 'Supabase Auth user id that is allowed to bypass tenant isolation';
COMMENT ON COLUMN public.admin_users.role IS 'Admin role: support/ops/supervisor/owner (for internal use only)';

CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON public.admin_users(auth_user_id);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ================
-- Helper function
-- ================
CREATE OR REPLACE FUNCTION public.is_admin(p_auth_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_auth_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.auth_user_id = p_auth_user_id
      AND COALESCE(au.disabled, FALSE) = FALSE
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin(UUID) IS 'Returns true when the current (or provided) auth_user_id is whitelisted as admin';

-- Allow admins to manage the admin_users table itself
CREATE POLICY "admin_manage_admin_users"
ON public.admin_users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =========================
-- Admin bypass for RLS data
-- =========================
-- For core tables we add an admin-only policy that bypasses tenant isolation.
-- service_role already bypasses RLS; this is for authenticated admin JWTs.

CREATE POLICY "admin_bypass_all_conversations"
ON public.conversations
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_customers"
ON public.customers
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_daily_revenue"
ON public.daily_revenue
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_line_messages"
ON public.line_messages
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_orders"
ON public.orders
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_products"
ON public.products
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_reminders"
ON public.reminders
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_subscription_transactions"
ON public.subscription_transactions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_team_invites"
ON public.team_invites
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_team_members"
ON public.team_members
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_team_settings"
ON public.team_settings
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_teams"
ON public.teams
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_user_push_tokens"
ON public.user_push_tokens
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_bypass_all_users"
ON public.users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- AI usage tables (added in previous migrations)
CREATE POLICY "admin_bypass_all_ai_usage_tracking"
ON public.ai_usage_tracking
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- When new tables are added, mirror this pattern if admins need cross-tenant access.
