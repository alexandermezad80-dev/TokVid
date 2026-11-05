begin;
do $test$
declare actor uuid; recipient uuid; owner_id uuid; video uuid:=gen_random_uuid(); story uuid:=gen_random_uuid(); expired uuid:=gen_random_uuid(); event_id uuid:=gen_random_uuid(); second_event uuid:=gen_random_uuid(); story_event uuid:=gen_random_uuid(); received jsonb; n integer; denied boolean:=false;
begin
 select id into actor from public.profiles order by id limit 1;
 select id into recipient from public.profiles where id<>actor order by id limit 1;
 select id into owner_id from public.profiles where id not in (actor,recipient) order by id limit 1;
 if owner_id is null then raise exception 'Need three existing fixture accounts for rollback-only verification';end if;
 insert into public.videos(id,user_id,video_url,caption,media_type) values(video,owner_id,'https://example.invalid/tokvid-audit.mp4','Rollback verification','video');
 insert into public.stories(id,user_id,media_url,media_type,expires_at) values(story,actor,'https://example.invalid/tokvid-audit-story.jpg','image',now()+interval '1 hour'),(expired,owner_id,'https://example.invalid/tokvid-audit-expired.jpg','image',now()-interval '1 hour');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 set local role authenticated;
 received:=public.send_shared_content(event_id,recipient,'video',video,'Rollback-only video share');
 if received->>'id'<>event_id::text then raise exception 'Wrong delivery response';end if;
 perform public.send_shared_content(event_id,recipient,'video',video,'Rollback-only video share');
 select count(*) into n from public.messages where id=event_id;if n<>1 then raise exception 'Duplicate message';end if;
 select count(*) into n from public.profile_shared_content(actor,0) where content_id=video;if n<>1 then raise exception 'Missing/doubled reference';end if;
 begin perform public.send_shared_content(event_id,recipient,'story',story,'Rollback-only video share');exception when sqlstate '42501' then denied:=true;end;
 if not denied then raise exception 'Mismatched retry accepted';end if;
 if not public.remove_shared_reference('video',video) then raise exception 'Remove reference failed';end if;
 select count(*) into n from public.profile_shared_content(actor,0) where content_id=video;if n<>0 then raise exception 'Removed reference still visible';end if;
 if not exists(select 1 from public.videos where id=video) or not exists(select 1 from public.messages where id=event_id) then raise exception 'Original/message deleted with reference';end if;
 perform public.send_shared_content(second_event,recipient,'video',video,'Another intentional share');
 perform public.send_shared_content(story_event,recipient,'story',story,'Own story sent');
 select count(*) into n from public.profile_shared_content(actor,0) where content_id=story and kind='story';if n<>1 then raise exception 'Own story reference missing';end if;
 denied:=false;begin perform public.record_story_share(expired,gen_random_uuid());exception when sqlstate '42501' then denied:=true;end;
 if not denied then raise exception 'Expired story shared';end if;
 set local role postgres;
 -- Separate HTTP transactions have advancing now(); model that clock progression inside this rollback.
 update public.video_share_events set created_at=clock_timestamp()+interval '1 second' where id=second_event;
 select count(*) into n from public.notifications where user_id=recipient and data->>'messageId'=event_id::text;if n<>1 then raise exception 'Recipient activity duplicated/missing';end if;
 if not exists(select 1 from public.notifications where user_id=recipient and data->>'messageId'=event_id::text and data->>'videoId'=video::text and type='share') then raise exception 'Wrong video target';end if;
 if not exists(select 1 from public.notifications where user_id=recipient and data->>'storyId'=story::text and data->>'storyUserId'=actor::text) then raise exception 'Wrong story target';end if;
 select count(*) into n from public.notifications where user_id=owner_id and data->>'videoId'=video::text;if n<>2 then raise exception 'Creator activity changed';end if;
 set local role authenticated;
 select count(*) into n from public.profile_shared_content(actor,0) where content_id=video;if n<>1 then raise exception 'Intentional reshare did not restore one reference';end if;
 -- Another account cannot remove this sender's references.
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',recipient,'role','authenticated')::text,true);
 if public.remove_shared_reference('video',video) then raise exception 'Another user removed reference';end if;
 set local role postgres;
end $test$;
select 'passed: atomic delivery, idempotency, exact targets, own stories, expiry, reference removal, reshare, user isolation; transaction rolled back' as verification;
rollback;
