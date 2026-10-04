begin;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id = 'avatars';

update storage.buckets
set file_size_limit = 262144000,
    allowed_mime_types = array['video/mp4','video/quicktime']::text[]
where id = 'videos';

commit;
