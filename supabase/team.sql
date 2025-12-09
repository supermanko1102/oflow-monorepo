create table public.teams (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text null,
  description text null,
  logo_url text null,
  line_channel_id text null,
  line_channel_secret text null,
  line_channel_access_token text null,
  line_channel_name text null,
  line_webhook_verified boolean null default false,
  line_connected_at timestamp with time zone null,
  subscription_status text null default 'trial'::text,
  subscription_plan text null default 'pro'::text,
  trial_started_at timestamp with time zone null,
  trial_ends_at timestamp with time zone null,
  subscription_started_at timestamp with time zone null,
  subscription_current_period_end timestamp with time zone null,
  revenuecat_customer_id text null,
  subscription_product_id text null,
  subscription_platform text null,
  auto_mode boolean null default false,
  ai_enabled boolean null default true,
  notification_enabled boolean null default true,
  timezone text null default 'Asia/Taipei'::text,
  business_type text null default 'bakery'::text,
  total_orders integer null default 0,
  total_revenue numeric(10, 2) null default 0,
  member_count integer null default 1,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  deleted_at timestamp with time zone null,
  line_bot_user_id text null,
  ai_daily_limit integer null default 100,
  ai_monthly_limit integer null default 2000,
  ai_rate_limit_per_minute integer null default 20,
  ai_enabled_until timestamp with time zone null,
  constraint teams_pkey primary key (id),
  constraint teams_line_channel_id_key unique (line_channel_id),
  constraint teams_slug_key unique (slug)
) TABLESPACE pg_default;

create index IF not exists idx_teams_line_channel_id on public.teams using btree (line_channel_id) TABLESPACE pg_default;

create index IF not exists idx_teams_subscription_status on public.teams using btree (subscription_status) TABLESPACE pg_default;

create index IF not exists idx_teams_slug on public.teams using btree (slug) TABLESPACE pg_default;

create index IF not exists idx_teams_deleted_at on public.teams using btree (deleted_at) TABLESPACE pg_default;

create index IF not exists idx_teams_line_bot_user_id on public.teams using btree (line_bot_user_id) TABLESPACE pg_default;

create index IF not exists idx_teams_business_type on public.teams using btree (business_type) TABLESPACE pg_default;

create trigger trigger_create_default_team_settings
after INSERT on teams for EACH row
execute FUNCTION create_default_team_settings ();

create trigger update_teams_updated_at BEFORE
update on teams for EACH row
execute FUNCTION update_updated_at_column ();