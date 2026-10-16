# TokVid — continuar desde aquí

Actualizado: **16 de octubre de2026 (UTC)**.

## Entrega vigente y aprobación

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **feature/feed-mini-video-avatar**. Conservar el código actual; no volver a main ni a una APK histórica.
- **APK225:** código `835493d04515a6be43d0e2b840a3490a02ba56ed`, árbol `e036fb469c8a9dad406f90adcccf2519ab3a4fd0`.
- [Descargar APK225](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262/artifacts/12015177799): extraer ZIP e instalar `app-release.apk`.
- [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262):135 pruebas aprobadas,0 fallos, TypeScript/prebuild/Android correctos; `BUILD SUCCESSFUL in 26m 6s`.
- [Manifiesto](docs/continuity/APK_225_VERIFICATION.json). SHA256 APK: `b1003255476fae95c4ffb985840e28d0c65dee03438fd0ebe3b0e24b29779cda`.
- [Mapa de fuentes225](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262/artifacts/12014139940). No usar otro mapa para diagnosticar esta APK.
- **APK224 desaprobada por el usuario por el branding de inicio.** Prefiere el anterior; número exacto anterior y causa técnica sin confirmar. Registrado como nota, corrección pendiente. APK225 no cambia el branding ni significa aprobación física.

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

Prueba física del usuario en Android: teclado normal/emojis en chat y edición de perfil, fuente grande, gestos/botones y áreas seguras; colores y contraste en pantallas/modales; compartir directo con apps instaladas; contadores/lecturas entre dos cuentas; tocar notificación versus avatar y privacidad de perfil visitante. Registrar observaciones sin rehacer funciones aprobadas. **physical_device_verified=false** hasta confirmación expresa.

Consultar [handoff](docs/continuity/TOKVID_SESSION_HANDOFF.md), [requisitos](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md) y [AGENTS.md](AGENTS.md). Historial: APK220 fue intermedia; APK224 incorporó paleta global y después quedó desaprobada por branding. APK225 añade los ajustes indicados; no corrige el arranque.
