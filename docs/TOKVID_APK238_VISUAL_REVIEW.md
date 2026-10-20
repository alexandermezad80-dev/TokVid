# Ajustes autorizados tras la revisión de APK 238

20 de octubre de 2026. Rama `feature/feed-mini-video-avatar`; no se trabaja sobre `feature/onboarding-profile-interests`. El usuario terminó la pausa de observaciones con «implementa estos cambios» y después pidió corregir «Responder a», que se pegaba al borde superior. Este registro y las aclaraciones posteriores prevalecen sobre especificaciones históricas.

## Base conservada

Código de APK238: `51341d48cc1a90c1e4f855f58a075c5a4d5f2a86`, árbol `500b7089e3eb618444af50fb04949abfefb21f1d`. [Compilación238](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39256465576) correcta, `BUILD SUCCESSFUL in 25m 39s`. [APK238](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39256465576/artifacts/12190046390), [mapa correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39256465576/artifacts/12189856563). SHA256 `4ccab923911eac8df37c9db90ace0e939aac7443f0b40990fa705fb1543d4956`.

El usuario confirmó previamente colores, branding y tamaño del video minimizado. Se conservan esos avances. Las capturas de238 motivan los ajustes siguientes; no constituyen aprobación visual de la siguiente APK. Generar una APK no garantiza conservar funciones: se conserva el padre real, se revisan los cambios y se ejecutan regresiones.

## Decisiones implementadas

- Tipografía Inter400 para texto y500 para jerarquía discreta; no negrita sintetizada sobre la fuente nombrada. Se mantiene la carga existente de fuentes. Iconos y catálogo Unicode/animaciones no cambian. Auditoría AST:53 archivos contienen exclusivamente cambios de `fontFamily`/`fontWeight`; el resto corresponde a los ajustes explícitos siguientes.
- Información de perfil: Nombre encima del valor, correo sin prefijo visible «Correo:», dirección de una línea con ajuste de tamaño, biografía regular y justificada. Conserva guardar, límite200, foto, recorte y teclado.
- Perfil propio y visitado: avatar84→90dp, columna90dp y separación16→10dp para conservar el comienzo del texto. Botones conservan84dp de ancho y pasan32→29dp de alto, compensando el crecimiento. Saldo/Suscripción en A y Mensajes/Suscripción en B conservan acciones/permisos y disponibilidad. Biografía justificada, línea17dp y margen derecho24dp; sigue expandiéndose al tocarla.
- Primera publicación: sustituir el bloque grande por un + discreto y «Comparte tu primera foto o video», texto14dp regular, conservando abrir Crear.
- Inbox: Actividad/Mensajes, nombres y estado vacío más ligeros; círculo negro del estado vacío pasa al gris exacto de comentarios `#F0EFEC`.
- Barra inferior: cuerpo64→56dp más inset real; mismos cinco destinos, iconos22dp y Crear49×30dp/icono24dp. Inbox blanco incluido el espacio inferior Android; feed negro incluido ese espacio. Perfiles conservan fondo oscuro de barra y comparten56dp. El perfil visitado incorpora los cinco destinos existentes. No se dibujan botones de Android falsos: se solicita contraste al sistema y se pinta el fondo bajo su inset.
- Comentarios cerrados: píldora conserva265×38dp de referencia. Margen izquierdo10.5dp, igual al contador, y separación4dp por encima del inset inferior medido. El margen no se resta dos veces si el modal ya excluye la barra del sistema. Compositor cerrado54.5dp; abierto117.5dp, encabezado56dp y geometría de miniatura/IME conservados.
- Respuesta: «Responder a @usuario» se muestra dentro del mismo campo, centrado entre arriba y abajo, hasta dos líneas con espacio reservado para cancelar respuesta y contador. La presentación del texto vacío no captura toques; se conserva un único TextInput, el borrador y el destinatario accesible. La X de cancelar respuesta sigue dentro de la píldora.
- Edición: se elimina el encabezado «Editando comentario · Cancelar». Editar carga el texto original y enviar actualiza ese mismo comentario; cerrar el panel abandona edición y restaura el borrador previo.
- Emojis: al seleccionar mientras se explora horizontalmente NO se salta la lista. Enviar conserva el cierre inmediato del teclado. Al reabrirlo se desplaza a0 y se aplica el orden de recientes, con el último usado al principio. Conserva MRU por cuenta, secuencias completas, catálogo3781, inserción, animaciones y recuperación ante fallos.

## Eliminar y Eliminar para todos, solo comentarios del feed

La auditoría de238 encontró que «Eliminar» llamaba al borrado global. Ahora existen dos acciones exclusivas del autor:

| Acción | Resultado |
| --- | --- |
| Eliminar, principal propio | Se quita de mi vista todo su hilo. Los demás conservan el hilo. Preferencia persistida por cuenta/publicación. |
| Eliminar, respuesta propia | Se quita esa respuesta de mi vista; se conservan las otras. |
| Eliminar para todos, principal propio | RPC existente elimina el hilo completo, evitando respuestas huérfanas. |
| Eliminar para todos, respuesta propia | RPC existente elimina esa respuesta, conserva las ajenas y reasigna sus descendientes al padre correspondiente. |

Nunca se habilita editar/borrar una respuesta ajena por ser dueño de la publicación o del mensaje principal. Ocultar/Mostrar conserva su preferencia independiente: Mostrar no recupera lo eliminado de mi vista. El borrado personal no modifica el total público. Los cambios se confirman con servidor; fallos o cambios de cuenta/video no afectan contenido actual. No se modificó el borrado de mensajería privada.

Se conservan Copiar, Guardar/Quitar de favoritos (el VIDEO del feed), Responder con video (PUBLICACIÓN vinculada al comentario), Editar y Ocultar mensajes. El menú inferior sigue cerrándose al tocar fuera, sin filas Responder ni Cancelar.

Migración **20261020024705_dismissed_feed_comments** aplicada a `kvbppgofblldwnkkoscb`, MD5 de statements `0485b0431e4d36b49f8840debcceb633`. No repetir. Tabla de preferencias con RLS, lectura solo propia e inserción solo de comentarios propios del video indicado; sin UPDATE/DELETE para authenticated ni acceso anon. FK elimina preferencias cuando desaparece el comentario. No se altera el RPC global ni Auth.

## Validación y límites

- 180 pruebas ejecutables locales aprobadas. Este entorno usa un adaptador Babel para ejecutar pruebas TS/TSX; esto NO equivale a typecheck. `feed-realtime.test.cjs` necesita la dependencia Supabase ausente aquí: CI ejecutará la suite completa y TypeScript real.
- Prueba SQL transaccional con dos identidades, rollback confirmado: aislamiento, idempotencia, persistencia, suplantación rechazada, respuesta ajena rechazada, video incorrecto rechazado, contadores conservados, Mostrar independiente, respuesta global conserva/reasigna descendientes y principal global elimina hilo/preferencias. No quedan registros de prueba.
- Asesor de seguridad posterior sin incidencias de la tabla nueva. Avisos existentes de funciones definer/Auth fuera de este alcance.
- Base de archivos contrastada contra el árbol remoto. Un archivo Live tenía únicamente salto final normalizado en el snapshot; contenido exacto comprobado antes de publicar.
- Apariencia de barra Android usa la ventana de la actividad y las ventanas RNModal visibles, reaplicada al `onShow`. Getter público verificado en [React Native0.81.5](https://github.com/facebook/react-native/blob/v0.81.5/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/modal/ReactModalHostView.kt). Prueba JS verifica restauración al cerrar comentarios; la compilación nativa y la comprobación física son etapas separadas.
- Pendientes al preparar este registro: CI completo, typecheck, prebuild, compilación/artefacto APK y comprobación física. No se declara prueba visual en teléfono/emulador.
- No se diagnosticó ni se atribuye solución al error de reproducción visible en las capturas: no forma parte de esta corrección visual.

## Archivos y conservación

Presentación: `app/(tabs)/{_layout,profile,inbox}.tsx`, `app/{_layout,edit-profile,user-profile}.tsx`, `components/{CommentsSheet,CommentEmojiStrip,ProfileTabBar}.tsx`, `lib/{commentsGlassGeometry,commentSheetMotion}.ts`, `hooks/useSystemNavigation.ts`, `plugins/chat-native/ChatToolsModule.kt`; otros53 archivos solo tipografía. Función de borrado personal: `hooks/useFeedComments.ts`, `lib/features/comments/services.ts`, SQL/migración. Regresiones: scripts de comentarios, emojis, geometría, barra de sistema y SQL rollback.

Conservar publicación/feed, Auth/OTP/Google, miniatura de video, controles del teclado, fotos, chat privado, compartir, follows, likes/favoritos, notificaciones y las opciones todavía deshabilitadas por diseño. No usar textos históricos de este Master para reabrir branding aprobado ni volver al menú flotante antiguo.
