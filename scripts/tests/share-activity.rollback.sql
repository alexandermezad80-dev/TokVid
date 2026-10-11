begin;
select set_config('tokvid.test.actor',(select id::text from public.profiles order by created_at limit 1),true);
select set_config('tokvid.test.recipient',(select id::text from public.profiles where id::text<>current_setting('tokvid.test.actor') order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('tokvid.test.recipient'),true);
set local role authenticated;
do $test$
declare a uuid:=current_setting('tokvid.test.actor')::uuid; b uuid:=auth.uid(); post uuid; event uuid:=gen_random_uuid(); n integer;
begin
 insert into public.videos(user_id,video_url,thumbnail_url,media_type,caption) values(b,'https://example.invalid/rollback.jpg','https://example.invalid/rollback.jpg','image','__rollback_share__') returning id into post;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.record_video_share(post,event);
 perform public.record_video_share(post,event);
 perform set_config('request.jwt.claim.sub',b::text,true);
 n:=(select count(*) from public.notifications where type='share' and data->>'videoId'=post::text and actor_id=a);
 if n<>1 then raise exception 'Share retry duplicated notification';end if;
 if not exists(select 1 from public.grouped_notifications where type='share' and actor_id=a and data->>'videoId'=post::text) then raise exception 'Share group missing';end if;
end $test$;
reset role;
select 'share activity: atomic count and notification with idempotent retry passed' result;
rollback;
