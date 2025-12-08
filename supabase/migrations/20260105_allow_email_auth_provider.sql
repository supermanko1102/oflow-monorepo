-- Allow email/password (or other non-LINE/Apple) admin accounts by relaxing provider checks
-- Previous constraints only allowed line/apple + non-null IDs, causing admin user creation to fail.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS check_auth_provider,
  DROP CONSTRAINT IF EXISTS users_at_least_one_provider_id;

-- New provider check: allow line/apple/google with corresponding IDs, or email (no ID required).
ALTER TABLE public.users
  ADD CONSTRAINT check_auth_provider CHECK (
    (auth_provider = 'line' AND line_user_id IS NOT NULL) OR
    (auth_provider = 'apple' AND apple_user_id IS NOT NULL) OR
    (auth_provider = 'google' AND google_user_id IS NOT NULL) OR
    (auth_provider = 'email')
  );

-- At least one provider identifier unless it's an email provider.
ALTER TABLE public.users
  ADD CONSTRAINT users_at_least_one_provider_id CHECK (
    (line_user_id IS NOT NULL OR google_user_id IS NOT NULL OR apple_user_id IS NOT NULL)
    OR auth_provider = 'email'
  );

COMMENT ON CONSTRAINT check_auth_provider ON public.users IS 'line/apple/google require ID; email allowed without provider-specific ID';
COMMENT ON CONSTRAINT users_at_least_one_provider_id ON public.users IS 'Allow email users without provider IDs; others need at least one ID';
