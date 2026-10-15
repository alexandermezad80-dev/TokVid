# TokVid — fase 4 autorizada, 14 de octubre de 2026

Estado: implementado y compilado en APK224, código `e7f8309ca1d820d467f8ad8fee7dde8e2b468dbb`. Verificación automática aprobada; prueba física pendiente. Base remota `0e217d8cbc6ce668677bc66613d77b33c826bf03`, rama `feature/feed-mini-video-avatar`. El usuario autorizó «ahora sí implementa y documenta estos cambios» después de aportar referencias. Las aclaraciones aquí registradas prevalecen sobre fases anteriores.

## Decisiones que conservar

- El contenido compacto de Información de perfil de APK 217 fue aprobado físicamente. No rehacer guardado, validación, fotos ni estructura. Su teclado y el del chat siguen necesitando corrección: compilar no equivale a probarlos en teléfono.
- Comentarios: edición/borrado individual solo por autor; borrar el principal propio elimina el hilo. Conservar comentarios, mini video y tab bar tapada; no reabrir esas decisiones.
- Buscar en detalles del chat solo muestra campo y teclado al tocarlo. Las funciones existentes se conservan.
- Saldo y Suscripción visibles; no inventar un servicio financiero. Las nuevas pantallas preparadas no significan cobros activos.
- El placeholder personalizado «Solange» se aplica **solo a la cuenta de Solange**, confirmado expresamente. No a otros usuarios ni a mensajes enviados.

## Alcance y criterios de aceptación

1. **Información de perfil:** cabecera negra `#0B0B0D`, esquinas inferiores 20, zona de avatar con degradado de referencia, contenido editable blanco y correo sobre negro. Teclado cubre zona negra/correo; solo desplaza lo necesario para nombre, usuario o descripción. Avatar puede quedar parcialmente bajo la cabecera fija. Al tocar fuera se oculta el teclado y se restaura el desplazamiento. Separación pequeña y línea fina, sin hueco grande. Respetar insets Android reales.
2. **Perfil propio:** puntos superiores abren directamente Información de perfil; se elimina menú intermedio. Hamburguesa abre pantalla completa con Saldo, Herramientas de usuario, Centro de actividades, Ajustes y privacidad, Código QR, Eliminar cuenta, Cambiar cuenta, Cerrar sesión. Destinos preparados a pantalla completa; Saldo 0.00 es marcador explícito del diseño. Perfil con degradado gris/teal moderado, pestañas slate y grilla blanca. Mantener medidas actuales o menores que den espacio, nunca agrandar por copiar otra resolución. Avatar rectangular redondeado y borde de marca muy fino.
3. **Perfil público:** mismo diseño; Mensajes reemplaza Saldo, Suscripción visible. Sin hamburguesa ni puntos privados. Amigos permanece: muestra relaciones públicas y permite seguir/dejar de seguir desde la cuenta visitante. Solo Me gusta y Compartidos tienen visibilidad elegida por el dueño; no exponer otros controles privados ni datos privados mediante consultas.
4. **Feed propio/invitados:** columna lateral alineada, iconos de calidad equivalente a navegación, sustituir flecha de compartir rechazada; contador de cada acción. Avatar real con borde de marca muy fino; + de seguir más cerca. Compartir muestra iconos reales de apps instaladas y abre destino directamente, sin segundo selector. Conservar envío interno.
5. **Chat y detalles:** cabecera degradada de referencia con texto/iconos blancos y esquinas inferiores 20; contenido blanco. Detalles conserva opciones/estructura; botones y chips negros con iconos blancos, Denunciar rojo. Conservar flecha actual si es mejor. Buscar conserva activación puntual.
6. **Teclado chat:** editor entero sobre teclado, margen pequeño; último mensaje visible sin buscarlo; historial desplazable, cabecera fija. Teclado normal y emojis, cambios de altura, gestos y botones Android. Campo personalizado rectangular de bordes suavemente difuminados sin perder forma; placeholder Solange solo en su cuenta, desaparece al escribir y vuelve si vacío.
7. **Burbujas:** quitar Redonda del catálogo y normalizar preferencias antiguas a Clásica. Previews Hola de una línea sin deformar Elegante. Menú contextual de mensaje se conserva; Burbujas abre hoja inferior blanca con cabecera degradada, no otro popover lateral. Detalles conserva lista desplegable y comparte catálogo/colores. Añadir Magenta y dos estilos glass sobrios gris/azul. Persistencia y compatibilidad con clientes antiguos.
8. **Fondos:** los 8 originales 1080×2400 se ven completos, proporcionados y sin zoom/estiramiento (olas/sol incluidos), tanto chat como miniaturas/vista previa. Aunque se mencionó cover, prevalece ver la imagen entera: contain y relleno acorde cuando difiere la proporción. Añadir gris neutro y azul neutro.
9. **Inbox:** usar medidas del PDF, blanco, cabecera degradada y pestañas slate. Menú de conversación blanco: Eliminar para mí y Eliminar todos los mensajes. Confirmación blanca/roja para borrar la bandeja propia; no borrar historial ajeno ni mensajes nuevos que lleguen después del corte confirmado.
10. **Actividad:** mensajes tienen contador de no leídos que se limpia al entrar al chat; una notificación nueva comienza otro conteo. No galería para mensajes. Comentarios, likes de video/comentario, compartidos y favoritos tienen contadores separados por actor/tipo; tocar fila abre acción más reciente y destino exacto. Tocar avatar abre pantalla nueva de miniaturas relacionadas con esa actividad, fondo blanco y cabecera con colores/formas/medidas de Actividad. No exponer actividad ajena privada. Conservar navegación de seguir y otros tipos existentes.

## Medidas y colores de referencia

Las medidas se expresan en dp sobre 390 de ancho; los insets reales de Android reemplazan el ejemplo de 38. No escalar usando píxeles de capturas.

- Chat/Detalles: alto de contenido de cabecera 52.5 más inset superior, radio inferior 20; degradado 110° `#5F6A74`, `#76818B` (50%), `#2F9A9F`. Títulos blancos, controles táctiles 44. Información de perfil: zona negra de referencia 96 total, correo alto46/radio13, fondo `#161823`, borde `#2C2C2E`, texto `#8A8B97`.
- Perfil principal: controles 38 más inset, zona degradada referencia196.5; no agrandar medidas actuales. Herramientas: cabecera 96 total de referencia, degradado `#6B7885`→`#1FA5A9`, filas56, margen20, iconos22, texto17. Tarjeta Saldo margen20/fondo `#F9F9F9`/radio16, etiqueta15 y valor32.
- Hoja Burbujas: radio24, cabecera64, asa60×4, fondo blanco, backdrop negro50%, filas64/gap4/margen12/radio14, texto17. Seleccionado `#F1FAFA`/borde `#2F9A9F` 1.5. Preview84×40; Compacta60×32. Clásica `#7A64BE`; Minimalista blanco/borde `#2B4A8B`; Cristal `#E6E9EC`/`#C3C9CF`; Degradado `#5F6A74`→`#2F9A9F`; Borde suave `#FFF6E5`/`#E8B04B`; Elegante `#161616`; Compacta `#1F8A5B`.
- Inbox: cabecera38 más inset, título22, pestañas42 `#232F39`, activo blanco/inactivo `#9AA5AE`, indicador97×2 `#25F4EE`. Filas90, avatar48/margen15/texto empieza74, nombre15/mensaje14/hora13. No leído `#FFF1F3`, badge `#FE2C55`. Popover304/radio16/filas56. Confirmación310/radio20, botones46 y rojo `#E5393A`.

Fuentes: Medidas-Inbox-completo.pdf; Medidas-Encabezado-Detalles-del-chat-y-Chat.pdf; Medidas-y-colores-Estilo-de-burbuja.pdf; Medidas-Herramientas-de-usuario-y-Saldo.pdf; capturas e imágenes Chat-con-fondo-*.png de los ZIP suministrados. Se archivará texto extraído para continuidad.

## Registro de implementación y comprobaciones

Implementados: cabeceras compartidas, perfiles propio/público y privacidad, menú de herramientas a pantalla completa, teclado nativo del chat y desplazamiento por campo en Información, 10 estilos de burbujas con catálogo común, fondos completos y dos fondos neutros, iconos/contadores del feed, compartir directo en Android, Inbox blanco, borrado privado y navegación de actividad con galería separada.

- Cuenta personalizada: se resolvió la cuenta existente de Solange y el placeholder se vincula a su ID estable; no se activa por coincidencia de nombre.
- Android: el editor ya no usa `useOverlayKeyboard` ni una altura absoluta manual. `KeyboardAvoidingView` del controlador nativo reduce el área desplazable y mantiene el compositor en el flujo; no hay segunda compensación de altura. Los comentarios conservan su geometría aprobada.
- Burbujas: Redonda antigua se normaliza a Clásica, sin borrar preferencias de instalaciones anteriores. Magenta, Cristal grafito y Cristal azul se añaden a las siete variantes de la referencia. Las vistas previas tienen ancho/alto propios.
- Fondos: `ChatWallpaper` aplica contain dentro del área de conversación; miniaturas conservan aspecto1080/2400 y vista previa usa el mismo componente. Gris y azul son degradados neutros.
- Compartir: el módulo Android enumera un conjunto limitado de apps compatibles, obtiene sus iconos del sistema y utiliza intent explícito por paquete; no lanza un segundo chooser al tocar una app. El contador de compartir se registra tras abrir el destino, no demuestra que el usuario haya terminado de enviarlo dentro de esa app.
- Actividad: admite las claves históricas `video_id/comment_id` y las actuales `videoId/commentId`. La galería consulta solo notificaciones de la cuenta y vuelve a aplicar RLS al obtener publicaciones. Un comentario eliminado informa su ausencia; un hilo oculto conserva la preferencia del usuario.
- Mensajes: leer chat limpia los avisos de mensajes de esa conversación; el listener de UPDATE refresca Actividad. Otras actividades conservan su contador de eventos por actor/tipo; mensajes muestra solo no leídos.
- Borrado de Inbox: límite temporal del servidor capturado antes de confirmar; ocultación privada, grupos incluidos, sin eliminar membresía ni historial de otros. Los nuevos mensajes posteriores vuelven a la bandeja.
- Herramientas preparadas: Saldo provisional sin operaciones financieras; Suscripción deshabilitada; QR y eliminación de cuenta pendientes de sus servicios. Cerrar sesión y cambio mediante cierre de sesión usan el servicio existente. Ajustes de visibilidad y Centro de actividades sí conectados.

Migración **20261015005124_profile_visibility_activity_and_personal_inbox** aplicada y registrada oficialmente el 15 de octubre. No cambió Auth/OTP ni eliminó datos de usuarios. Añade RLS para preferencias, funciones acotadas para perfiles/relaciones públicas, contadores/avisos y ocultación de grupos. La prueba `profile-activity-phase4.rollback.sql` pasó antes y después de aplicarla y revirtió todos sus datos temporales.

Preflight **27a677af2b9adffe2da7b4e82ef6eb2e7c4bd4ae**, [Check chat phase](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38662224924): **132 pruebas aprobadas**, TypeScript y prebuild Android aprobados. Después, se verificaron 40 pruebas focalizadas por la integración final de contadores y navegación. El primer preflight detectó una expectativa antigua de un único listener de notificaciones; se actualizó para incluir lecturas UPDATE manteniendo las pruebas de reconexión y descarte de callbacks retirados.

APK220 del bloque inicial compiló correctamente (commit e22f7d05339144d252dcb42e6fc422e9e2f68b4d, run38662627176). No es la entrega final: el usuario amplió después el alcance a colores de toda la app. La apariencia, teclado normal/emojis y apertura de apps requieren prueba física; no están confirmados en teléfono.


## Ampliación autorizada: misma lógica de colores en todas las UI

El 15 de octubre, durante la compilación del bloque anterior, el usuario pidió aplicar la misma lógica de colores a todas las pantallas de TokVid. Se implementa como actualización de presentación sobre el trabajo existente. Esta autorización amplía la paleta a las áreas que todavía conservaban el tema oscuro; no autoriza rediseñar flujos ni cambiar servicios de Auth, LIVE o publicación.

Fuente común: `artifacts/mobile/constants/palette.ts`. Blanco para superficies, gris claro para campos/tarjetas, texto oscuro, botones negros con etiquetas blancas, degradado gris–turquesa en encabezados y cian/magenta como acentos de marca. Los enlaces sobre blanco usan un turquesa más oscuro para ser legibles. Rojo se conserva en acciones destructivas y verde en aceptar llamada. El aspecto oscuro del sistema no reemplaza esta presentación.

`ReferenceHeader` y `HeaderSurface` comparten la paleta. El segundo aplica colores a los controles existentes, sin cambiar sus acciones. En pantallas completas consume el inset superior una sola vez; en paneles internos no añade otra franja de estado. Se mantienen las áreas seguras inferiores.

| Área | Aplicación de la paleta |
| --- | --- |
| Perfil propio/público, Información, herramientas, relaciones, actividad, Inbox | Conservan las referencias ya aplicadas; su familia de color es la base común. Menú de fotografía ahora blanco. |
| Amigos y descubrimiento/búsqueda | Encabezado degradado, contenido blanco, texto oscuro, botones negros y pestañas slate. |
| Chat privado/grupos, reenviar/traducir/denunciar, historial de llamadas | Superficies claras y cabecera común; controles y funcionamiento conservados. |
| Comentarios y menús de acciones/compartir | Panel blanco, texto oscuro, cabecera degradada cuando existe. Se conservan geometría, video pequeño, borrados y teclado. |
| Registro y retorno Google/correo | Presentación clara; se conserva el mismo flujo, OTP de ocho dígitos y destino de retorno. Logo oficial de Google sin recolorear. |
| Historias y publicación | Creación de historia y formulario de publicación claros; cámara, fotografía/video y vista previa conservan fondo oscuro para el medio. |
| LIVE | Crear/gestionar/compartir/chat/efectos/invitaciones y actividades con superficies claras. La transmisión y controles sobre video conservan contraste oscuro. Ningún cambio en permisos ni servicios LIVE. |
| Avisos globales, llamada entrante, errores | Superficies claras legibles en cualquier pantalla; controles de aceptar/rechazar mantienen sus significados. |

Excepciones deliberadas de la misma lógica: reproductores Feed/guardados/likes/hashtags/publicación, visor y recorte de fotografía, cámara, historias reproducidas, llamada/video y LIVE conservan superficies oscuras para el contenido. La tab bar inferior negra y las zonas negras superior/correo de Información de perfil mantienen la referencia explícita aprobada. Las burbujas, fondos elegidos y logos de aplicaciones mantienen sus colores propios. Las rutas que redirigen no agregan pantallas nuevas.

Las medidas, funciones y tipografías aprobadas no se sustituyen para aplicar colores. El badge de pestaña Actividad se ajusta a17dp/11sp del PDF; los contadores de filas permanecen20dp/12sp. El mock visual del test de retorno Auth recibe la paleta nueva; sus comprobaciones de navegación y restauración no cambian.

Verificación local inicial:132 archivos TypeScript/TSX analizados sin errores sintácticos y24 pruebas focalizadas aprobadas. La suite completa y TypeScript reales se ejecutan en CI; no confundir el adaptador Babel local con un typecheck real. Pendiente registrar el resultado de CI y binario final. La comprobación física de colores, safe areas y teclado sigue pendiente.


### Verificación de la paleta antes de compilar

Preflight307261ee8f8525338977eb9f6dfb7b1a3f9a0c80: [CI38741012970](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741012970),132 pruebas aprobadas, TypeScript móvil y prebuild Android correctos. La primera pasada requirió cargar la paleta real en el entorno de prueba de llamadas; la segunda señaló comparaciones de estado redundantes en estilos de publicación, corregidas sin cambiar el flujo. Revisión final: iconos de estado oscuros sobre superficies blancas de carga, controles de medios blancos sobre oscuro y safe areas de Efectos. La nueva APK vuelve a ejecutar las132 pruebas y TypeScript.

Contraste medido de los tokens de texto sobre sus fondos: texto principal19.66:1, secundario7.73:1, placeholder sobre campo4.75:1, enlace turquesa4.97:1, texto de botón18.10:1, error4.94:1. Estas comprobaciones no sustituyen revisión visual en teléfono. El degradado de referencia conserva sus colores originales.

`app.json` fija presentación clara para los diálogos nativos de la app. No cambia el tema de Android ni instala un teclado. Los fondos de medios permanecen definidos explícitamente en negro.


## Entrega final — APK#224

[Descargar APK](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741386976/artifacts/11976997023) · [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38741386976) · [Manifiesto](continuity/APK_224_VERIFICATION.json).

Código `e7f8309ca1d820d467f8ad8fee7dde8e2b468dbb`, rama `feature/feed-mini-video-avatar`. **132 pruebas, cero fallos**, TypeScript y Android correctos. `BUILD SUCCESSFUL in 19m 38s`. Diagnóstico y mapa de fuentes corresponden al mismo binario. SHA256 del APK: `e052dc935bfc5543723f84890b4918fa2a8de23800de3b578852d65eb5635eb9`. Incluye el bloque completo y la ampliación de paleta global; sustituye220 como candidato de esta fase. Las notas previas de APK pendiente quedan cerradas por esta entrega.

La migración y las pruebas SQL figuran arriba; no hay otra migración por unificar colores. Sin validación física todavía. Herramientas financieras, QR y eliminación de cuenta mantienen el alcance de pantallas preparadas; no se presentan como servicios activos.
