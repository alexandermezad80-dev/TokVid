# TokVid — continuar desde aquí

Actualizado: **12 de octubre de 2026 (UTC)**.

## Regla del usuario

> «Lo que está hecho no se toca a no ser que necesite una actualización».

Conservar lo aprobado y limitar cambios a la necesidad autorizada. No volver a solicitar decisiones o permisos ya dados. Si el usuario pide esperar para un bloque nuevo, esperar.

## Entrega vigente

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **`feature/feed-mini-video-avatar`**.
- Código incorporado en la APK: **`dc04574d9b806ee73b2d75d8ba1036c1ac7475e3`**. Un cierre documental posterior no cambia el binario.
- [Descargar APK #210](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109/artifacts/11707879434): extraer el ZIP e instalar `app-release.apk` en ambos teléfonos.
- [Compilación #210](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38154309109): **127 pruebas aprobadas, 0 fallidas**, TypeScript móvil aprobado y `BUILD SUCCESSFUL in 26m 36s`.
- [Manifiesto y checksum](docs/continuity/APK_210_VERIFICATION.json). SHA256 del APK: `6d8910e865ea6de794061fce57220d74dee4c7876e9d09b9400b451fa0bc6292`. El checksum del ZIP es distinto.

## Qué incluye esta fase

- Popovers distintos para mensajes propios y recibidos, respuestas citadas, reenvío, copiar, anclar, denuncia, traducción local Android y barra de reacciones con emojis. Submenú compacto de ocho estilos, sin brillo de neón y con texto blanco legible.
- Encabezado con volver, avatar/nombre, teléfono y menú; pantalla completa de detalles con buscar en conversación, perfil, grupo de texto, preferencias, silenciar y bloquear. Compositor con cámara, galería, audio y envío.
- **Eliminar todos selecciona solo mis mensajes y los oculta solo para mí.** Eliminar para todos afecta al mensaje propio tocado. Cancelar envío exige que aún no esté leído. Ocultar una conversación desde Inbox afecta solo a mi cuenta; un mensaje nuevo la vuelve a mostrar.
- Actividad agrupada por persona y tipo con contador y aviso dentro de la app. Medios privados con permisos por conversación; bloqueo comprobado en servidor.
- Ajustes de teclado, áreas seguras, barra inferior y textos para dimensiones y escala del sistema; sin reglas específicas para una marca de teléfono.
- Nuevo kit `identidad-visual-TV.zip` integrado: icono Android con margen adaptativo, splash, favicon y marca de agua. Los originales vectoriales y recursos de tiendas están conservados.

El usuario **ya confirmó** en la base #207 la recepción inmediata en ambos sentidos y el contador/vista previa de Mensajes. Se conservó ese flujo. Auth/OTP, publicación y decisiones aprobadas de comentarios permanecen como base; no reiniciar su implementación.

## Base de datos y validación

Las cinco migraciones de esta fase están aplicadas y registradas en [el detalle técnico](docs/MESSAGING_PHASE_2.md). No reaplicarlas ni editar su historial. La función `calls` v6 respeta silenciar llamadas manteniendo su autenticación interna. Pruebas SQL de privacidad, permisos, grupos, medios y actividad ejecutadas con rollback; no se borraron conversaciones, perfiles ni publicaciones existentes.

## Siguiente paso concreto

**Probar #210 en los teléfonos:** primero teclado normal/emojis, compositor siempre visible, historial desplazable y barra inferior con navegación de tres botones/gestos y letra grande. Después menús/reacciones, borrados con sus alcances, adjuntos/audio, actividad agrupada y branding. [Lista y límites](docs/MESSAGING_PHASE_2.md#aceptación-física-pendiente).

La compilación y las verificaciones automáticas están completas. **La aceptación física de #210 está pendiente**; no afirmar compatibilidad comprobada con todos los teléfonos. Grupos de esta fase son básicos de texto (hasta 200 mensajes recientes visibles); traducción local disponible en Android con descarga inicial del modelo. Esta entrega no completa otros bloques futuros del maestro.

## Documentos para retomar

1. [Estado entre sesiones](docs/continuity/TOKVID_SESSION_HANDOFF.md), sección 15 vigente.
2. [Documento maestro](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md).
3. [Fase de mensajería, adaptación y branding](docs/MESSAGING_PHASE_2.md).
4. [Base de mensajería y perfil #207](docs/PRIVATE_MESSAGES_PROFILE_VALIDATION.md).
5. [Publicación y comentarios #206](docs/PUBLISHING_COMMENTS_VALIDATION.md).
6. [Reglas para agentes](AGENTS.md).

**Frase para otra sesión:**

> Continuemos TokVid desde `feature/feed-mini-video-avatar`. Lee CONTINUAR_AQUI, el handoff y el maestro. Última entrega APK #210, código `dc04574d9b806ee73b2d75d8ba1036c1ac7475e3`. Las mejoras autorizadas de mensajería, adaptación y branding están compiladas y verificadas automáticamente. Retoma desde mi prueba física con dos cuentas. Conserva lo aprobado.
