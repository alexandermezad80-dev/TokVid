create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_username text;
  v_base text;
  v_avatar text;
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'display_name', '')
  );

  v_avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  v_base := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', '')
  );

  if v_base is null then
    v_base := 'Usuario_TokVid_' || substr(md5(new.id::text || clock_timestamp()::text), 1, 6);
  end if;

  v_username := left(v_base, 50);

  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, v_username, v_full_name, v_avatar)
  on conflict (id) do update
    set username = coalesce(public.profiles.username, excluded.username),
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  insert into public.profile_private (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'onboarding_completed', true,
      'username', v_username,
      'display_name', coalesce(v_full_name, v_username),
      'avatar_url', v_avatar
    )
  where id = new.id;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
