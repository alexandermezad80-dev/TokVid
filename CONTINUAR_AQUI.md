# TokVid — continuar desde aquí

Actualizado: **9 de octubre de 2026 (UTC)**.

## Regla del usuario

> «Lo que está hecho no se toca a no ser que necesite una actualización».

Conservar lo aprobado y limitar cambios a la necesidad autorizada. No volver a solicitar decisiones o permisos ya dados. Si el usuario pide esperar para un bloque nuevo, esperar.

## Entrega vigente

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **`feature/feed-mini-video-avatar`**.
- Código de la APK: **`5485c9961f7bd1869468c92d7b5ec25c81262425`**. Los commits documentales posteriores no cambian el binario.
- [Descargar APK #207](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37886244472/artifacts/11597441070): extraer el ZIP e instalar `app-release.apk` en ambos teléfonos.
- [Compilación #207](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37886244472): **124 pruebas aprobadas, 0 fallidas**, typecheck móvil aprobado y `BUILD SUCCESSFUL in 27m 29s`.
- [Manifiesto y checksum](docs/continuity/APK_207_VERIFICATION.json). El SHA256 del APK difiere del ZIP de GitHub.

## Qué incluye esta actualización

- Inbox privado con conversaciones y no leídos, independiente de tocar notificaciones. Recepción dentro del chat abierto, canales sin reutilización y recuperación de eventos perdidos al reconectar/volver a la app.
- Compositor ajustado al teclado/emojis. Popover flotante al tocar mensaje o las opciones del encabezado, submenú Burbujas desplazable y tonos/bordes más discretos, como pidió el usuario.
- Seleccionar uno, varios o todos. Propios: **Eliminar para mí / Eliminar para todos**. Recibidos: solo para mí. RLS protege cada conversación y el servidor valida autoría; la prueba con un tercero fue rechazada.
- Perfil propio unificado al tocar los avatares de su video; ocultación de Seguir en videos propios. Grillas de tres columnas con tamaños medidos y el diseño aprobado. Siguiendo/Seguidores/Amigos abren sus listas; Amigos requiere seguimiento mutuo.
- Conserva las funciones de #206: publicación real por cámara/galería, búsqueda/Para ti/Siguiendo, foto de avatar, comentarios y video pequeño. Auth/OTP no se modificaron.

## Base de datos

Aplicadas y registradas `20261009042214_private_chat_delivery_visibility_and_removal` y `20261009043643_atomic_private_message_sending`. No reaplicarlas ni editar su historial. No se eliminaron datos existentes: los tests SQL se revirtieron. La segunda migración quita solo el trigger/función de avisos creados por la primera y los reemplaza por envío atómico para evitar duplicaciones en clientes antiguos. Se conserva la migración de publicaciones `20261008010846_support_photo_and_video_publications`.

## Siguiente paso concreto

**Probar #207 en ambos teléfonos:** intercambiar mensajes sin salir del chat y revisar Inbox sin tocar Actividad; comprobar teclado/emoji, menú discreto y borrado en sus dos modalidades. Después verificar el video ya subido en la grilla propia, los dos avatares del feed, ausencia de autofollow y listas de relaciones. [Lista exacta y límites](docs/PRIVATE_MESSAGES_PROFILE_VALIDATION.md#prueba-física-de-aceptación).

La compilación y las verificaciones automáticas están completas. **La aceptación física está pendiente**. No publicar mensajes/videos reales para simularla. Los datos de ejemplo de Para ti se conservan hasta autorización de retirarlos; grilla propia y Siguiendo usan contenido real. La transferencia sigue con reintento manual, sin presentar TUS como terminado.

## Documentos para retomar

1. [Estado entre sesiones](docs/continuity/TOKVID_SESSION_HANDOFF.md), sección 14 vigente.
2. [Documento maestro](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md).
3. [Mensajería y perfil: evidencia y pruebas](docs/PRIVATE_MESSAGES_PROFILE_VALIDATION.md).
4. [Publicación y comentarios de #206](docs/PUBLISHING_COMMENTS_VALIDATION.md).
5. [Reglas para agentes](AGENTS.md).

**Frase para otra sesión:**

> Continuemos TokVid desde `feature/feed-mini-video-avatar`. Lee CONTINUAR_AQUI, el handoff y el maestro. Última entrega APK #207, código `5485c9961f7bd1869468c92d7b5ec25c81262425`. Mensajería/perfiles y SQL están implementados y verificados automáticamente; retoma desde mi prueba física con dos cuentas. Conserva lo aprobado.
