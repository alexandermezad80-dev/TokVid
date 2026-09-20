# TOKVID — Documento maestro de requisitos y visión

**Estado:** Especificación de trabajo  
**Propósito:** Servir como referencia para la auditoría, planificación y evolución de TokVid.

> **Regla principal:** Primero auditar. No modificar código, base de datos, migraciones ni configuración sin autorización explícita.

## 1. Identidad y perfil
Cada usuario tendrá nombre, nombre de usuario, foto/avatar, videos publicados, seguidores, seguidos, amigos cuando exista seguimiento mutuo, favoritos/guardados, Me gusta, nichos/categorías y actividad/interacciones.

## 2. Feed de videos
Feed vertical con scroll infinito, reproducción automática, precarga inteligente limitada, adaptación a conexión, Me gusta, comentarios, compartir, guardar, perfil del creador, seguir, hashtags y menciones. La interfaz tendrá identidad propia y no copiará literalmente otras plataformas.

## 3. Stories
Publicar y ver Stories, Me gusta, notificaciones de interacción, acceso desde notificación y controles de privacidad.

## 4. Seguidores, seguidos y amigos
Seguir/dejar de seguir, consultar seguidores y seguidos, identificar amistad por seguimiento mutuo, notificar nuevos seguidores y acceder al perfil.

## 5. Mensajes privados
Conversaciones, envío/recepción, notificaciones, eliminación individual, selección múltiple, vaciado de conversación y diferencia clara entre «eliminar para mí» y, si se habilita, «eliminar para todos». Debe respetar privacidad, permisos y RLS.

## 6. Llamadas y videollamadas
Integradas en mensajes. Llamada de voz y videollamada, elección de voz o voz+video, activar/desactivar micrófono y cámara, finalizar, aceptar/rechazar y notificaciones de llamadas entrantes/perdidas. Cámara y micrófono se solicitan solo al utilizar la función.

## 7. Burbujas de mensajes
Estilos de burbuja configurables, vista previa, selección y cambio posterior, diferenciación enviado/recibido, legibilidad y accesibilidad. No altera la lógica de almacenamiento.

## 8. Live
Sistema independiente del feed. El anfitrión gestiona invitados, autorizaciones, permisos de cámara/micrófono, acceso y sala. Cada participante controla físicamente su dispositivo dentro de los permisos concedidos. Invitados participan cuando son autorizados. Chat del Live separado de comentarios de videos y mensajes privados.

## 9. Requisitos para Live
Propuesta actual: 18+, mínimo 1.000 seguidores, cuenta con al menos 30 días, cuenta en buen estado y cumplimiento de políticas de Live/comunidad. Sujeto a revisión final.

## 10. Enlace en el perfil
Propuesta: desbloqueo después de 60 días, cuenta en buen estado, verificación correspondiente y controles de seguridad. No necesariamente exige mínimo de seguidores.

## 11. Creación y producción de video
Grabar/importar, recortar, unir clips, editar, texto, música/sonido, efectos, filtros, ajustes visuales, vista previa, publicar y guardar borradores.

## 12. Filtros y efectos
Filtros de imagen/video, ajustes visuales, efectos especiales y de audio y vista previa.

## 13. Voz y sonido
Cambio/efectos de voz, ajustes de audio, aplausos, risas y otros efectos, con previsualización. La imitación de voces reales requiere reglas de seguridad y consentimiento.

## 14. Subtítulos
Generación automática desde audio/voz, edición manual, sincronización, estilos, tamaño, posición, vista previa, idiomas y activación/desactivación durante reproducción.

## 15. IA para creadores
Ideas, guiones, textos, recursos visuales, edición asistida, transformación y generación audiovisual cuando corresponda. La IA debe mantener el control del usuario sobre lo publicado y contar con política específica de IA y propiedad intelectual.

## 16. Hashtags
Crear/reconocer #hashtag, abrir contenido asociado, página/feed del hashtag, descubrimiento y asociación con videos y contenido compatible.

## 17. Menciones
@usuario, sugerencias al escribir, acceso al perfil, notificación al mencionado y controles de privacidad.

## 18. Borradores
Guardar y continuar posteriormente, conservar elementos de edición, múltiples borradores, eliminar borradores e impedir publicación accidental. Un borrador no es contenido publicado hasta confirmación.

## 19. Formatos y procesamiento de video
Definir formatos, duración, resoluciones, tamaños, códecs, validación, conversión/transcodificación y optimización móvil. Debe equilibrar calidad, velocidad, almacenamiento y consumo de datos.

## 20. Notificaciones
Área propia para Me gusta de videos/Stories, comentarios, seguidores, mensajes, llamadas, videollamadas, actividad relevante de Live, menciones y otras interacciones. Deben llevar al destino correspondiente cuando sea posible.

## 21. Seguridad de mensajería
Protección frente a mensajes potencialmente peligrosos: ocultar/proteger, decidir si abrir, reportar, bloquear y explicar. No asumir automáticamente una situación personal por una detección automática.

## 22. «¿Necesitas ayuda?»
Cuando corresponda, mostrar información de apoyo, reporte, bloqueo, recursos profesionales y recursos de emergencia ante riesgo inmediato.

## 23. Ayuda psicológica
Podrá incluir una entidad profesional y verificable, enlace oficial, tipo de ayuda e información actualizada. Los recursos deben verificarse antes de publicarse.

## 24. Conducta repetida y advertencias
Propuesta: ante tres mensajes relacionados con una misma conducta/intención de riesgo, mostrar advertencia; una posible medida posterior sería suspensión temporal de 24 horas. Antes de automatizar: definir categorías, criterios, umbrales, revisión, protección contra falsos positivos y apelación.

## 25. Protección de menores
Como Live será 18+, la edad forma parte de seguridad. La voz infantil solo es señal de posible riesgo, no prueba definitiva. Cualquier medida requiere protección de privacidad, revisión y apelación; no bloquear automáticamente por apariencia de voz.

## 26. Políticas de TokVid
Preparar políticas independientes para términos, privacidad, comunidad, contenido/moderación, mensajes, Live, derechos de autor, IA, seguridad, enlaces, cuentas/sanciones/apelaciones, menores/edad, datos/eliminación y creadores/monetización. Revisión legal antes de convertirlas en documentos jurídicos definitivos.

## 27. Derechos de autor
El usuario debe tener derechos o permisos necesarios. Debe existir reporte, revisión, retirada/restricción cuando corresponda y disputa/apelación. Reglas para música, imágenes, videos, terceros e IA. TokVid no asume automáticamente derechos de terceros.

## 28. Monetización — función vital
La arquitectura debe contemplar desde el principio regalos/apoyos en Live, suscripciones, reparto de ingresos, promoción, panel de ingresos, historial, retiros y, para TokVid, comisiones, publicidad, premium, servicios a creadores y funciones empresariales. Sistema financiero con saldo, ganancias, historial, umbral, métodos de pago por país, verificación cuando corresponda, fraude, reembolsos/disputas y registros. Las fórmulas de reparto deben poder evolucionar.

## 29. Herramientas para grandes creadores
Estadísticas, retención, visualizaciones, crecimiento, horarios, moderación avanzada, moderadores de Live, protección de cuenta, alertas, comunidad, encuestas, preguntas, soporte y monetización según elegibilidad. Acceso progresivo por niveles.

## 30. Panel administrativo
Panel protegido para equipo autorizado: usuarios, crecimiento, videos, Stories, Live, interacciones, reportes, moderación, seguridad, ingresos, comisiones, pagos a creadores y métricas.

## 31. Arquitectura de evolución segura
Producción estable → desarrollo aislado → pruebas → revisión → integración → nueva versión. No cambiar directamente la versión estable sin control.

## 32. Ramas y trabajo de desarrolladores
Funciones importantes en ramas independientes, por ejemplo feature/chat, feature/video-editor, feature/live, feature/notifications y feature/monetization. Flujo: rama → CI → pruebas → revisión → aprobación → merge. Sin acceso total automático a producción.

## 33. Propiedad de código
Responsables por Auth, Perfil, Feed, Crear, Mensajes, Live, Notificaciones, IA, Monetización, Seguridad y Supabase. Áreas sensibles pueden requerir revisiones obligatorias.

## 34. Versiones estables y recuperación
Identificar versiones funcionales, por ejemplo v1.0.0 estable y v1.1.0 nueva función. Ante problemas, poder volver de forma controlada a la última versión estable sin perderla.

## 35. Supabase y base de datos
Cambios versionados y controlados mediante migraciones que identifiquen qué cambió, cuándo, versión y dependencias. Especial cuidado con cambios destructivos.

## 36. Auditoría antes de cambiar
Para cada función revisar: interfaz → lógica → base de datos → relaciones → RLS/permisos → notificaciones → navegación → rendimiento → experiencia real. No basta con que exista una pantalla, botón, tabla o migración.

## 37. Regla de protección del proyecto
Durante auditoría: **NO modificar código, Supabase, migraciones, políticas ni configuración.** Primero auditar, documentar, identificar existente/incompleto/faltante/dependencias, planificar, solicitar autorización, implementar, probar e integrar.

## 38. Principio general de TokVid
Una función nueva no debe destruir una existente. La plataforma debe crecer progresivamente, recuperar una versión estable cuando sea necesario y permitir trabajo independiente por áreas sin interferencias innecesarias.

---

## Estado actual del documento
Este documento representa la visión y lista de requisitos recopilados hasta este momento. **No significa que todas las funciones estén actualmente implementadas.**

La siguiente etapa es comparar cada requisito con el TokVid real y determinar:

- ✅ Ya existe.
- 🟡 Existe parcialmente.
- 🔴 No existe.
- ⚠️ Existe pero necesita revisión.
- 🔗 Depende de otra función.

**No se debe implementar nada solamente por aparecer en este documento. Primero se audita el estado real del proyecto.**
