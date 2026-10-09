-- Ensure every Auth user receives the profile records required by onboarding.
-- This migration reconciles the live database: public.handle_new_user exists,
-- but auth.on_auth_user_created was absent.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_private (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Reconcile Auth users that already existed before the trigger was present.
INSERT INTO public.profiles (id, username)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profile_private (id, email)
SELECT u.id, u.email
FROM auth.users AS u
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();
