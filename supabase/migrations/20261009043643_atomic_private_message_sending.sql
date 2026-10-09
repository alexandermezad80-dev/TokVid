-- Keep legacy clients' notification behavior; new clients send atomically via RPC.
drop trigger notify_private_message on public.messages;
drop function private.notify_private_message();
create function public.send_private_message(p_id uuid,p_conversation_id uuid,p_text text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); recipient uuid; author record; saved public.messages;
begin
 if actor is null or p_id is null or p_text is null or char_length(btrim(p_text))=0 or char_length(p_text)>1000 then
   raise exception 'Invalid message' using errcode='22023';
 end if;
 select case when user1_id=actor then user2_id else user1_id end into recipient
 from public.conversations where id=p_conversation_id;
 if recipient is null then raise exception 'Private conversation unavailable' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,1));
 select * into saved from public.messages where id=p_id;
 if found then
   if saved.sender_id<>actor or saved.conversation_id<>p_conversation_id or saved.text<>p_text or saved.deleted_at is not null then
     raise exception 'Message retry does not match' using errcode='42501';
   end if;
   return to_jsonb(saved);
 end if;
 insert into public.messages(id,conversation_id,sender_id,text) values(p_id,p_conversation_id,actor,p_text) returning * into saved;
 select username,avatar_url into author from public.profiles where id=actor;
 insert into public.notifications(user_id,actor_id,actor_name,actor_avatar,type,message,data)
 values(recipient,actor,author.username,author.avatar_url,'message','Te envió un mensaje',
 jsonb_build_object('conversationId',p_conversation_id,'messageId',p_id,'otherUserId',actor,'otherUsername',author.username,'otherAvatar',coalesce(author.avatar_url,'')));
 return to_jsonb(saved);
end $$;
revoke all on function public.send_private_message(uuid,uuid,text) from public,anon;
grant execute on function public.send_private_message(uuid,uuid,text) to authenticated;
