# TOKVID — Bloque D: auditoría de refresco, contadores y favoritos (APK 261)

## Alcance
Trabajar únicamente en las fuentes de perfil y favoritos, sin tocar ni reconstruir el Feed, autenticación/Registro/Login, branding, UI aprobada, servicios del backend, RLS, migraciones ni los workflows de Codex. Todos los commits llevan `[prepare only]`.

## Hallazgos comprobados en código
1. **Refrescar perfiles:** el perfil propio llama `refreshProfile`, `connections.refresh` y `publications.refresh` y refresca Guardados/Me gusta/Compartidos/Borradores según la pestaña visible. El perfil ajeno llama `fetchProfile(false)`, `publications.refresh()`, `readProfileVisibility` y refresca su actividad pública visible. Ambos usan el `ProfilePullRefresh` protegido, no cambiar su sticky de 39dp ni gesto vertical.
2. **Contadores:** los números de seguidores/seguidos/likes del encabezado proceden del objeto `profile`, no de los placeholders de portada. La grilla de publicaciones proviene de `videos` y se refresca con Supabase. **No está demostrado con una lectura en vivo** que cada disparador/trígger de BD esté sincronizado: no atribuir una cifra real específica a esta auditoría.
3. **Me gusta:** `app/(tabs)/profile.tsx` lee `likedVideos` de `useVideoFeed`: son únicamente likes a videos del conjunto actualmente cargado en el Feed, mezclado con demos. Un video real al que se dio Like, pero no está en ese conjunto, puede faltar. La RPC de actividad `profile_activity_ids` y `readProfileActivity(...,"liked")` ya existen, pero conectar dicha RPC también al perfil propio exige coordinar el reproductor `/liked-feed` y la posición `startIndex` para NO mostrar otro video por error. **No se declara resuelto** este alcance hasta auditar la navegación conjunta; no introducir una grilla con navegación desalineada.
4. **Favoritos:** `useSavedVideos` distingue IDs demo ("1", "2"...) de IDs persistidos, los primeros provienen de `BASE_VIDEOS` y los reales se resuelven en tabla `videos`. El favorito realiza actualización optimista, pero revierte cuando Supabase rechaza la escritura; no se puede confirmar solo con código si un rechazo particular se debió a red, policy/RLS, o valor del ID. **No inventar un guardado persistido si la BD lo rechaza**.
5. El resolver previo de Guardados **ignoraba `error` al consultar la tabla `videos`**, pudiendo reemplazar una colección real por [] en falla de red. `loadSaved` carecía de `try/catch` y sus usos en efectos sin `catch` exponían rechazo no manejado. Un fallo durante `resolveSavedVideos` en `toggleSave` podía dejar el conjunto de IDs modificado aunque la vista no se actualizara.

## Corrección mínima implementada
- Solo `hooks/useSavedVideos.ts`: errores explícitos de consulta de archivos y lista guardados; conservar últimos datos confirmados si un `loadSaved` falla, evitar rechazo sin manejar de los efectos, estado `error` utilizable por sus consumidores (sin introducir cambios de UI en Feed).
- Impedir pulsaciones simultáneas de favoritos durante una escritura; invalidar cargas previas cuando comienza una operación. Mantener el cambio optimista original y asegurar rollback **tanto de `savedIds` como de `savedVideos`** ante rechazo o excepción.
- Conservar fuentes de demos y videos reales existentes; jamás guardar falsamente en el cliente una operación denegada por Supabase. No se cambia `toggleSave` API, rutas ni controles.
- Pruebas de regresión de resolver: demo, real, consulta fallida; contratos de errores y de refresco de perfiles/contadores.
- **No se cambió** el componente del Feed ni `useVideoFeed`, `useFeedVideoLikes`, `ProfilePullRefresh`, reproductores, `profile.tsx`, `user-profile.tsx`, ni su navegación.

## Pendientes reales (no ocultar)
- Caso concreto de placeholder cuyo favorito desaparece: identificar respuesta de Supabase/acción y persistencia desde cuenta real para distinguir falta de soporte backend de error transitorio. No hay evidencia suficiente para afirmar que el problema está resuelto.
- Likes históricos ausentes del Feed: auditar la fuente única de Me gusta para perfil y reproductor antes de modificar ambos. No se corrige tocando el Feed ya aprobado.
- Prueba física con dos cuentas y publicaciones reales: follower/following/likes/guardados, tasas de carga y respuesta tras volver a entrar. Ejecutar después en la APK conjunta.
- La CI automática **no sustituye** prueba de conexión Supabase en Android físico.

## Validación
Agregar `scripts/tests/profile-refresh-saved-d-audit.test.cjs`, ejecutar suite completa, TypeScript y Expo prebuild. Commit de preparación, cero workflow edits, ninguna APK.
