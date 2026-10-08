begin;
select set_config('request.jwt.claim.sub', (select id::text from public.profiles order by created_at limit 1), true);
set local role authenticated;
do $test$
declare actor uuid := auth.uid(); post_id uuid; removed uuid; invalid_rejected boolean := false; spoof_rejected boolean := false;
begin
  if actor is null then raise exception 'No test account available'; end if;
  insert into public.videos(user_id,video_url,thumbnail_url,media_type,caption)
    values(actor,'https://example.invalid/tokvid-rollback.jpg','https://example.invalid/tokvid-rollback.jpg','image','__tokvid_publication_rollback__') returning id into post_id;
  if not exists(select 1 from public.videos where id=post_id and user_id=actor and media_type='image') then raise exception 'Own photo was not visible'; end if;
  begin
    insert into public.videos(user_id,video_url,media_type) values(gen_random_uuid(),'https://example.invalid/spoof.mp4','video');
  exception when insufficient_privilege then spoof_rejected := true;
  end;
  if not spoof_rejected then raise exception 'Foreign owner was accepted'; end if;
  begin
    insert into public.videos(user_id,video_url,media_type) values(actor,'https://example.invalid/bad','unsupported');
  exception when check_violation then invalid_rejected := true;
  end;
  if not invalid_rejected then raise exception 'Invalid media type was accepted'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  delete from public.videos where id=post_id returning id into removed;
  if removed is not null then raise exception 'Foreign account deleted publication'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  delete from public.videos where id=post_id returning id into removed;
  if removed is distinct from post_id then raise exception 'Owner could not delete publication'; end if;
end $test$;
reset role;
rollback;
