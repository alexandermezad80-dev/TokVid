ALTER FUNCTION public.update_follow_counts() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM authenticated;
