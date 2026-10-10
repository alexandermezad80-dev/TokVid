begin;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.increment_video_share_count(uuid) from public, anon;
revoke execute on function public.sync_video_comments_count() from public, anon, authenticated;
revoke execute on function public.update_video_like_counts() from public, anon, authenticated;

grant execute on function public.increment_video_share_count(uuid) to authenticated;

commit;
