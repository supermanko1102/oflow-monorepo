-- Add system flag to team_invites for first-time merchant/CS onboarding
alter table public.team_invites
  add column if not exists is_system boolean not null default false;

comment on column public.team_invites.is_system is 'System invite code flag (reserved for merchant/CS onboarding)';

-- Speed up lookups by team/role/is_system
create index if not exists idx_team_invites_team_role_system
  on public.team_invites (team_id, role, is_system);
