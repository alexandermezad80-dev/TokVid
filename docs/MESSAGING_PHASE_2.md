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
