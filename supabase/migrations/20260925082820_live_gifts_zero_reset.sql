-- TOKVID: deja Gifts en cero para una reconstrucción posterior.
-- Solo elimina objetos exclusivos de Gifts; no toca el resto del LIVE.
alter publication supabase_realtime drop table public.live_gifts;

drop function if exists public.live_send_gift(uuid, uuid, text, integer);

drop table if exists public.live_gift_catalog;
drop table if exists public.live_gifts;
