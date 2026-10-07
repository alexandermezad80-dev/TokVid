# TokVid — estado y continuidad entre sesiones

**Cierre:** 7 de octubre de 2026 (UTC). **Última entrega funcional:** APK #204.

Este documento permite retomar sin depender del historial del chat. El usuario pidió documentar todo y conservar lo terminado salvo que necesite una actualización. Las instrucciones posteriores del usuario prevalecen sobre este registro.

## 1. Regla de conservación y forma de trabajar

> «Lo que está hecho no se toca a no ser que necesite una actualización».

No rehacer el diseño, reemplazar flujos o volver a resolver decisiones aceptadas por iniciativa estética del agente. Para una actualización necesaria, explicar el problema y el alcance, respetar la autorización existente, aplicar un cambio puntual y registrar su validación. Si el usuario pide esperar antes de implementar, esperar. No solicitar de nuevo permisos para lo ya autorizado.

La APK #204 está implementada, comprobada automáticamente y entregada. **El usuario todavía no ha confirmado sus cuatro cambios en el teléfono.** Conservar esa distinción. La petición posterior a la entrega fue exclusivamente documentar y dejar continuidad; no pidió modificar nuevamente la app.

## 2. Fuente de verdad y ubicación

| Elemento | Referencia |
| --- | --- |
| Repositorio | `alexandermezad80-dev/TokVid` |
| Rama vigente | `feature/feed-mini-video-avatar` |
| Código de APK #204 | `a6e14783bbaede25f5f756f24250b7b62d9a85f0` |
| Árbol de ese código | `3f52efddcc93abfd4aaaca0a0b68cd2a1ba4d9f1` |
| Primer commit de los cuatro cambios | `619974503e9b3e0a7bfa4cd5a1e01d771871db36` |
| Base de diagnóstico | `883a3a423067a8add632117c752cb8ea971ab0c7`, rama `diagnostics/google-return` |
| Base anterior de comentarios aprobados | `61cd8a9ad83256848d674de28f7c6df38ddc7fc0`, rama `feature/onboarding-profile-interests` |
| Proyecto Supabase | `kvbppgofblldwnkkoscb` |
| Aplicación móvil | `artifacts/mobile` (Expo / React Native) |
| Documento maestro | [TOKVID_MASTER_REQUIREMENTS.md](../requirements/TOKVID_MASTER_REQUIREMENTS.md) |

Los cambios funcionales de esta entrega están en la rama vigente. No se afirma que se hayan fusionado a `main` o a la rama anterior. Verificar las referencias remotas si se retoma más adelante; no sobrescribir avances posteriores. Un commit documental posterior no cambia el commit incorporado en la APK #204.

## 3. Estado de los bloques de esta sesión

| Bloque | Estado vigente | Próxima comprobación |
| --- | --- | --- |
| Márgenes, encabezado glass y menús de comentarios | Implementados; el usuario aprobó el aspecto de las capturas previas | Conservar el diseño al revisar #204 |
| Editar/eliminar comentarios y respuestas; moderación | Implementado y probado en cliente/SQL en la etapa anterior | Regresión física con dos cuentas si el usuario observa un problema |
| Error 403 del workflow de Auth | Resuelto y verificado en `Supabase migrations #192`, intento 2 | No recrear tokens ni tratarlo como bloqueo vigente |
| Registro con correo y OTP de ocho dígitos | El usuario confirmó que funcionaba | Conservar; no estaba solicitado cambiarlo |
| Excepción al regresar de Google | Causa identificada con APK #202 y corregida en #204 | Repetir Google en el teléfono sin necesitar Try Again |
| Video pequeño vertical al comentar/escribir | Implementado y probado automáticamente en #204 | Imagen, sonido, teclado y restauración en Android real |
| + con gradiente bajo el avatar del creador | Implementado para el feed autenticado en #204 | Probar con otro creador que aún no se sigue |
| Elegir y guardar foto de perfil | Implementado y probado automáticamente en #204 | Guardar, reabrir perfil y reiniciar app |
| Documentación de continuidad | Guardada en la rama vigente con esta actualización | Leer este documento al comenzar otra sesión |

## 4. Decisiones de comentarios que deben conservarse

### Diseño aprobado

- Panel de ancho completo del teléfono, con padding interior y áreas seguras; evitar volver al panel estrecho con márgenes exteriores grandes.
- Mantener el contador de comentarios con identidad TOKVID y la franja de encabezado a todo lo ancho, cian/magenta suaves y aspecto de cristal translúcido.
- La referencia es la **tab bar inferior** (Inicio, Amigos, Crear, Mensajes, Perfil). El modal se presenta por encima, deja verla a través de la banda translúcida y bloquea sus botones mientras está abierto.
- Las acciones son una burbuja/popover junto al comentario seleccionado, preferentemente encima, con ajuste seguro y scroll si falta espacio. No convertirlas en un menú inferior. El usuario dijo expresamente que le gustaba cómo se veía; son transitorias y desaparecen después de actuar o cancelar.
- Mantener las respuestas, el indicador «Respondiendo» y la conservación del borrador. El popover se cierra al tocar fuera/Atrás, cambiar de contexto o desaparecer el comentario.
- La nueva petición de video vertical pequeño sustituye, **en el feed con comentarios abiertos**, el efecto anterior de escala 0.95 y video completo difuminado. No restaurar ese efecto basándose en una nota histórica del maestro.

### Autoría, edición y eliminación

| Situación | Comportamiento aprobado |
| --- | --- |
| Mi comentario principal, incluso en publicación ajena | Puedo editarlo y eliminarlo |
| Mi respuesta a otro comentario | Puedo editarla y eliminarla individualmente |
| Eliminar un principal con respuestas | Elimina el hilo completo para todos, incluidas sus respuestas |
| Eliminar una respuesta | Elimina esa respuesta; conserva las demás. Si tenía respuestas hijas, el servidor las enlaza al padre anterior |
| Dueño de la publicación | Puede moderar eliminando comentarios/hilos en su publicación; no puede editar texto ajeno |
| Otro usuario sin autoría ni propiedad | No obtiene permisos de edición o eliminación ajenos |
| «Ocultar hilo para mí» | Preferencia privada de esa cuenta; no equivale a eliminar el hilo público |
| Cancelar | Cierra las opciones sin aplicar la acción |

La definición final de cascada reemplaza la propuesta antigua de dejar «Comentario eliminado» con respuestas al borrar un principal. La RPC nueva es `remove_feed_comment`; la antigua se conserva para clientes cuyo diálogo describía la política anterior. No cambiar silenciosamente ese contrato.

Migración de referencia: `20261007170821_coherent_comment_thread_deletion_and_moderation`. Se verificó en una transacción revertida mediante `scripts/tests/coherent-comment-actions.rollback.sql`. No se borraron datos existentes al desplegarla. Las preferencias personales de ocultación están protegidas por RLS; no deben difundirse como eventos públicos de Realtime.

## 5. Auth: distinguir los dos errores ya investigados

### 403 de GitHub Actions

Era un rechazo de la Management API al leer configuración de Auth; los pasos de migración de base podían pasar antes de ese error. Se usa un token dedicado en el **repository secret** `SUPABASE_AUTH_ACCESS_TOKEN`, con **Auth Config: Read-write** y **Project Settings: Read-write**, limitado a TokVid y dentro de los permisos reales de su titular. GET requiere `auth_config_read`; PATCH requiere `auth_config_write` y `project_admin_write`.

Las migraciones conservan su credencial `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`. El token dedicado de Auth es distinto de las claves públicas/de servicio del proyecto. No almacenar sus valores en documentos ni incorporarlo a la APK. No volver a crear tokens por el posterior error de renderizado del feed.

Verificación: [Supabase migrations #192](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37658368476), **intento 2, success**, commit `01004bc55c59a738923c644912b70f11f2d7faca`. Se verificaron OTP de ocho dígitos, redirect móvil y plantillas. Detalles: [operación del workflow de Auth](../operations/supabase-auth-workflow.md).

### «Something went wrong» al regresar de Google

El usuario confirmó que **Try Again entraba con su cuenta** y autorizó una APK de diagnóstico. El reporte `TOKVID_AUTH_DIAGNOSTICS_V1` de la compilación `883a3a423067a8add632117c752cb8ea971ab0c7` mostró:

```text
cannot add `postgres_changes` callbacks for realtime:feed-comment-counts after `subscribe()`.
```

La secuencia registró `auth.session.present`, `callback.session.ready`, `callback.navigate` y `google.session.ready` antes de `app.render.error`. La sesión de Google se había establecido. El fallo observado ocurrió en los efectos de `FeedScreen`, al reutilizar un canal ya suscrito.

El mapa de fuentes de esa APK identificó `@supabase/realtime-js@2.107.0/RealtimeChannel.js` y `hooks/useFeedCommentCounts.ts`. Se reprodujo el guard real de la librería con limpieza tardía/reconexión de efectos. La corrección asigna un canal nuevo **en cada ejecución del efecto**, con limpieza de su propia instancia; no basta con un identificador fijo por componente.

Se aplicó a contadores de comentarios, panel de comentarios, likes del feed, notificaciones globales y llamadas entrantes. Los callbacks de suscripciones retiradas se descartan. No extender mecánicamente esta técnica a canales compartidos de Broadcast/Presence, cuya identidad puede ser necesaria para comunicar participantes.

La instrumentación permanece disponible en #204. Si hay otro error, capturar **Ver diagnóstico → Compartir informe** antes de Try Again. Usar el mapa de fuentes del mismo commit, nunca el de otra APK. La confirmación física de la corrección en #204 sigue pendiente.

## 6. Video pequeño, seguir y avatar: comportamiento implementado

### Video al abrir comentarios

- El mismo `VideoPlayer` y el mismo `VideoView` se mantienen montados. No se añade otro VideoView para el mismo reproductor: Android no soporta correctamente esa duplicación.
- Se anima a una ventana vertical **9:16** encima de los comentarios; se reduce al aparecer el teclado usando el espacio realmente medido del modal.
- Conserva posición, sonido, bucle y estado de pausa. Un video que ya estaba pausado sigue pausado.
- Tocar el video pequeño cierra comentarios/teclado y restaura el tamaño completo. El scroll del feed queda bloqueado mientras está abierto el modal.
- En esta entrega la integración del video pequeño corresponde al **feed principal**. El componente de comentarios ofrece props opcionales; no afirmar que todos los otros lectores de video ya recibieron esa integración.

### Botón + bajo el avatar

- Se conserva el gradiente cian/magenta TOKVID (`#00F2FE` → `#FE0979`).
- Aparece para usuarios autenticados al ver otro creador al que aún no siguen; se oculta en videos propios y creadores ya seguidos.
- Durante la solicitud de seguimiento queda deshabilitado. Se conserva el comportamiento de registro para invitados.
- Se trata del + para seguir bajo el avatar, no del botón central Crear de la tab bar ni del selector de stickers.

### Foto del perfil

- Recorrido: **Perfil → tocar avatar / Editar perfil → elegir foto → Guardar**.
- La selección de galería permite recorte cuadrado. La subida usa base64 convertido a `ArrayBuffer`, con JPG/PNG/WebP identificados por sus bytes y límite de 10 MB.
- Usa una ruta única dentro de la carpeta del usuario en el bucket público `avatars`, `upsert: false` y una URL nueva. La auditoría encontró INSERT de propietario; el upsert anterior necesitaba permisos adicionales y podía fallar.
- El guardado exige una fila de perfil confirmada para el mismo usuario y la URL esperada. Después se refresca el perfil; el feed muestra la foto actual del creador cuando es la propia cuenta.
- Si falla subir/guardar, el editor muestra el error y mantiene la selección para reintentar; no vuelve atrás afirmando un éxito inexistente. Se impiden guardados simultáneos.
- El bucket y las políticas existentes se reutilizaron. Este bloque no requirió migraciones ni cambios de configuración Auth.
- No se implementó una limpieza de imágenes anteriores; no afirmar que subir una nueva borra automáticamente el objeto viejo.

## 7. Entrega y evidencia verificadas

| Evidencia | Valor |
| --- | --- |
| Workflow | [Android APK #204](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640), intento 1, success |
| Job | `113048894987` |
| Commit del binario | `a6e14783bbaede25f5f756f24250b7b62d9a85f0` |
| Pruebas | **92 aprobadas, 0 fallidas**, con dependencias reales instaladas en CI |
| Typecheck | Aplicación móvil completa: aprobado |
| Android | `BUILD SUCCESSFUL in 26m 55s` |
| APK | [tokvid-android-feed-avatar](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640/artifacts/11516477647), artifact `11516477647` |
| ZIP APK | `213919965` bytes; contiene `app-release.apk` |
| SHA256 del APK sin comprimir | `e83b1eef7b9a3a2e8d473ae41c4b7a8d2f8d7e8a9421f765618104e2187c70a1` |
| Mapa de fuentes + manifiesto | [tokvid-auth-diagnostic-sourcemap](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640/artifacts/11516672356), artifact `11516672356`, ZIP `3286394` bytes |
| Retención anunciada | Hasta 5 de enero de 2027; comprobar disponibilidad si se retoma después |

El workflow verificó el marcador diagnóstico y el SHA del commit dentro del bundle de la APK, el mapa de fuentes generado y ambos artefactos. La entrega #203 fue sustituida por #204 al incorporar los dos listeners globales; no usar #203 como entrega final.

La APK de diagnóstico anterior fue [#202](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37685342489), con commit `883a3a423067a8add632117c752cb8ea971ab0c7`; se conserva como referencia del reporte original, no como última app corregida.

La validación local usó Node 24, el código real de Realtime extraído de la APK reportada y límites nativos simulados. Como el snapshot local no tenía TypeScript instalado, se usó allí el transformador Babel de Playwright como adaptador temporal. **La validación de CI sí ejecutó las 92 pruebas con TypeScript y Supabase instalados y verificó los tipos del proyecto completo.** No confundir la simulación de componentes con una prueba visual en Android real.

Comandos de validación para un checkout completo con dependencias:

```bash
pnpm install
node --test scripts/tests/*.test.cjs
pnpm --filter @workspace/mobile run typecheck
```

Las pruebas usan `node:module.stripTypeScriptTypes`; la referencia validada en CI es Node 24. No copiar el adaptador local de pruebas a la aplicación o al repositorio.

## 8. Dónde está cada cambio

| Área | Archivos |
| --- | --- |
| Canales únicos por efecto | `artifacts/mobile/lib/realtimeSubscriptions.ts` |
| Suscripciones del feed | `hooks/useFeedCommentCounts.ts`, `hooks/useFeedComments.ts`, `hooks/useFeedVideoLikes.ts` dentro de `artifacts/mobile` |
| Listeners globales | `artifacts/mobile/context/NotificationsContext.tsx`, `artifacts/mobile/components/IncomingCallListener.tsx` |
| Integración y continuidad del video | `artifacts/mobile/app/(tabs)/index.tsx`, `artifacts/mobile/components/VideoCard.tsx` |
| Panel y medida con teclado | `components/CommentsSheet.tsx`, `lib/commentVideoLayout.ts`, `hooks/useKeyboardSheetViewport.ts`, `lib/keyboardSheetGeometry.ts` dentro de `artifacts/mobile` |
| Acciones de comentarios | `components/CommentActionsPopover.tsx`, `lib/commentPopoverGeometry.ts`, `lib/features/comments/model.ts`, `lib/features/comments/services.ts` dentro de `artifacts/mobile` |
| + para seguir | `artifacts/mobile/components/VideoActions.tsx`; estado existente en `context/FollowContext.tsx` |
| Avatar | `artifacts/mobile/app/edit-profile.tsx`, `app/(tabs)/profile.tsx`, `lib/features/profile/avatar.ts`, `lib/features/auth/context/AuthContext.tsx` dentro de `artifacts/mobile` |
| Dependencia de bytes | `base64-js@1.5.1` en `artifacts/mobile/package.json` y su importer de `pnpm-lock.yaml` |
| Diagnóstico | `artifacts/mobile/lib/authDiagnostics.ts`, `components/ErrorBoundary.tsx`, `components/ErrorFallback.tsx` |
| Build | `.github/workflows/android-apk.yml` |
| Nuevas pruebas | `scripts/tests/feed-realtime.test.cjs`, `feed-presentation.test.cjs`, `comment-video-layout.test.cjs`, `profile-avatar.test.cjs` |
| Pruebas existentes adaptadas | `scripts/tests/feed-comments.test.cjs`, `scripts/tests/feed-video-likes.test.cjs` |

## 9. Pendientes reales y orden para continuar

1. **Primero recibir la revisión física de #204.** Probar Google sin Try Again; video visible y con audio al comentar y escribir; regreso al tamaño completo sin reinicio; + en otro creador no seguido; avatar guardado después de reabrir y reiniciar. Registrar qué confirmó el usuario y qué falla, con versión exacta.
2. Si hay un problema, reproducir o recoger evidencia, limitar la actualización al problema y conservar el resto. Ante otra excepción, pedir el informe diagnóstico de esa APK, no asumir que es un permiso de token.
3. Continuar con las siguientes observaciones que indique el usuario. El orden anterior recogido en el maestro era Feed/comentarios, después Perfil y posteriormente mensajería/notificaciones.
4. **Pendientes anteriores que no quedan terminados por #204:** acceso real por teléfono/SMS; integración del catálogo propio TOKVID de stickers en el editor (hay preparación de servidor, no se declaró cerrada la interfaz); navegación de notificaciones al comentario/video/conversación correspondiente; desarrollo restante del Perfil y mensajería privada según el maestro. El usuario había confirmado recepción de notificaciones entre dos teléfonos, pero reportó que tocarlas no abría el destino.
5. LIVE, monetización/regalos, Studio, Stories y el resto del documento maestro mantienen su estado propio. Este cierre no los declara implementados ni autoriza comenzar automáticamente esos bloques.

Las preguntas sobre borrado principal, permisos de edición, tab bar inferior, aspecto del popover, orientación del video y presencia del + ya quedaron resueltas. No volver a presentarlas como decisiones pendientes.

## 10. Cómo retomar tras perder el entorno

1. Abrir el repositorio y seleccionar `feature/feed-mini-video-avatar`; leer este documento y `CONTINUAR_AQUI.md` antes de editar.
2. Leer el HEAD real de esa rama y comprobar si existen avances posteriores a este cierre. La APK #204 seguirá identificándose por `a6e14783...`, aunque haya nuevos commits documentales.
3. Trabajar desde un checkout completo o recuperar los archivos del commit correcto. La carpeta de esta sesión `/workspace/TokVid-expanded` es un snapshot parcial; sus commits locales son artificiales y **no son padres válidos para publicar cambios en GitHub**.
4. Los snapshots `/workspace/TokVid-work` y `/workspace/TokVid-auth-diagnostics` corresponden a etapas anteriores. Los archivos temporales, las imágenes adjuntas y los valores de `functions.store` pueden desaparecer; no tratarlos como la única copia del estado.
5. Recuperar APK/mapa de fuentes desde los artefactos oficiales, verificando su commit. Si expiraron, reconstruir el código correspondiente mediante el workflow adecuado; no sustituirlos por artefactos de otra versión.
6. Para publicar, usar el padre y árbol reales, revisar que la rama no avanzó y actualizar sin forzar ni sobrescribir cambios ajenos.
7. Actualizar esta entrega y el maestro al terminar otro bloque. Registrar expresamente toda decisión que sustituya una anterior y devolver al usuario un enlace persistente.
