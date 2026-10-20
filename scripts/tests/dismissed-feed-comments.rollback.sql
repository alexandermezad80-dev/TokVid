begin;
do $verify$
declare a uuid; b uuid; v uuid; fixture_root_id uuid; own_reply uuid; foreign_reply uuid; child_id uuid; before_count integer;
begin
  select id into a from public.profiles order by created_at limit 1;
  select id into b from public.profiles where id <> a order by created_at limit 1;
  if a is null or b is null then raise exception 'Two profiles required'; end if;
  insert into public.videos(user_id,video_url,caption) values(a,'https://example.invalid/rollback-only.mp4','personal deletion rollback test') returning id into v;
  if has_table_privilege('anon','public.dismissed_feed_comments','SELECT') or has_table_privilege('authenticated','public.dismissed_feed_comments','UPDATE,DELETE') then raise exception 'Unexpected grants'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  insert into public.comments(video_id,user_id,text) values(v::text,a,'root') returning id into fixture_root_id;
  insert into public.comments(video_id,user_id,text,parent_id) values(v::text,a,'own response',fixture_root_id) returning id into own_reply;
  perform set_config('request.jwt.claim.sub',b::text,true);
  insert into public.comments(video_id,user_id,text,parent_id) values(v::text,b,'other response',fixture_root_id) returning id into foreign_reply;
  insert into public.comments(video_id,user_id,text,parent_id) values(v::text,b,'child must survive',own_reply) returning id into child_id;
  perform set_config('request.jwt.claim.sub',a::text,true);
  select comments_count into before_count from public.videos where id=v;
  insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(a,v::text,own_reply);
  insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(a,v::text,own_reply) on conflict (user_id,comment_id) do nothing;
  if (select count(*) from public.dismissed_feed_comments where comment_id=own_reply) <> 1 then raise exception 'Personal deletion was not persisted/idempotent'; end if;
  if (select comments_count from public.videos where id=v) <> before_count then raise exception 'Personal deletion changed global counts'; end if;
  begin
    insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(a,v::text,foreign_reply);
    raise exception 'Foreign response accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(b,v::text,foreign_reply);
    raise exception 'Spoofed actor accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(a,'wrong-video',fixture_root_id);
    raise exception 'Wrong video accepted';
  exception when insufficient_privilege then null; end;
  insert into public.dismissed_feed_comments(user_id,video_id,comment_id) values(a,v::text,fixture_root_id);
  insert into public.hidden_feed_comment_threads(user_id,video_id,root_id) values(a,v::text,fixture_root_id);
  delete from public.hidden_feed_comment_threads where user_id=a and video_id=v::text;
  if (select count(*) from public.dismissed_feed_comments where video_id=v::text) <> 2 then raise exception 'Show hidden restored personal deletion'; end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  if exists(select 1 from public.dismissed_feed_comments where video_id=v::text) then raise exception 'Other actor sees private preferences'; end if;
  if (select count(*) from public.comments where video_id=v::text) <> 4 then raise exception 'Other actor lost comments'; end if;
  begin perform public.remove_feed_comment(own_reply); raise exception 'Foreign global deletion allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.remove_feed_comment(own_reply);
  if not exists(select 1 from public.comments where id=child_id and parent_id=fixture_root_id) or not exists(select 1 from public.comments where id=foreign_reply) then raise exception 'Individual global deletion lost other replies'; end if;
  if exists(select 1 from public.dismissed_feed_comments where comment_id=own_reply) then raise exception 'Removed response preference not cleaned'; end if;
  perform public.remove_feed_comment(fixture_root_id);
  if exists(select 1 from public.comments where video_id=v::text) or exists(select 1 from public.dismissed_feed_comments where video_id=v::text) then raise exception 'Root cascade failed'; end if;
end;
$verify$;
rollback;
select 'Personal deletion isolated, persistent, idempotent; author-only global deletion, reply preservation, cascade, counters and RLS passed. Rolled back.' as verification;
