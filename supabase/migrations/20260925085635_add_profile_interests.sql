-- TOKVID: persiste los intereses seleccionados durante onboarding en profiles.
alter table public.profiles
  add column if not exists interests text[];