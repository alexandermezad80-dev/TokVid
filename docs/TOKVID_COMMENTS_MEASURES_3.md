# Comentarios — revisión del ZIP 3 y del video, 18 octubre 2026

Estado: implementado y comprobado localmente; compilación y validación física pendientes. Esta revisión sustituye las indicaciones de presentación del ZIP 2. No equivale a aprobación física.

## Base y autorización

El usuario aprobó los colores generales, el branding y la miniatura de APK231 (`ba910406234390673436b47c06897fc6afae4e52`, run39092998361) y autorizó auditar las opciones de comentarios y aplicar las referencias nuevas. Después aportó `4Comentarios-medidas-3.zip` y pidió «Mira y corrige», esperando a su video. El video ya fue recibido y revisado antes de continuar. La rama vigente es `feature/feed-mini-video-avatar`; se conserva su HEAD real `3683385f912e9afbfbf6b3684932a3de223bf528` (APK233, intermedia del ZIP2), sin volver a una versión anterior.

Fuentes: ZIP3 SHA256 `506f7844b0926972b8438f5a74e940d378a06977ea9e4e493705bf043e9a8cf2`; grabación `sssscreen-20261018-085607.mp4`, 720×1604, duración26.60s, SHA256 `4a19a704b5620605413c1787ddbc50c862a4c91f05cea2f27add42b7e77251a7`. Se leyeron LEEME, CORRECCIONES y las dos VISTA-FINAL del ZIP3; A/B son referencias, C/D son estado anterior.

## Auditoría observada y cambios

En la grabación se observa desaparición abrupta del cuerpo al abrir el teclado, destello inferior al cerrarlo, campo sin limpiar mientras guarda, indicador grande sobre la lista, texto alto dentro del campo, emojis separados a todo el ancho y @ desalineada. Se ven también errores de reproducción/realtime: la grabación no permite determinar su causa. Esta revisión no altera servicios de conexión ni el reproductor.

- Una misma hoja, lista y TextInput permanecen montados. Cabecera fija. Geometría del compositor actualizada con los eventos nativos del teclado en el hilo de UI; altura y opacidad se interpolan desde el inicio. Fondo continuo oculta el menú inferior del feed durante el cambio. Se conserva el modo de teclado existente y el marco del video aprobado.
- Cuerpo blanco, cabecera56, píldora125×32, cierre14 con toque40, primer avatar a16 y Mostrar95×36 a12 del encabezado. Mostrar conserva su función y usa vidrio azul acero.
- Campo cerrado265×38, x8, avatar28, separación11 y texto «Agregar comentarios». Campo abierto36, avatar28, texto/cursor/contador centrados; emojis y herramientas comienzan en la línea x44, margen derecho10. @ usa Feather at-sign20, igual que las otras herramientas. Se elimina la divisoria entre cabecera y emojis.
- Medidas de los controles escaladas respecto al ancho útil de360 de la referencia (límite0.75–1.5). Evita que el campo265 se vea de aproximadamente232 en la grabación, cuyo ancho lógico es mayor. No se escala ni se mueve el marco del video, ni cambian las filas existentes; hoja comienza8 debajo del marco. La posición final del compositor respeta el borde real del IME, no una altura fija inventada. En teclados especialmente altos, sus controles pueden desplazarse dentro de su espacio sin mover el video.
- Vidrio: tinte #4682B4 al38%, desenfoque24, bordes claros y brillo superior; campo blanco al20%, borde45%, cursor#BFE3FF. Base continua debajo del vidrio evita transparencias hacia el menú del feed durante la animación. El sistema dibuja sus propios botones/gestos de navegación; se respeta el inset medido, sin restarlo dos veces.
- Enviar limpia el campo y cierra el teclado inmediatamente. Una fila local identificada como «ahora · Enviando» aparece con entrada200ms/8px. No tiene acciones ni se confunde con una confirmación del servidor. La confirmación reemplaza esa fila; si falla, se recuperan texto, respuesta o edición. Se conserva la exclusión de doble envío y el ID idempotente del servicio. El indicador de envío mide12 y está dentro del botón; los refrescos automáticos no disparan RefreshControl sobre los comentarios. La recarga manual y la paginación siguen conectadas.
- Siete emojis recientes, inicialmente 😂😍😮😢🔥👏❤️. Al escribir uno con el teclado o tocar la fila pasa al inicio, sin repetirse; se guardan localmente por cuenta. Se detectan secuencias Unicode completas, tonos, familias ZWJ, banderas y teclas. Entradas/movimientos150ms; no se cambia el teclado nativo.

El ZIP contiene nuevamente medidas del marco; prevalece la aprobación explícita del usuario de no reabrir el video aprobado. `VideoCard`, `commentVideoLayout`, la política compartida de teclado y el arranque permanecen iguales. Las coordenadas de la referencia son exactas en360×802 con sus insets; otros tamaños respetan el ancho útil, el marco aprobado y el teclado real.

## Conservación funcional

Se mantienen responder, editar solo propios, eliminar según las reglas ya implementadas, ocultar/restaurar hilos, likes/contadores, ver/ocultar/cargar respuestas, cargar más, abrir perfiles y enfocar comentario desde notificación. Los menús propios continúan Responder/Editar/Eliminar/Ocultar mensajes/Cancelar; los ajenos, Responder/Ocultar mensajes/Cancelar. No se añade ni cambia «Eliminar para todos» en esta revisión. El borrado vigente no se reinterpreta.

Imagen/sticker/menciones/audio permanecen deshabilitados tal como estaban; el ZIP cambia su apariencia, no autoriza servicios nuevos. No se modifican mensajería privada, Auth/OTP, branding, paleta global, perfiles, RPC, consultas, RLS ni migraciones. `useFeedComments.publish` añade únicamente un observador opcional de escritura confirmada antes de la recarga existente. Sus locks, epoch, petición idempotente y guardas se conservan.

## Archivos y comprobaciones

Producción: `CommentsSheet.tsx`, `commentsGlassGeometry.ts`, nuevos `commentSheetMotion.ts`, `useCommentKeyboardMotion.ts`, `commentRecentEmojis.ts`, `useRecentCommentEmojis.ts`, y observador acotado en `useFeedComments.ts`.

Pruebas: geometría en gestos/3botones e IME cambiante; un solo editor; conservación de menús, likes/restauración y cancelaciones; limpieza antes de resolver red, doble toque, recuperación de borrador/respuesta/edición, contexto distinto, reemplazo de fila provisional; confirmación antes de refresh y observador fallido; Unicode/MRU, carga asíncrona y aislamiento de cuentas. En el entorno local, las pruebas ejecutables pasan; el archivo realtime necesita el paquete Supabase no disponible localmente. Se exige su ejecución con dependencias reales y TypeScript en CI antes de entregar.

## Verificación física pendiente

No hay Android conectado/emulador en este entorno. No se presentan dibujos ni mocks como capturas de APK. Comparar en el teléfono: teclado cerrado, abierto y Mostrar; apertura/cierre normal y panel emoji; envío normal, conexión lenta/fallo y reintento; editar/responder/cancelar; tres botones/gestos; marco fijo y ausencia del destello inferior. El error de reproducción y el aviso realtime vistos se registran aparte sin atribuirlos al diseño. `physical_device_verified=false`.
