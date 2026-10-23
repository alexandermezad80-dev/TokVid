# TOKVID — D2: Me gusta históricos reales, sin alterar Feed ni UI de perfil

## Problema demostrado
`profile.tsx` y `liked-feed.tsx` usaban `useVideoFeed().likedVideos`. Ese conjunto solo incluye videos actualmente descargados en ese Feed, no necesariamente todos los IDs en `video_likes`. Por tanto la grilla podía omitir publicaciones reales ya marcadas. La RPC existente `profile_activity_ids(userId,"liked",offset)` recupera los eventos persistidos, bajo Auth/RLS, y `readProfileActivity` obtiene sus publicaciones verificables.

## Reparación aislada
- `hooks/useProfileLikedHistory.ts` consulta la RPC existente en páginas de **60 eventos**, filtra publicaciones mediante `readProfileActivity` y permite refrescar o cargar más; protege las consultas tardías con una secuencia.
- Una función pura comparte el orden de publicaciones reales entre la grilla `Me gusta` y el reproductor `/liked-feed`. Los placeholders previamente marcados se mantienen, **sin presentar como contenido real videos de prueba**.
- El perfil sigue con exactamente seis iconos, sticky 39 dp, tres columnas, mismos estilos, bordes, pulsaciones y navegación. Se agrega `Ver más` solo cuando la RPC declara más eventos; sin inventar un resultado. El gesto de refresco invoca también la consulta real.
- Para navegar al reproductor, se envía además `videoId` del elemento pulsado; la pantalla espera y ubica ese ID en el historial paginado antes de montar el reproductor. Si ya no se encuentra, avisa y da la opción de volver, en vez de reproducir un video equivocado. Las rutas anteriores solo con `startIndex` siguen siendo válidas.
- `liked-feed.tsx` conserva `VideoCard`, comentarios, compartir, guardar, seguir, favoritos y navegación. Solo cambia su **fuente de lista** y la resolución inicial. No se tocan `VideoCard`, `useVideoFeed`, el Feed principal, SDK Auth, servicios del backend o políticas RLS.

## Validación y cautelas
La consulta remota es verificable por código y pruebas de contrato; no se prueba en Supabase real ni con dedos hasta la APK conjunta. La paginación usa 60 eventos del servidor, no cuenta de thumbnails visibles; datos protegidos por RLS no se exponen. El orden puede cambiar si el usuario retira un Me gusta mientras navega, pero el ID de entrada evita abrir un elemento ajeno.

**El problema de favorito demo revertido sigue pendiente de observar con una respuesta real de Supabase**: no inventar la causa de un rechazo. Conteos en vivo de seguidores y publicaciones necesitan prueba de dos cuentas; no se alteran desencadenadores/migraciones.

Preparar con `[prepare only]`, CI de regresiones/TypeScript/configuración Android, **sin nueva APK**. Registro/Login, Feed y workflows Codex permanecen protegidos.
