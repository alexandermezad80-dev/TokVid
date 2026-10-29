# TokVid — auditoría del contador de favoritos, APK 313

Fecha: 28 de octubre de 2026. Estado: **solo lectura; pendiente autorización para corregir**.

Rama remota comprobada: `feature/feed-mini-video-avatar`, HEAD `97ae3a3436477638a1c624f2eb5ce8b4fe984214` (APK 313). Continúan vigentes las restricciones de la auditoría anterior: no implementar, no generar APK, no publicar commits, no modificar datos/configuración ni la interfaz o el refresco del Feed. Se conserva la aprobación del usuario de lo que funciona.

## Hallazgos confirmados

1. **El canal no recibe los cambios que espera.** `artifacts/mobile/hooks/useVideoSaveCount.ts:8` escucha `postgres_changes`, evento UPDATE, tabla pública `videos`, filtrando por ID. Las consultas a `pg_publication` y `pg_publication_tables` del proyecto Supabase TokVid confirmaron que `supabase_realtime` existe y permite UPDATE, pero tiene `all_tables=false` y no incluye `videos`. Tampoco está incluida `saved_videos`. Para la suscripción actual la tabla necesaria es `videos`: no es necesario publicar indiscriminadamente la relación privada de favoritos.

2. **El contador de servidor se actualiza dentro de la escritura.** El trigger habilitado `saved_video_activity` corre AFTER INSERT OR DELETE de `saved_videos`. Incrementa/decrementa `videos.saves_count` en la misma transacción; no utiliza una tarea diferida ni un temporizador. El agregado de la publicación real existente coincidió al consultar: 1 guardado, sin diferencia con sus relaciones. Esta comprobación del estado actual no demuestra la latencia de red ni todos los casos de concurrencia.

3. **La respuesta visual del icono y la del número están separadas.** `VideoActions.tsx:57,146–160` dibuja el relleno con `isSaved`, pero el texto usa exclusivamente `useVideoSaveCount`. `toggleSave` no comunica al contador un cambio local inmediato ni solicita una reconciliación al completar la escritura. Aunque cambie el relleno, el número puede permanecer antiguo hasta otra lectura, montaje o reconexión del canal.

4. **La escritura espera lecturas innecesariamente amplias.** En `useSavedVideos.ts:90–118`, cada guardar/quitar espera `auth.getUser()`, cambia el estado local de IDs y después resuelve toda la colección resultante. Cuando hay favoritos reales, eso consulta sus publicaciones y posteriormente sus autores (`mapRowsToVideoItems`); solo entonces hace el INSERT/DELETE del favorito. El paso de autores no es necesario para escribir el cambio de un único video. La validación de que la publicación existe y es accesible sí debe conservarse, sin confundir un fallo de red con un borrado.

5. **Incluso con Realtime habilitado hay un viaje de red adicional.** El hook ignora los valores del evento y ejecuta un nuevo SELECT a `videos` por cada UPDATE. No contiene control de secuencia entre respuestas de esas lecturas: una respuesta antigua podría sobrescribir una más reciente. Solo contempla el estado SUBSCRIBED; no implementa una reconciliación explícita al guardar ni tratamiento visible de un canal fallido. Son riesgos confirmados por el código, no fallos reproducidos físicamente en este turno.

6. **En los demos no se trata de demora.** `useVideoSaveCount.ts:6` deja el contador en cero y sale cuando el ID no es UUID. Los demos `1`–`6` sí pueden resolverse como favoritos en `useSavedVideos`, pero no tienen fila real en `videos` donde mantener `saves_count`. La consulta actual encontró 3 relaciones con esos IDs. El número de esos demos no se corregirá simplemente habilitando Realtime; su tratamiento debe definirse explícitamente sin inventar un conteo remoto.

7. **La lista y la confirmación también necesitan conservar sus protecciones.** `useSavedVideos` tiene estado por instancia, sin una caché compartida ni una suscripción a cambios de guardados. Perfil y reproductor de Guardados recargan al ganar foco; otras instancias pueden seguir con su estado anterior. Hay protección contra toques concurrentes y reversión ante errores. El DELETE comprueba `error`, pero no verifica la fila eliminada mediante respuesta; una futura corrección no debe presentar una eliminación bloqueada por permisos como éxito.

## Qué explican estos hallazgos

El síntoma puede parecer una actualización muy lenta, pero para publicaciones reales el mecanismo actual de notificación no está conectado en el servidor. El dato puede haberse guardado mientras el contador visible permanece viejo. Antes de guardar también se acumulan esperas de red. En demos, el contador permanece en cero por una condición expresa del cliente.

No se midieron milisegundos ni se realizó una prueba en Motorola G05. No se guardó ni quitó ningún favorito para probar: toda la inspección de Supabase utilizó SELECT. No se atribuye la demora a la potencia del teléfono ni se declara que la red esté funcionando bien o mal sin medición.

## Corrección propuesta, todavía no aplicada

- Dar respuesta local inmediata al icono y al contador (+1 al guardar, −1 al quitar), usando un valor conocido y controlando cambios pendientes; reconciliar con el servidor y revertir ante fallo. Si el valor base aún es desconocido, no inventarlo como cero.
- Reducir el trabajo anterior a la escritura: actuar sobre el video objetivo y actualizar la colección existente; conservar autenticación, permisos, verificación de disponibilidad, bloqueo de operaciones duplicadas y comportamiento ante errores.
- Habilitar de forma acotada los eventos necesarios de `videos`, con revisión previa de permisos y de sus otros consumidores. La configuración del backend requiere autorización: no forma parte de cambiar únicamente una animación del perfil.
- Usar los valores confirmados del evento cuando sean suficientes, evitando un SELECT por cada aviso; mantener una lectura de reconciliación al terminar la escritura y al recuperar conexión, con control de respuestas antiguas. No sumar dos veces la respuesta optimista y la confirmación remota.
- Coordinar los consumidores del estado de favoritos sin cambiar su diseño ni la navegación. La lógica está compartida por Feed, `/publication`, Guardados, Me gusta, etiquetas y perfil; una corrección necesitaría autorizar expresamente ese alcance funcional. El refresco automático/manual del Feed no necesita modificarse.
- Verificar guardar y quitar, cambios de otra cuenta, dos pantallas del mismo usuario, doble toque, respuesta tardía, fallo de escritura, reconexión, publicación eliminada y demo. Conservar las protecciones de no mostrar publicaciones eliminadas ni vaciar listas por fallos de red.

Archivos principales: `hooks/useSavedVideos.ts`, `hooks/useVideoSaveCount.ts`; posible coordinación local específica de favoritos y cambio acotado de publicación Realtime. `VideoActions.tsx` se inspeccionó como consumidor; no se propone cambiar su iconografía, tipografía, posiciones, dimensiones o animaciones. Tampoco se propone cambiar el generador compartido `lib/realtimeSubscriptions.ts` por este hallazgo.

## Nota adicional para la auditoría pendiente de Compartidos

Al seguir los consumidores de favoritos se identificaron otras dos rutas: `app/saved-feed.tsx:57–75` y `app/liked-feed.tsx:70–87` llaman únicamente a `increment_video_share_count`, no a `record_video_share`. Pueden incrementar el total de envíos sin crear el evento que alimenta Compartidos. Se suma al defecto de `/publication` ya documentado, sin implementar ninguna corrección en esos reproductores.

## Conservación

Solo se creó este informe fuera del árbol fuente. Código, datos, tablas, publicaciones Realtime, workflows, rama y APK permanecen sin cambios. La corrección del contador queda propuesta; no está implementada ni físicamente verificada.
