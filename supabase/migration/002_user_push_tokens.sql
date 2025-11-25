-- user_push_tokens: stores Expo push tokens per user/device/team for notifications
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  expo_push_token text NOT NULL UNIQUE,
  platform text,
  device_id text,
  app_version text,
  project_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON public.user_push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_team ON public.user_push_tokens (team_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_status ON public.user_push_tokens (status);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_last_seen ON public.user_push_tokens (last_seen_at DESC);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy helper: match authenticated user to public.users.auth_user_id
-- so LINE/Apple 使用者都可透過 auth.uid() 驗證
CREATE POLICY user_push_tokens_select_own
  ON public.user_push_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_push_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY user_push_tokens_insert_own
  ON public.user_push_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_push_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY user_push_tokens_update_own
  ON public.user_push_tokens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_push_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_push_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY user_push_tokens_delete_own
  ON public.user_push_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_push_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  );
