# Continuidad y conservación de TokVid

## Antes de trabajar

1. Leer `CONTINUAR_AQUI.md` y `docs/continuity/TOKVID_SESSION_HANDOFF.md`.
2. Consultar `docs/requirements/TOKVID_MASTER_REQUIREMENTS.md` para el alcance y las decisiones del producto. Su historial no equivale a tareas pendientes actuales: aplicar las aclaraciones posteriores del usuario.
3. Comprobar la rama y el HEAD remotos antes de editar o publicar. La línea vigente al cierre del 7 de octubre de 2026 es `feature/feed-mini-video-avatar`; el código de la APK #204 es `a6e14783bbaede25f5f756f24250b7b62d9a85f0`.

## Regla explícita del usuario

> Lo que está hecho no se toca a no ser que necesite una actualización.

- Conservar las funciones, diseños, permisos y decisiones aprobados. No rediseñar ni reescribir bloques terminados sin una necesidad concreta.
- Una actualización puede proceder de una petición del usuario, de un defecto comprobado o de un requisito técnico necesario para el trabajo autorizado. Explicar su motivo y alcance antes de implementarla y limitar el cambio a esa necesidad.
- Respetar las autorizaciones de la conversación. No volver a pedir autorización para el mismo trabajo ya autorizado. Si el usuario pide esperar antes de implementar un nuevo cambio, esperar.
- No reabrir decisiones resueltas: borrado principal en cascada, edición exclusiva del autor, moderación sin edición ajena, panel de comentarios de ancho completo, popovers flotantes y video pequeño vertical al comentar.
- Conservar el registro por correo y OTP de ocho dígitos, que el usuario confirmó que funcionaba. Un fallo del feed después de Google no justifica cambiar ese registro ni recrear tokens.
- No marcar una función como probada en teléfono por haber pasado tests o generado una APK.
- No sustituir secretos ni modificar Auth, proveedores o migraciones por una tarea exclusivamente documental.

## Trabajo y entrega

- Mantener separados los estados: requisito, implementado, verificado automáticamente, entregado y confirmado físicamente por el usuario.
- Usar el código actual como base; no partir de una rama anterior por ser `main` ni revertir a una APK histórica sin motivo autorizado.
- Las carpetas locales pueden ser snapshots parciales con commits artificiales. Para publicar, utilizar los padres y árboles reales de GitHub. No confundir el Git local del snapshot con el historial remoto.
- Ejecutar las comprobaciones pertinentes al cambio. Una edición exclusivamente documental no necesita reconstruir Android; puede publicarse con `[skip ci]` sin tocar el workflow.
- Mantener los reportes de diagnóstico sin credenciales. Conservar el mapa de fuentes de la misma APK cuyo error se investiga.
- No mezclar o reemplazar otras ramas, ni aplicar cambios a la base, para cerrar una tarea de documentación.

## Al cerrar una sesión o entregar una actualización

Actualizar los documentos de continuidad con: petición y autorizaciones, decisiones vigentes, archivos modificados, rama/commit real, pruebas y sus límites, APK/enlaces/checksum si existen, pendientes concretos y siguiente paso. Si se sustituye una decisión anterior, identificarla expresamente para impedir regresiones. Guardar el registro en GitHub y dar al usuario su enlace; la memoria del chat y los archivos temporales no bastan.
