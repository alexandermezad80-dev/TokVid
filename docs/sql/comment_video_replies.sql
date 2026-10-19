-- Optional link: ordinary publications and the approved comment delete rules stay intact.
alter table public.videos add column reply_to_comment_id uuid
  references public.comments(id) on delete set null;
create index videos_reply_to_comment_id_idx on public.videos(reply_to_comment_id);
alter table public.videos add constraint videos_comment_reply_is_video
  check (reply_to_comment_id is null or media_type = 'video');

create function tokvid_internal.validate_comment_video_reply()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.reply_to_comment_id is not null then
    perform 1 from public.comments
      where id = new.reply_to_comment_id and deleted_at is null;
    if not found then
      raise exception 'El comentario original ya no está disponible.' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function tokvid_internal.validate_comment_video_reply() from public, anon, authenticated;
create trigger validate_comment_video_reply before insert on public.videos
  for each row execute function tokvid_internal.validate_comment_video_reply();
comment on column public.videos.reply_to_comment_id is
  'Original feed comment for a video reply. Null on ordinary posts or after the original comment is deleted.';
notify pgrst, 'reload schema';
