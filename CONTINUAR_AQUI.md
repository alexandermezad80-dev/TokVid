> **Nueva revisión autorizada después de APK224:** ajustes de perfiles A/B, botón Seguir→Amigos solo B y listas Amigos/Seguidores/Siguiendo con iconos sin fondo de botón. Implementación y compilación en verificación. **APK224 desaprobada por el usuario por el branding de inicio; prefiere el anterior.** Branding pendiente de diagnóstico/corrección, sin rollback general. Leer [registro vigente](docs/TOKVID_POST_224_PROFILE_RELATIONS.md). Esta nota sustituye la condición anterior de solo prueba física pendiente.

# TokVid — continuar desde aquí

Actualizado: **15 de octubre de2026 (UTC)**. Este estado sustituye las notas anteriores de fase4 «en implementación», APK pendiente y APK217 como última entrega.

## Entrega vigente

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama: **feature/feed-mini-video-avatar**. No volver a main ni al snapshot de onboarding para continuar.
- Código del binario: **`e7f8309ca1d820d467f8ad8fee7dde8e2b468dbb`**. Un cierre documental posterior no cambia el código incorporado en esta APK.
- [Descargar APK#224](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741386976/artifacts/11976997023): extraer el ZIP e instalar `app-release.apk`.
- [Compilación#224](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741386976): **132 pruebas aprobadas, cero fallos**, TypeScript móvil y Android correctos; `BUILD SUCCESSFUL in 19m 38s`.
- [Manifiesto/checksum](docs/continuity/APK_224_VERIFICATION.json). SHA256 del APK, distinto del ZIP: `e052dc935bfc5543723f84890b4918fa2a8de23800de3b578852d65eb5635eb9`.
- [Mapa de fuentes de esta misma APK](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741386976/artifacts/11977006949). Diagnóstico y commit verificados dentro del bundle. No usar el mapa de una APK anterior.

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

Consultar [handoff](docs/continuity/TOKVID_SESSION_HANDOFF.md), [requisitos](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md) y [AGENTS.md](AGENTS.md). APK220 fue una compilación intermedia sin la ampliación global de colores; APK#224 la sustituye.
