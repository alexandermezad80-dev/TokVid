> **Fase4 en verificación (15 octubre2026):** el usuario autorizó implementar todas las referencias posteriores y confirmó visualmente el contenido compacto de Información de perfil de APK217. El teclado de chat seguía fallando y NO se considera validado físicamente. Ver [registro de fase4](docs/TOKVID_PHASE_4.md). Preflight27a677a aprobado:132 pruebas, TypeScript/prebuild. Migración20261015005124 aplicada, pruebas revertidas aprobadas. La APK nueva todavía está pendiente; conservar217 como última entregada hasta registrar el binario nuevo.

# TokVid — continuar desde aquí

Actualizado: **13 de octubre de 2026 (UTC)**.

## Regla del usuario

> «Lo que está hecho no se toca a no ser que necesite una actualización».

Conservar lo aprobado. No volver a pedir decisiones o permisos ya dados. Las aclaraciones posteriores prevalecen sobre documentos y ZIP.

## Entrega vigente

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **`feature/feed-mini-video-avatar`**.
- Código de la APK: **`306c29db53ccadcaf025f5cf574033cf5a3e250e`**. El cierre documental posterior no cambia el binario.
- [Descargar APK #217](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859633718): extraer el ZIP e instalar `app-release.apk`.
- [Compilación #217](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390): **127 pruebas, cero fallos**, TypeScript y Android aprobados; `BUILD SUCCESSFUL in 17m 33s`.
- [Manifiesto/checksum](docs/continuity/APK_217_VERIFICATION.json). SHA256 del APK: `f41fefeaa196444d06d895052733585b2a76647c512bd0c11955002ec9929388`. El checksum del ZIP es diferente.
- [Mapa de fuentes del mismo binario](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859303878). Usar siempre el mapa correspondiente a esta APK.

## Decisiones de esta entrega

Se aplicaron los diseños de Feed/comentarios, Perfil/Amigos, Detalles y fondos. [Registro completo](docs/TOKVID_REFERENCE_DESIGNS_PHASE_3.md).

**Buscar** no permanece visible: al tocarlo en Detalles aparece el campo y se levanta el teclado. **Saldo y Suscripción** visibles y deshabilitados, confirmados expresamente. Branding de #210 aprobado y conservado. Mensajería inmediata y vista previa/contador de Inbox aprobados y conservados.

El teclado de #210 seguía ocultando el editor, según la captura del usuario. Esta entrega modifica ese comportamiento, pendiente de verificación física; no afirmar que ya fue aprobado en teléfono. Chat/comentarios mantienen escena estable y editor superpuesto al teclado. El video pequeño no cambia de tamaño al escribir y el modal cubre la tab bar inferior.

Solo el autor elimina individualmente su comentario/respuesta. El principal propio elimina todo su hilo; una respuesta propia conserva las demás respuestas y sus descendientes. Se quita la confirmación extra en comentarios. Esto sustituye la anterior autorización de moderación individual al dueño de la publicación.

La regla anterior de chat privado sigue vigente: Eliminar todos oculta solo mis mensajes y solo de mi vista. Eliminar para todos afecta el mensaje propio tocado. Ocultar conversación desde Inbox no borra el historial del otro participante.

## Datos y límites

Migración `20261013102948_comment_removal_author_only` aplicada y registrada; prueba SQL revertida aprobada. La migración no ejecutó borrados de datos existentes. No volver a aplicarla ni inventar otra versión. No cambiar Auth/OTP o Live por esta fase visual.

Los ocho fondos originales están incorporados y la selección se guarda localmente por cuenta/conversación, sin sincronización entre dispositivos. Saldo/Suscripción no están activos. Los editores avanzados de Dúo/Pegar/GIF/sticker de las capturas de ejemplo no forman parte de las acciones funcionales entregadas; Compartir dispone de los servicios detallados en el registro de fase.

## Siguiente paso

Probar esta APK en los teléfonos del usuario: teclado normal/emojis en chat y comentarios; fuente grande y navegación por botones/gestos; Buscar, fondos y vista previa; foto/cámara/recorte; grilla/relaciones y permisos de comentarios entre dos cuentas. No marcar `physical_device_verified` como verdadero sin confirmación. Registrar las nuevas observaciones antes de otra fase; no rehacer funciones aprobadas.

Consultar también [requisitos](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md), [handoff](docs/continuity/TOKVID_SESSION_HANDOFF.md) y [AGENTS.md](AGENTS.md). La rama `feature/onboarding-profile-interests` se usó como referencia de ZIP, no como base de código.

### Presentación de Información de perfil en APK #217

El usuario aprobó funciones, iconos y medidas de la app y rechazó el formulario de cajas grandes. Se compactan nombre/usuario/descripción, se muestran separadores y contador usado/200, y correo en una franja legible de solo lectura. Guardado, validación y foto se conservan. Esta aclaración está incluida en el binario y sustituye la presentación de #216. La aprobación funcional no equivale a aprobación visual de este ajuste, aún pendiente física.
