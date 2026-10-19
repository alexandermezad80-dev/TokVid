# Comentarios K4 — auditoría e implementación, 19 octubre 2026

Estado: implementado, comprobaciones locales en curso; CI/Android y prueba física pendientes. K4 sustituye la presentación del ZIP3. No reabrir miniatura, minimización, ubicación de la hoja, animación, envío ni diseño de filas.

## Base y autorización vigente

El usuario pidió implementar/auditar comentarios sobre la APK231, aportó ZIP3 y la grabación, y después añadió `k4.zip` durante esa misma tarea. Se entregó la auditoría de diferencias en el chat antes de editar la aplicación y se continuó dentro del alcance autorizado. El archivo especifica mantener lo que funciona y sustituir únicamente la presentación y ampliar la fila de emojis.

Archivo K4 SHA256: `85c491ad259fe8d78f322c54bb6520109297f00e36c8b6089d6d0ae835391a07`.

Base remota real: `0386f81cd2353f689505f93db4bb889cee1709b0`, árbol `5be10a7699653ae0e881bde607cafe9252e54230`, APK235. Esa compilación terminó con167 pruebas, TypeScript y Android correctos (`BUILD SUCCESSFUL in 19m 17s`). [Manifiesto235](continuity/APK_235_VERIFICATION.json). Corresponde al ZIP3 y no se presenta como resultado final de K4.

## Resultado de auditoría antes del cambio

Ya existen y se conservan: marco del video y minimización; una hoja/editor montados durante el IME; flujo de envío inmediato con recuperación del borrador; lista con scroll; cabecera56, píldora125×32, primer avatar a16, texto «Agregar comentarios», contador300, estados de envío y herramientas. Responder, editar propios, eliminar, ocultar/restaurar, likes, perfiles, paginación y enfoque desde notificaciones mantienen sus llamadas y permisos.

Cambios necesarios: superficies opacas blancas en ambos estados; píldoras gris claro y texto oscuro; X/tirador negros; Mostrar sin degradado/vidrio; campo y fila de herramientas hasta x344; espacios abiertos6/10/14/9.5; fila horizontal con siete visibles, catálogo amplio, carga de celdas virtualizada y20 recientes guardados.

La referencia usa360×802 como lienzo y etiqueta como dp la mitad de los píxeles. Se mantiene la escala proporcional de controles ya existente, el marco aprobado y la posición de la hoja. En otros tamaños, el compositor sigue al IME real; el espacio extra queda entre cabecera y emojis. Para teclados más altos que el mínimo117.5 de controles, se conserva el scroll interno existente, sin mover el video ni cambiar la animación.

## Implementación acotada

- Hoja/cabecera/lista/compositor #FFFFFF, opacos y sin divisorias, sombras ni desenfoque. La lista recorta su contenido entre cabecera y barra inferior.
- Píldora de total, campo cerrado, campo abierto y Mostrar: #F0EFEC, borde#DCDCDC1, texto#131313. Ayuda/contador/flecha cerrada#6B6B66. X y tirador#1C1C1E. Herramientas#3A3F47. Enviar mantiene azul#4682B4 y flecha blanca; cursor azul acero.
- Tamaños previos conservados: cabecera56, píldora125×32, cierre14 con toque40, avatar28, campo cerrado265×38 x8. Campo abierto36 entre x44 y344, margen derecho16. Iconos20 con paso40; botón44×24. Espacios6,10,14,9.5; compositor abierto mínimo117.5 bajo cabecera56. La geometría modifica medidas, no el controlador ni los tiempos de animación.
- Nueva `CommentEmojiStrip`: área300, glifos18, paso47, siete completos visibles, recorte lateral y ajuste al soltar. FlatList horizontal virtualiza las celdas (14 iniciales y lotes14). No se crean miles de vistas juntas.
- Al elegir un emoji se inserta íntegro; si no cabe en el límite de300 no se inserta una secuencia parcial. Los20 recientes se guardan por cuenta con el almacenamiento local existente. Datos anteriores de siete recientes se conservan.
- Mientras se navega por la fila, el orden visible queda estable; cambios de recientes esperan a volver al inicio. Allí se aplican con entrada/movimiento150ms. No se altera el campo ni la selección del teclado nativo.

## Catálogo: limitación de plataforma comunicada

Android/Gboard no ofrecen a una app acceso al catálogo privado completo ni a su orden personalizado. Se comunicó esta limitación antes de implementar. Se incluye el conjunto RGI completo de Unicode Emoji16.0:3781 secuencias, en orden CLDR, precedidas por recientes sin duplicados. Los dibujos los renderiza Text con la fuente del teléfono. Su disponibilidad/apariencia depende de esa fuente y el orden puede diferir del teclado instalado; no se afirma haber extraído el catálogo de Gboard ni que todos los teléfonos soporten los mismos glifos.

Datos: `https://github.com/unicode-org/unicodetools/blob/main/unicodetools/data/emoji/16.0/emoji-test.txt` (3781 registros fully-qualified); copia de [Unicode License V3](licenses/UNICODE_LICENSE.txt). No hay descargas al deslizar ni permisos nuevos.

## Auditoría de datos — solo lectura

Proyecto TokVid `kvbppgofblldwnkkoscb`. Consultas de metadatos confirmaron `server_encoding=UTF8`, `public.comments.text` de tipo`text`, y triggers `tokvid_internal.validate_feed_comment`/`validate_feed_comment_edit` con límite `char_length(... ) <=300`. `char_length('😀')=1`; familia`👨‍👩‍👧‍👦=7`. Coincide con `Array.from(text).length` del contador actual. Conversión UTF8 de ida/vuelta de texto con emojis conservó el valor.

Los tests del servicio conservan exactamente texto/emoji en argumentos RPC y respuesta, y el límite300. No se insertaron comentarios de prueba públicos ni se modificaron tablas, políticas, funciones o Auth; el guardado real entre dispositivos no se considera demostrado por esta consulta de lectura. Un emoji compuesto puede contar como varios caracteres y se conserva esa regla actual.

## Archivos y validación

Producción: `CommentsSheet.tsx`, `commentSheetMotion.ts`, límite local en `commentRecentEmojis.ts`; nuevos `CommentEmojiStrip.tsx`, `commentEmojiOrder.ts`, `commentEmojiCatalog.ts`. `useCommentKeyboardMotion`, `useFeedComments`, servicios/modelo de comentarios, teclado compartido, video, branding, chat privado, perfiles y paleta global permanecen idénticos a235.

Pruebas: conservación del panel y sus acciones; colores/medidas; geometría segura y tamaños de IME; catálogo Unicode/duplicados/secuencias; siete glifos completos;20 recientes; congelación de orden al deslizar y retorno al inicio; selección sin recorte parcial; envío/recuperación y round-trip de texto/emoji del servicio. CI con dependencias reales debe completar la suite, TypeScript y Android antes de entregar.

No hay dispositivo/emulador Android disponible. Las capturas VISTA-FINAL son referencias del usuario, no capturas de esta APK. Pendiente comparar en teléfono teclado cerrado/abierto/Mostrar, scroll de comentarios, fila larga y retorno al inicio, errores/reintento, gestos/3botones y fuentes disponibles. `physical_device_verified=false`.
