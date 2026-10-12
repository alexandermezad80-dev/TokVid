-- Restore automatic Seamless identity after the earlier reversal.
-- Private email stays outside the public profile; no interests or forms required.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_username text;
  v_base text;
  v_full_name text;
  v_avatar text;
  v_attempt integer := 0;
BEGIN
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''), NULLIF(NEW.raw_user_meta_data->>'display_name', ''));
  v_avatar := COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', ''));
  v_base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''));
  v_username := COALESCE(left(v_base, 50), 'Usuario_TokVid_' || replace(NEW.id::text, '-', ''));

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (NEW.id, v_username, v_full_name, v_avatar)
      ON CONFLICT (id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Retry a username collision, including concurrent signups.
      v_attempt := v_attempt + 1;
      IF v_attempt > 10 THEN RAISE; END IF;
      v_username := 'Usuario_TokVid_' || replace(NEW.id::text, '-', '') || '_' || v_attempt::text;
    END;
  END LOOP;

  INSERT INTO public.profile_private (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('onboarding_completed', true, 'username', v_username,
      'display_name', COALESCE(v_full_name, v_username), 'avatar_url', v_avatar)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
