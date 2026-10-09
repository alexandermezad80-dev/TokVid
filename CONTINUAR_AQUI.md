# TokVid — continuar desde aquí

Actualizado: **9 de octubre de 2026 (UTC)**.

## Regla del usuario

> «Lo que está hecho no se toca a no ser que necesite una actualización».

Conservar el comportamiento, diseño y decisiones aprobados. Limitar cualquier actualización a la necesidad concreta autorizada; no rehacer bloques terminados ni volver a preguntar decisiones resueltas.

## Trabajo autorizado en curso — 9 de octubre de 2026

Se implementó la corrección de mensajería privada, teclado, opciones flotantes discretas, borrado para mí/para todos, perfiles y seguimiento a partir de la prueba física del usuario con #206. **124 pruebas locales y la prueba SQL de privacidad pasaron; la nueva APK aún no se ha entregado.** Las dos migraciones de mensajería ya están aplicadas. [Alcance, evidencia y prueba física](docs/PRIVATE_MESSAGES_PROFILE_VALIDATION.md). La autorización ya está dada; continuar con typecheck, compilación y entrega, sin volver a pedir permiso ni rehacer lo aprobado.

## Entrega vigente

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **`feature/feed-mini-video-avatar`**.
- Código de la APK: **`a5fbc7ba45effa5145f00124dce7a99db1646a35`**. Los commits documentales posteriores no cambian la identidad del binario.
- [Descargar APK #206](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37794716857/artifacts/11559456417): descargar el ZIP, extraer e instalar `app-release.apk`.
- [Compilación #206](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37794716857): **106 pruebas aprobadas, 0 fallidas**, typecheck móvil aprobado y `BUILD SUCCESSFUL in 18m 42s`.
- [Manifiesto y checksum](docs/continuity/APK_206_VERIFICATION.json). No confundir el SHA256 del APK con el del ZIP de GitHub.

## Qué incluye

- Crear con cámara/galería, vista previa, descripción, progreso y publicación real de foto/video.
- Perfil propio con grilla real, separación y esquinas suaves, borde de marca y fondo con marca de agua TokVid; lector de publicaciones y búsqueda desde el feed.
- «Para ti» consulta publicaciones públicas; «Siguiendo» consulta únicamente autores que sigue esa cuenta, filtrando antes de paginar. La publicación propia aparece en el perfil y Para ti; sus seguidores también la encuentran en Siguiendo.
- Corrección del editor ante el cambio a teclado emoji, «Eliminar», «Ocultar mensajes», «Mostrar» solo con hilos ocultos y avatares de comentarios/respuestas que abren su perfil.
- Conserva el diseño aprobado, video pequeño vertical al comentar, + para seguir, avatar guardable y corrección Realtime tras Google. No cambia Auth/OTP ni los permisos/semántica de comentarios.

La migración `20261008010846_support_photo_and_video_publications` ya está aplicada y registrada. No volver a crearla. La APK #205 es la compilación anterior: no incluye el ajuste final de Para ti/Siguiendo. #204 corresponde a la entrega anterior de Google/video pequeño/avatar.

## Siguiente paso concreto

Probar en teléfono **Crear → Galería → video corto → Publicar**, comprobar perfil, Para ti, búsqueda y Siguiendo desde una segunda cuenta que siga al autor. Después probar foto, teclado emoji y avatares. [Lista y límites de validación](docs/PUBLISHING_COMMENTS_VALIDATION.md#prueba-en-teléfono). Las pruebas automáticas y la APK están verificadas; **la prueba física de esta versión está pendiente**. No publicar contenido en nombre del usuario para simular esa prueba.

Los datos de ejemplo del feed Para ti se conservan según la decisión previa hasta verificar una subida real y autorizar su retirada. La grilla del perfil propio y Siguiendo usan contenido real. La subida actual tiene reintento manual; no se presenta como transferencia reanudable TUS.

## Documentos para retomar

1. [Estado entre sesiones](docs/continuity/TOKVID_SESSION_HANDOFF.md).
2. [Documento maestro](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md): su historial no convierte todos los requisitos futuros en tareas actuales.
3. [Detalle técnico y pruebas](docs/PUBLISHING_COMMENTS_VALIDATION.md).
4. [Reglas para agentes](AGENTS.md).

**Frase para otra sesión:**

> Continuemos TokVid desde `feature/feed-mini-video-avatar`. Lee `CONTINUAR_AQUI.md`, el handoff y el maestro. La última entrega es la APK #206, código `a5fbc7ba45effa5145f00124dce7a99db1646a35`. Conserva lo aprobado y retoma desde mi prueba física de publicación/comentarios y mis siguientes observaciones.
