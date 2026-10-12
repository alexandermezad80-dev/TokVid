begin;
select set_config('tokvid.test.actor',(select id::text from public.profiles order by created_at limit 1),true);
select set_config('tokvid.test.recipient',(select id::text from public.profiles where id::text<>current_setting('tokvid.test.actor') order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('tokvid.test.actor'),true);
set local role authenticated;
do $test$
declare a uuid:=auth.uid(); b uuid:=current_setting('tokvid.test.recipient')::uuid; room uuid; other_room uuid; msg uuid:=gen_random_uuid(); object_path text; denied boolean;
begin
 insert into public.conversations(user1_id,user2_id) values(a,b) returning id into room;
 insert into public.conversations(user1_id,user2_id) values(a,b) returning id into other_room;
 object_path:=room::text||'/'||a::text||'/__rollback_only_metadata.jpg';
 insert into storage.objects(bucket_id,name,owner_id) values('chat-media',object_path,a::text);
 perform set_config('request.jwt.claim.sub',b::text,true);
 if exists(select 1 from storage.objects where bucket_id='chat-media' and name=object_path) then raise exception 'Unsent attachment exposed';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.send_private_message_v2(msg,room,'__private_photo__',null,false,jsonb_build_object('path',object_path,'kind','image','mime','image/jpeg'));
 denied:=false;begin perform public.send_private_message_v2(gen_random_uuid(),other_room,'__wrong_room__',null,false,jsonb_build_object('path',object_path,'kind','image','mime','image/jpeg'));exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Attachment shared to wrong conversation';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if not exists(select 1 from storage.objects where bucket_id='chat-media' and name=object_path) then raise exception 'Recipient cannot access sent attachment';end if;
 perform public.remove_private_messages(room,array[msg],false);
 if exists(select 1 from storage.objects where bucket_id='chat-media' and name=object_path) then raise exception 'Hidden attachment still signable by recipient';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if exists(select 1 from storage.objects where bucket_id='chat-media' and name=object_path) then raise exception 'Outsider sees private attachment';end if;
end $test$;
reset role;
select 'private media: pending upload, correct conversation, participant access, hidden visibility and outsider denial passed' result;
rollback;
