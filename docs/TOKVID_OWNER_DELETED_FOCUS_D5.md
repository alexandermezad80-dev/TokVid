# TOKVID — D5: revalidar referencias al recuperar foco (23 octubre 2026)

## Regla aprobada
Video eliminado por su dueño deja de verse en **Guardados, Me gusta y Compartidos** después de una consulta confirmada; enlaces viejos muestran «Este video ya no está disponible». Una falla de Internet, de RPC o RLS NO se interpreta como prueba de borrado. Nunca abrir otro video por índice si el video solicitado desapareció.

## Hallazgos previos
- Los bloques D3 y D4 ya implementaron filtrado de Guardados, bookmark coherente con IDs accesibles, posición anclada a videoId, estados de indisponibilidad versus error y refresco al recuperar foco del perfil propio.
- `readProfileActivity` ya resuelve Me gusta y Compartidos contra publicaciones reales; sus hooks se reactivan al obtener foco. Compartidos mantiene FK `ON DELETE CASCADE`.
- La pantalla directa `app/publication.tsx` consultaba al montar/cambiar ID o pulsar Reintentar, pero **no** al volver a ella tras visitar otra pantalla. Por tanto podía retener una publicación borrada por el dueño mientras el usuario estaba en otra pantalla.
- `app/saved-feed.tsx` leía Guardados inicialmente, pero no volvía a comprobar la lista tras regresar de un perfil o chat abierto desde su reproductor.

## Corrección mínima D5
- Cambiar la lectura de `app/publication.tsx` desde `useEffect` a `useFocusEffect(useCallback(...))` con las **mismas dependencias** `[id,retry,closeComments]` y guardia de cancelación `active`. Al retornar consulta `videos` otra vez: sin fila confirmada → aviso; error → «No pudimos cargar la publicación» y Reintentar. Al recuperar foco deja de mostrar el medio cargado anteriormente hasta revalidar. No modificar la eliminación, los comentarios ni el reproductor.
- En `app/saved-feed.tsx`, recargar mediante el `refreshSaved` existente al retomar foco; se mantienen los estados de carga/error y selección por `videoId` que ya protegen de reproducir el video equivocado. No tocar su aspecto ni controles.
- `Me gusta` y `Compartidos` ya usan `useFocusEffect`; no duplicar cambios. Ninguna modificación a Auth, Feed, servicios, Supabase, migraciones, branding o workflows.

## Límites verificables
- No se garantiza desaparición instantánea **mientras la pantalla permanece abierta**, sin un evento de backend; esta intervención confirma al volver a enfocarla. Se requieren pruebas Android reales con dos cuentas para confirmar borrado/restauración, errores de conectividad y recarga del reproductor.
- No borrar filas históricas o archivos de otros usuarios. La limpieza del servidor requiere nueva auditoría/autorización específica.
- Un intento fallido preserva la distinción entre una publicación confirmadamente inaccesible y un fallo de consulta.
- Commit `[prepare only]` con regresiones, TypeScript y configuración Android; no APK hasta la entrega conjunta.
