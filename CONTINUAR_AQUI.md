## Cierre de verificación APK 227 — 18 octubre 2026

Código `a25ef9638cb6d4145cd117125578b69b5bbe7757`. [Descargar APK 227](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410/artifacts/12108250234): extraer el ZIP e instalar `app-release.apk`. [Mapa de fuentes correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410/artifacts/12108210454). Compilación Android: `BUILD SUCCESSFUL in 18m 4s`; 135 pruebas aprobadas, 0 fallos, TypeScript y prebuild correctos. SHA256 APK: `66f73fa066e891c2c46071d467e06aa70f2d61627285c7fbb58d54861085149f`.

Cabeceras, medidas, colores y líneas del ZIP válido implementados; capas blancas identificadas del arranque corregidas. La ausencia del destello requiere prueba en teléfono: `physical_device_verified=false`.

Al cerrar el registro, la rama ya contiene cambios posteriores de comentarios hasta `ba910406234390673436b47c06897fc6afae4e52`. Se conservan íntegros. APK 227 identifica esta entrega visual; no incluye esos cambios posteriores y no debe presentarse como la última compilación de la rama.

[Especificación visual](docs/TOKVID_STEEL_VISUAL_REFRESH.md), [manifiesto](docs/continuity/APK_227_VERIFICATION.json). Los bloques inferiores describen entregas históricas; este cierre sustituye su estado pendiente de APK 227. La paleta azul acero y el correo sobre blanco de la especificación válida prevalecen donde se indican.

---

# TokVid — continuar desde aquí

Actualizado: **17 de octubre de2026 (UTC)**.

## Entrega vigente y aprobación

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **feature/feed-mini-video-avatar**. Conservar el código actual; no volver a main ni a una APK histórica.
- **APK 226:** código `9a162c843231958e4facf428a7e3fb7addae257b`, árbol `ef42c8df29b5126ec7f51475ff00145aade54370`.
- [Descargar APK 226](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777/artifacts/12089588382): extraer ZIP e instalar `app-release.apk`.
- [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777): 135 pruebas aprobadas, 0 fallos, TypeScript/prebuild/Android correctos; `BUILD SUCCESSFUL in 26m 19s`.
- [Manifiesto](docs/continuity/APK_226_VERIFICATION.json). SHA256 APK: `6f973866409bab2765b547a6448a8a1ddaa41d5c7ac8fd6e006d4bf0eb0afe51`.
- [Mapa de fuentes 226](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777/artifacts/12089598314). No usar otro mapa para diagnosticar esta APK.
- **APK 224 desaprobada por el usuario por el branding de inicio.** Corrección pendiente. APK 225 y 226 conservan ese arranque; la entrega no significa aprobación física.

## Corrección puntual de fondos entregada en 226

[Registro completo](docs/TOKVID_CHAT_WALLPAPER_FIX.md). Imagen local limitada al tamaño del contenedor, composición completa sin deformar en chat, miniatura y vista previa. Selector de tres columnas con tarjetas 9:16, ancho máximo 112 dp. Solo dos archivos de presentación modificados; teclado, funciones y preferencias conservados. Validación física pendiente.

## Cambios posteriores a224 autorizados y entregados en225

[Registro completo](docs/TOKVID_POST_224_PROFILE_RELATIONS.md). Biografía A/B se expande tocando texto, solo muestra «Ver menos» expandida; barra exploradora8dp más baja, iconos22dp y anchos/distribución conservados, margen inferior del bloque8dp. Pastilla Seguir→Amigos junto al nombre **solo en B**.

Ambas listas: Amigos/Seguidores/Siguiendo con iconos y sin fondos de botón; botón por persona muestra el nombre de la sección. Lista Amigos de B usa relaciones mutuas de B y todas las páginas. Acciones de seguimiento, contexto y reglas existentes conservados. No hubo migración, cambios de Auth ni del branding. Prueba física pendiente.

## Regla del usuario

«Lo que está hecho no se toca a no ser que necesite una actualización». Conservar lo aprobado y las funciones actuales. No repetir permisos ya concedidos ni interpretar una compilación como prueba física.

El usuario autorizó «ahora sí implementa y documenta estos cambios» y después amplió el alcance: usar la misma lógica de colores en todas las UI. [Registro completo de fase4](docs/TOKVID_PHASE_4.md). La última ampliación es visual, sin sustituir flujos, servicios ni dimensiones aprobadas.

## Decisiones vigentes

- Paleta común gris–turquesa, superficies blancas, texto oscuro, botones negros y acentos cian/magenta. Medios/cámara/reproductores conservan fondo oscuro; tab bar negra y zonas negras superior/correo de Información se mantienen según la referencia. Fondos y burbujas elegidos conservan colores propios.
- Perfil propio/público alineados. Puntos propios abren Información directamente; hamburguesa abre herramientas a pantalla completa. Visitante: Mensajes/Suscripción, sin controles privados; relaciones públicas accesibles. Dueño elige visibilidad de Me gusta/Compartidos.
- Información mantiene el contenido compacto que el usuario aprobó en217; nueva paleta y comportamiento de teclado pendientes de prueba física. Chat usa compositor en flujo y controlador nativo, sin doble cálculo manual. Último mensaje y campo deben quedar visibles. No afirmar aprobación física de estos cambios.
- «Solange» solo como placeholder de su propia cuenta, ligada al ID estable; desaparece al escribir. Otros usuarios ven «Mensaje…». Campo rectangular con borde suave.
- Burbuja Redonda eliminada del catálogo, preferencia anterior normalizada a Clásica. Diez estilos compartidos entre detalles y modal inferior contextual; incluye magenta, cristal grafito y azul.
- Fondos: composición completa sin deformar, mismo componente en chat/miniatura/vista previa; prioridad a ver las olas/sol completos. Nuevos gris y azul.
- Buscar solo muestra campo/teclado al tocarlo en Detalles. Compartir Android muestra iconos del sistema de apps compatibles e intenta abrir esa app directamente. Compartir genérico conserva selector por elección.
- Actividad: fila abre acción concreta/publicación/comentario; avatar de interacciones abre galería blanca independiente. Mensajes abre chat, su contador se limpia al leer y cuenta lo nuevo. No aplicar galería a mensajes.
- Borrar desde Inbox oculta historial solo a esa cuenta, incluidos grupos, con corte temporal del servidor; los mensajes nuevos vuelven a aparecer. No borra conversaciones del otro usuario.
- Comentarios: individual solo autor, principal propio borra hilo completo, respuesta propia conserva ajenas; sin confirmación extra. Modal cubre tab bar y mantiene video pequeño. No reabrir permisos.
- Registro/correo/OTP de ocho dígitos y retorno al feed conservados. No cambiar Auth por defectos visuales.

## Opciones preparadas y límites

Saldo muestra0.00 provisional sin operaciones financieras; Suscripción visible/deshabilitada; QR y eliminación de cuenta preparados, sin servicio activo. Cambiar cuenta/cerrar sesión usan el cierre de sesión existente. Privacidad y Centro de actividades están conectados.

Fondo guardado por cuenta/conversación en este dispositivo. Abrir una app externa no permite demostrar que se terminó de compartir dentro de ella. Los diseños y flujos de cámara/video se conservan.

Migración **20261015005124_profile_visibility_activity_and_personal_inbox** aplicada y registrada. Pruebas SQL revertidas aprobadas antes/después, sin datos de prueba persistentes. No repetir migración ni inventar otra versión. Migración previa20261013102948 de comentarios también aplicada. Ningún cambio de políticas Auth/OTP por la paleta global.

## Siguiente paso concreto

Primero, comparar Ondas, Menta y olas y Doodles en selector, vista previa y chat aplicado: composición completa y tarjetas compactas. Sigue pendiente la prueba física del usuario en Android: teclado normal/emojis en chat y edición de perfil, fuente grande, gestos/botones y áreas seguras; colores y contraste en pantallas/modales; compartir directo con apps instaladas; contadores/lecturas entre dos cuentas; tocar notificación versus avatar y privacidad de perfil visitante. Registrar observaciones sin rehacer funciones aprobadas. **physical_device_verified=false** hasta confirmación expresa.

Consultar [handoff](docs/continuity/TOKVID_SESSION_HANDOFF.md), [requisitos](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md) y [AGENTS.md](AGENTS.md). Historial: APK220 fue intermedia; APK224 incorporó paleta global y después quedó desaprobada por branding. APK225 añade los ajustes de perfiles/relaciones; APK226 corrige la escala de fondos y compacta sus tarjetas. Ninguna corrige el arranque.
