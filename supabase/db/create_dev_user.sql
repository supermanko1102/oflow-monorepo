-- Enable pgcrypto extension for password hashing
create extension if not exists "pgcrypto";

-- Function to create a dev user
create or replace function create_dev_user(email_input text)
returns void as $$
declare
  new_user_id uuid := gen_random_uuid();
  user_password text := 'Dev1234!';
  fake_line_id text := 'dev_line_' || replace(cast(gen_random_uuid() as text), '-', '');
begin
  -- Check if user already exists in auth.users
  if exists (select 1 from auth.users where email = email_input) then
    raise notice 'User with email % already exists', email_input;
    return;
  end if;

  -- Insert into auth.users
  -- We set the provider metadata to 'line' and provide a fake line_user_id
  -- This satisfies the check_auth_provider constraint which likely requires line_user_id to be present when provider is 'line'
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    email_input,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider": "line", "providers": ["email"]}',
    jsonb_build_object(
      'auth_provider', 'line', 
      'display_name', 'Dev User',
      'line_user_id', fake_line_id
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  raise notice 'User created: % / %', email_input, user_password;
end;
$$ language plpgsql;

-- Usage:
-- select create_dev_user('dev@oflow.com');
