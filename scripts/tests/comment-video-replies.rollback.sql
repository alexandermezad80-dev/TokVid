begin;
do $test$
declare
  actor uuid; other_actor uuid; original_video uuid; root_comment uuid; foreign_comment uuid; reply_video uuid;
  rejected boolean;
begin
  select id into actor from public.profiles order by created_at limit 1;
  select id into other_actor from public.profiles where id <> actor order by created_at limit 1;
  if actor is null or other_actor is null then raise exception 'Two existing profiles required'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  execute 'set local role authenticated';
  insert into public.videos(user_id,video_url,media_type,caption)
    values(actor,'https://example.invalid/comment-reply-audit.mp4','video','__comment_video_reply_rollback__') returning id into original_video;
  insert into public.comments(video_id,user_id,text)
    values(original_video::text,actor,'__comment_video_reply_rollback__') returning id into root_comment;
  perform set_config('request.jwt.claim.sub',other_actor::text,true);
  insert into public.comments(video_id,user_id,text,parent_id)
    values(original_video::text,other_actor,'__comment_video_reply_rollback__',root_comment) returning id into foreign_comment;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  insert into public.videos(user_id,video_url,media_type,reply_to_comment_id)
    values(actor,'https://example.invalid/comment-reply-audit.mp4','video',foreign_comment) returning id into reply_video;
  if (select reply_to_comment_id from public.videos where id=reply_video) is distinct from foreign_comment then raise exception 'Link to foreign comment lost'; end if;
  rejected := false;
  begin
    insert into public.videos(user_id,video_url,media_type,reply_to_comment_id)
      values(actor,'https://example.invalid/comment-reply-audit.jpg','image',foreign_comment);
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Image accepted as video reply'; end if;
  rejected := false;
  begin
    insert into public.videos(user_id,video_url,media_type,reply_to_comment_id)
      values(actor,'https://example.invalid/comment-reply-audit.mp4','video',gen_random_uuid());
  exception when foreign_key_violation then rejected := true; end;
  if not rejected then raise exception 'Missing comment accepted'; end if;
  rejected := false;
  begin
    insert into public.videos(user_id,video_url,media_type,reply_to_comment_id)
      values(other_actor,'https://example.invalid/comment-reply-audit.mp4','video',foreign_comment);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Foreign publication ownership accepted'; end if;
  perform public.remove_feed_comment(root_comment);
  if exists(select 1 from public.comments where id in (root_comment,foreign_comment)) then raise exception 'Existing root cascade broken'; end if;
  if not exists(select 1 from public.videos where id=reply_video and reply_to_comment_id is null) then raise exception 'Reply video lost or dangling link survived'; end if;
end $test$;
reset role;
rollback;
