# TokVid — fase de mensajería y adaptación, autorizada el 9–10 de octubre de 2026

## Base y estado

Última entrega: [APK #210](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109/artifacts/11707879434), compilada el 11 y documentada el 12 de octubre. Rama `feature/feed-mini-video-avatar`, código `dc04574d9b806ee73b2d75d8ba1036c1ac7475e3`. Fase IMPLEMENTADA Y VERIFICADA AUTOMÁTICAMENTE; aceptación física pendiente. La base documental previa fue `4699141f3c51a6a4bb33ac06f2b27327cbf3020c` y el APK anterior #207.

El usuario confirmó físicamente la recepción inmediata en ambos sentidos, la conversación única por persona, contador y vista previa de Mensajes. Conservarlos. Detectó compositor tapado por teclado, escalado y barra inferior bajo navegación Android, menús demasiado brillantes/separados.

## Decisiones autorizadas

- Mensaje recibido: popover Responder, Reenviar, Anclar, Eliminar para mí, Denunciar.
- Mensaje propio: Responder, Reenviar, Copiar, Anclar, Traducir, Estilo de burbuja (submenú compacto), Eliminar para mí, Eliminar para todos, Eliminar todos y Cancelar envío antes de lectura. Barra superior de reacciones con emojis del sistema; reacción asociada al mensaje.
- **Eliminar todos selecciona solo mensajes enviados por mí y los oculta solo de mi vista**, aclaración explícita del usuario. Eliminar para todos afecta únicamente al mensaje propio tocado. Borrar conversación desde Inbox la oculta con toda su historia solo para mí.
- Header chat: volver, avatar/nombre, teléfono y menú de tres líneas. Compositor: cámara, campo, galería, micrófono/envío.
- Menú de tres líneas abre pantalla completa de detalles: avatar/nombre; Crear grupo, Ver perfil, Buscar en conversación; burbujas, fondo, tonos, silenciar mensajes, silenciar llamadas, denunciar. Tres puntos ofrece bloquear.
- Letras blancas nítidas; solo «Eliminar» en cian desaturado. Sin neón ni sombras de texto; previsualizaciones compactas. Fondo azul gris discreto.
- Actividad agrupada por destinatario+actor+tipo, contador por mensajes/likes/compartidas/visitas, aviso superior contextual. No confundir con lista de conversaciones.
- Teclado mantiene encabezado fijo y compositor visible; historial desplazable, sin saltar al final cuando se leen mensajes anteriores.
- Adaptación general por dimensiones, escala de letra y áreas seguras; no excepciones por marca. Tres botones Android y gestos, pantallas pequeñas/grandes.
- Branding: inicialmente no disponible. El 10 de octubre se confirmó `identidad-visual-TV.zip` en `main`, blob `8bc94f0534759378b460dc5228aa8ea200429c70`; revisar e integrar sin mezclar otras diferencias de main.

## Entrega y conservación

Implementación, permisos, regresiones, compilación y documento maestro completados para #210. No afirmar verificación física nueva ni borrar datos reales como prueba. Auth/OTP y publicación ya aprobada se conservan.

## Avance verificado — 11 de octubre, antes de compilar

- Kit de marca extraído en `assets/brand-kit/identidad-visual-TV` mediante preparación de CI, commit `c68821039f076ac5969e0309dbe3f4fb75f2c38d`. SVG plano, logos 3D, iconos de tiendas y manual conservados. Icono, splash, favicon y marca de agua conectados al kit; máscara adaptativa con margen de seguridad.
- Código inicial de fase `a5a0eb286e5ec4ff2428595313fdb48859793237`: [validación CI](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38153686206) aprobada (regresiones, TypeScript real y prebuild Android). Ese commit NO generó un APK. Los cambios posteriores están verificados en #210, como se registra abajo.
- Las pruebas originales de mensajería y las nuevas pruebas SQL de respuestas/reacciones, borrado privado, cancelar antes de leer, bloqueo, grupos privados, visitas y compartidas pasan en transacciones revertidas. No se enviaron mensajes o publicaciones reales para probar.
- Migraciones aplicadas: `20261011154613_private_chat_tools_and_grouped_activity`, `20261011155643_private_chat_groups`, `20261011160329_private_share_activity`, `20261011160621_avoid_recursive_group_membership_policies`, `20261011160655_idempotent_private_profile_visit_events`. Las últimas dos corrigen problemas detectados por las pruebas; no editar/reaplicar el historial. Grupo nuevo separado del chat privado original. FK compuesta impide falsificar al creador sin ampliar permisos.
- Edge Function `calls` v6 conserva autenticación interna existente y añade respeto de silenciar llamadas antes del push. Bloqueo verificado en servidor para ambos sentidos. No se cambió Auth/OTP.
- Traducción Android local con ML Kit: descarga modelos de idioma, no envía texto a un servicio de traducción. Grupos básicos de texto separados de chats personales. Medios privados en bucket `chat-media`, enlaces de lectura de cinco minutos; un archivo ya descargado por el destinatario no puede recuperarse de su teléfono.
- La prueba física de teclado, escalas, llamadas, audio, cámara, traducción, máscaras de icono y nuevas herramientas queda pendiente de instalar la APK de esta fase. No afirmar confirmación de dispositivos por haber pasado CI.

## Cierre de entrega — APK #210

[Workflow](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109), intento 1, job `114514004194`, commit `dc04574d9b806ee73b2d75d8ba1036c1ac7475e3`, árbol `4e30f2205e7d50ebd9b45e211e2b24957aeff362`. Resultado: **success**, 127 tests aprobados, 0 fallos, TypeScript móvil real aprobado y `BUILD SUCCESSFUL in 26m 36s`. También pasó el [preflight independiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309195) del mismo código, incluido prebuild Android.

[APK descargable](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109/artifacts/11707879434), ZIP 244212442 bytes; SHA256 del APK sin comprimir `6d8910e865ea6de794061fce57220d74dee4c7876e9d09b9400b451fa0bc6292`. [Mapa de fuentes y manifiesto de diagnóstico](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109/artifacts/11708725439), verificados contra el mismo commit/bundle por CI. Retención anunciada hasta 9 de enero de 2027; comprobar disponibilidad al retomar. [Registro estructurado](continuity/APK_210_VERIFICATION.json).

Pruebas SQL aprobadas con rollback: `private-messages`, `chat-tools`, `chat-groups-activity`, `share-activity` y `chat-media-privacy` en `scripts/tests/*.rollback.sql`. Cubren autoría y terceros, ocultación privada, cancelación antes de lectura, bloqueo en ambos sentidos, creación de grupos sin copiar el historial privado, idempotencia de eventos y medios solo en la conversación autorizada. La última prueba se añadió al cierre documental después del commit del binario; no modifica la app ni necesita otra compilación.

### Archivos principales

Rutas móviles bajo `artifacts/mobile`: `app/chat.tsx`, `chat-details.tsx`, `chat-action.tsx`, `chat-group.tsx`, `app/(tabs)/inbox.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`; `hooks/usePrivateChat.ts`, `useGroupInbox.ts`; `context/NotificationsContext.tsx`; `components/ActivityBanner.tsx`, `IncomingCallListener.tsx`, `PublicationThumbnail.tsx`, `VideoInfo.tsx`; herramientas y componentes en `lib/features/messages`. Branding en `assets/brand-kit`, tonos en `assets/sounds`, plugins `withSafeBrandIcon.js`, `withChatTranslation.js` y código nativo de traducción en `plugins/chat-native`. `app.json`, dependencias/lock y workflows contienen la integración de compilación. RPC/RLS en las cinco migraciones citadas y respeto de llamadas silenciadas en `supabase/functions/calls/index.ts`.

### Límites explícitos

- No se probó físicamente #210 en un teléfono ni emulador interactivo. La adaptación se basa en insets, dimensiones y escala de letra; no equivale a certificación universal.
- Crear grupo ofrece un grupo privado separado, de texto, entre 2 y 32 miembros, con los 200 mensajes más recientes en pantalla. No incluye adjuntos ni administración avanzada de miembros en grupos.
- Traducción local integrada para Android; necesita descargar el modelo del idioma la primera vez. No se afirma esa integración para iOS.
- Adjuntos de chats personales: máximo 50 MB; enlaces privados de cinco minutos. Borrar para todos no retira copias descargadas al teléfono de otra persona. La prueba SQL de medios verifica permisos y metadatos; cámara/audio y transferencia real requieren prueba nativa.
- Aviso superior nuevo dentro de la app. No afirmar un nuevo sistema de push de mensajes con la app cerrada. Denuncias se guardan de forma privada; no implican moderación automática.

## Aceptación física pendiente

1. Instalar #210 en ambas cuentas; conservar la recepción instantánea y contador/vista previa ya aprobados. Volver de segundo plano y revisar reconexión.
2. Abrir teclado normal y emoji: campo/envío visibles, encabezado estable, historial desplazable sin saltos al leer mensajes anteriores. Probar letra grande, tres botones y navegación por gestos; verificar barra inferior y nombre/seguir sin recortes.
3. Tocar mensajes propios/recibidos: comprobar sus opciones y reacción asociada, submenú de estilos compacto, letras blancas y «Eliminar» en cian discreto. Responder, copiar, reenviar, anclar y traducir.
4. Borrar individual para mí/para todos según autoría; cancelar antes de leer; comprobar que «Eliminar todos» afecta solo a mis enviados y solo a mi vista. Ocultar conversación y confirmar que un nuevo mensaje la hace reaparecer.
5. Enviar foto/video desde cámara/galería y audio con permisos; comprobar reproducción en la otra cuenta. Crear grupo separado y buscar dentro del chat. Probar silenciar/bloquear con ambas cuentas.
6. Actividad: dos mensajes de una persona aumentan una misma fila; likes/compartidas/visitas forman grupos separados por tipo y abren su destino. Revisar aviso superior y tonos.
7. Revisar nuevo icono con máscara del launcher, splash y marca de agua; conservar publicación, grilla, avatares de comentarios y relaciones. Registrar defectos concretos sin rehacer funciones confirmadas.
