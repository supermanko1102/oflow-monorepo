-- Fix recursive RLS on team_members that breaks Realtime
-- Root cause: policy "Owners can manage team members" referenced team_members itself,
-- which triggers infinite recursion in Realtime apply_rls.

DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;

CREATE OR REPLACE FUNCTION public.can_manage_team_members(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
SET row_security TO off
AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = current_app_user_id()
      and (tm.role in ('owner', 'admin') or tm.can_invite_members = true)
  );
$$;

CREATE POLICY "Owners can manage team members" ON public.team_members
  USING (public.can_manage_team_members(team_id))
  WITH CHECK (public.can_manage_team_members(team_id));
