# TokVid — fase de mensajería y adaptación, autorizada el 9–10 de octubre de 2026

## Base y estado

Última APK entregada: #207. Rama `feature/feed-mini-video-avatar`, padre documental real `4699141f3c51a6a4bb33ac06f2b27327cbf3020c`. Esta fase está EN IMPLEMENTACIÓN; no hay APK nueva verificada todavía.

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

## Entrega pendiente

Implementar, verificar permisos y regresiones, compilar un APK de esta fase, actualizar maestro/handoff/manifiesto con evidencia. No afirmar verificación física nueva ni borrar datos reales como prueba. Auth/OTP y publicación ya aprobada se conservan.

## Avance verificado — 11 de octubre, antes de compilar

- Kit de marca extraído en `assets/brand-kit/identidad-visual-TV` mediante preparación de CI, commit `c68821039f076ac5969e0309dbe3f4fb75f2c38d`. SVG plano, logos 3D, iconos de tiendas y manual conservados. Icono, splash, favicon y marca de agua conectados al kit; máscara adaptativa con margen de seguridad.
- Código inicial de fase `a5a0eb286e5ec4ff2428595313fdb48859793237`: [validación CI](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38153686206) aprobada (regresiones, TypeScript real y prebuild Android). Ese commit NO generó un APK. Cambios posteriores todavía requieren su propia compilación.
- Las pruebas originales de mensajería y las nuevas pruebas SQL de respuestas/reacciones, borrado privado, cancelar antes de leer, bloqueo, grupos privados, visitas y compartidas pasan en transacciones revertidas. No se enviaron mensajes o publicaciones reales para probar.
- Migraciones aplicadas: `20261011154613_private_chat_tools_and_grouped_activity`, `20261011155643_private_chat_groups`, `20261011160329_private_share_activity`, `20261011160621_avoid_recursive_group_membership_policies`, `20261011160655_idempotent_private_profile_visit_events`. Las últimas dos corrigen problemas detectados por las pruebas; no editar/reaplicar el historial. Grupo nuevo separado del chat privado original. FK compuesta impide falsificar al creador sin ampliar permisos.
- Edge Function `calls` v6 conserva autenticación interna existente y añade respeto de silenciar llamadas antes del push. Bloqueo verificado en servidor para ambos sentidos. No se cambió Auth/OTP.
- Traducción Android local con ML Kit: descarga modelos de idioma, no envía texto a un servicio de traducción. Grupos básicos de texto separados de chats personales. Medios privados en bucket `chat-media`, enlaces de lectura de cinco minutos; un archivo ya descargado por el destinatario no puede recuperarse de su teléfono.
- La prueba física de teclado, escalas, llamadas, audio, cámara, traducción, máscaras de icono y nuevas herramientas queda pendiente de instalar la APK de esta fase. No afirmar confirmación de dispositivos por haber pasado CI.
