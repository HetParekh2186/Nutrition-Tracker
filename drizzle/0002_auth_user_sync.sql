-- Mirror each Supabase Auth user into public.users and give them empty
-- profile and preference rows. SECURITY DEFINER is needed because the auth
-- service role cannot write to public tables; the function lives in a
-- private schema that the Data API does not expose, and EXECUTE is revoked
-- from everyone except the trigger.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
--> statement-breakpoint
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.user_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.dietary_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function private.handle_new_user() from public, anon, authenticated;
--> statement-breakpoint
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
--> statement-breakpoint
-- Backfill anyone who signed up before this migration.
insert into public.users (id, email)
select id, email from auth.users where email is not null
on conflict (id) do nothing;
insert into public.user_profiles (user_id) select id from public.users
on conflict (user_id) do nothing;
insert into public.dietary_preferences (user_id) select id from public.users
on conflict (user_id) do nothing;
