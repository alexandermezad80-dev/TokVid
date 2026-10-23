# TOKVID — Regla autorizada: contenido eliminado por el propietario (bloque D3, APK 261)

**Decisión del propietario, 23 de octubre de 2026.** Si un autor elimina definitivamente una publicación, deja de estar disponible en las colecciones personales de terceros: Guardados, Me gusta y Compartidos. Si alguien abre una referencia anterior, mostrar «Este video ya no está disponible». En la siguiente lectura confirmada desaparecerá de las grillas, sin miniatura rota ni hueco. **Una falla de conexión NO demuestra eliminación**, por lo que no debe borrar referencias ni hacer desaparecer datos confirmados solo por un error.

## Auditoría del código real antes del cambio
- **Compartidos**: `video_share_events.video_id` tiene `REFERENCES public.videos(id) ON DELETE CASCADE` según migración existente. La UI usa `readProfileActivity` y vuelve a consultar publicaciones bajo RLS.
- **Me gusta**: el campo `video_likes.video_id` es texto, por compatibilidad con demos; su historial se resuelve mediante `readProfileActivity` + tabla `videos`, así que omite publicaciones que ya no retornan. El reproductor `liked-feed` recibe `videoId` y muestra ausencia, no video de otra posición.
- **Guardados**: `saved_videos.video_id` es texto (también placeholders). `resolveSavedVideos` consulta `videos` y solo muestra los registros existentes/accesibles. Si falla la consulta, arroja error y `loadSaved` conserva la última colección confirmada.
- **Publicación directa**: `app/publication.tsx` ya distingue una consulta exitosa sin fila de un error de consulta.
- **Defecto encontrado**: `saved-feed` solo recibía `startIndex`. Si un elemento anterior dejaba de existir entre el toque y la recarga, podía abrirse otro video del mismo índice. Y el perfil propio no hacía lectura adicional de Guardados al retomar foco desde la pantalla de publicación.

## Corrección de código aislada D3
1. El perfil envía tanto `startIndex` histórico como **`videoId`** al abrir un favorito; el reproductor elige por ID tras cargar desde el backend. Conserva compatibilidad con enlaces previos solo con índice.
2. Si el ID ya no está tras carga confirmada, **no monta el reproductor de otro video**: enseña el mensaje de indisponibilidad y Volver.
3. Un fallo de red muestra mensaje de conexión y botón Reintentar: nunca se interpreta como confirmación de eliminación.
4. El perfil refresca Guardados al obtener foco mientras esa sección está seleccionada; otros datos, Feed y pantallas quedan intactos.
5. Pruebas de ID estable después de eliminación de un ítem anterior, ausencia, fallo de red, contratos del jugador y fuentes existentes.

## Fuera de esta intervención
- NO eliminar filas de `saved_videos` o `video_likes` automáticamente: sin comprobación del backend no se puede distinguir borrado definitivo de invisibilidad por políticas o fallas transitorias. Esas referencias podrían requerir una limpieza posterior **autorizada** y auditada.
- NO hacer migraciones ni modificar Supabase en vivo. No tocar Auth/Registro, Feed, Workflows de Codex, branding, tamaño de video, posición de barra sticky, bordes, gradientes ni animación Like.
- Esta implementación asegura la filtración al volver a consultar. La desaparición instantánea mientras la pantalla permanece abierta **no está certificada**: exigiría notificación en tiempo real/eventos y pruebas físicas específicas antes de afirmar ese comportamiento.
- Prueba con 2 cuentas y video publicado/borrado real pendiente para APK final. Cualquier desenlace debe documentarse sin inventar respuesta del servidor.

Entrega con `[prepare only]`, sin APK. Auditoría GitHub CI + diff obligatoria.


## D4 — coherencia de icono Guardados (23 de octubre 2026)
`useSavedVideos` había conservado `savedIds` para videos cuyos registros `saved_videos` persistían aunque `videos` no devolviera la publicación. El nuevo filtro de IDs confirmados mantiene el bookmark coherente con la miniatura, y evita guardar en backend un video que ya no se puede resolver. Una falla de consulta sigue conservando la lista previa y nunca borra filas históricas. Véase `docs/TOKVID_OWNER_DELETED_SAVED_D4.md`. Prueba física y eventual limpieza de referencias backend pendientes.
