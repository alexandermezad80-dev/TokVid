# Publicación real y ajustes de comentarios — 8 de octubre de 2026

## Alcance autorizado

El usuario aprobó el diseño previo de comentarios y pidió corregir únicamente lo observado: teclado emoji tapando el editor; menú con «Eliminar» y «Ocultar mensajes»; botón «Mostrar» bajo el encabezado con el mismo tratamiento de color, visible solo mientras existan hilos ocultos; tocar el avatar de un comentario o respuesta abre su autor.

Después autorizó sustituir la pantalla roja de Crear por una composición con cámara/vista previa amplia y controles ordenados, conservando la identidad TokVid en tonos suaves; elegir foto/video de galería y publicar realmente en perfil/feed; buscar las publicaciones desde el feed. Añadió retirar la grilla de ejemplo, mostrar contenido real, separar las tarjetas, redondear ligeramente sus esquinas y usar bordes cian/magenta y el icono TokVid como marca de agua del fondo.

## Implementación

- Crear: cámara y galería, selección única de foto/video, vista previa con reproducir/pausar, descripción, progreso real de transferencia y confirmación del servidor. Cámara/sonido se solicitan al usarlos.
- Archivo nativo enviado desde disco con Expo FileSystem; no se carga un video completo como Blob/base64 en JavaScript. Fotos convertidas a JPEG. Límites: video 3 min / 250 MB, foto 10 MB después de preparación. Cover de video generado con Expo Video + ImageManipulator cuando está disponible; su fallo no impide publicar.
- Reintentos reutilizan el mismo ID y las subidas ya confirmadas. Una respuesta de inserción perdida se verifica antes de presentar un error/duplicar. El guardado exige ID, autor y URL confirmados. Se comprueba la sesión antes y después de subir.
- Propio perfil lee publicaciones reales al enfocarse; ajeno deja de consultar la columna inexistente `url` y usa el mismo lector. Grilla con margen de 6, radio 10, borde degradado y marca de agua del activo oficial `icon_glass_foreground.png`. El estado vacío invita a publicar, sin videos ficticios.
- Nueva ruta `/publication?id=...` abre la foto/video desde perfil o búsqueda. `/search` busca descripción/hashtag y lista recientes. El feed se actualiza al regresar y pausa al perder foco.
- Fotos se representan como imagen, sin intentar reproducirlas como video. Las miniaturas usan `thumbnail_url`; no se interpreta un MP4 como Image. El poster del reproductor se retira al recibir el primer fotograma; pausa mantiene un indicador visible.
- CommentsSheet observa el teclado dentro de su propia ventana Modal con KeyboardProvider y eventos de movimiento/final de insets, además de los eventos RN. La geometría continúa descontando solo la oclusión real de la ventana.
- Se mantienen permisos y semántica del borrado principal/respuesta/ocultación privada. Los títulos nuevos no cambian esas acciones.

## Servidor

Migración oficial aplicada mediante MCP: `20261008010846_support_photo_and_video_publications`.

Agrega `videos.media_type` (`video` por defecto, `image` permitido); habilita JPG/PNG/WebP para fotos/covers en el bucket existente `videos`; permite consultar metadatos únicamente de objetos de la carpeta del propietario autenticado, necesario para confirmar un reintento. Conserva RLS y permisos de INSERT/DELETE del propietario. No modifica Auth/OTP/tokens.

La CLI no estaba instalada y la conexión shell no estaba disponible; se utilizó la migración MCP y se recuperó su versión real del historial para el archivo del repositorio, sin inventar el timestamp.

## Validación y límites

- 101 pruebas locales aprobadas, incluidas 9 nuevas para publicar/reintentar/cambio de cuenta/tamaño/duración y teclado normal → emojis → normal sin cerrar.
- Parsing de los archivos TS/TSX y `git diff --check` aprobados.
- Ensayo SQL con ROLLBACK: publicación de foto propia visible, autor ajeno rechazado por RLS, tipo inválido rechazado, eliminación ajena bloqueada, eliminación propia confirmada. No quedaron publicaciones del ensayo.
- Auditoría de seguridad: no se introdujeron funciones privilegiadas ni avisos vinculados a esta migración. Permanecen los avisos previos de RPC SECURITY DEFINER y protección de contraseñas, fuera de este alcance.
- Entorno local parcial: pruebas TSX usan el adaptador Babel documentado; CI debe validar TypeScript y dependencias reales. APK nueva y prueba física pendientes en esta etapa.
- La galería, cámara, reproducción nativa, emoji IME y subida real desde el teléfono necesitan prueba en el dispositivo. No se simula una publicación del usuario ni se atribuye una prueba física que aún no hizo.
- No se implementó limpieza automática de subidas abandonadas. Los archivos confirmados se conservan para reintentar; no se borran datos del usuario al manejar un fallo de transporte.

## Prueba en teléfono

1. Crear → Galería → elegir un video corto → reproducir/pausar → escribir una descripción única → Publicar.
2. Ver en mi perfil: tarjeta real con miniatura; tocar abre el video. Volver al feed y buscar la descripción desde la lupa.
3. Repetir con una foto; comprobar que se muestra como foto y persiste tras reiniciar.
4. Abrir comentarios, escribir, cambiar al teclado de emojis: el editor y Enviar deben quedar visibles; volver a letras y cerrar teclado.
5. Verificar «Eliminar», «Ocultar mensajes» y que «Mostrar» aparezca solo después de ocultar y desaparezca al restaurar.
6. Tocar avatar propio/ajeno de principales y respuestas: perfil del autor correcto. Conservar el resto del diseño aprobado.

## APK #205 verificada y última aclaración del feed

La compilación #205 (`c35905ae01333428037d4d678c04a9458156525a`) terminó correctamente: 101 pruebas con dependencias reales, typecheck móvil y `BUILD SUCCESSFUL in 19m 19s`. [APK #205](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37712127456/artifacts/11522279327), SHA256 del binario `a815c468d649397a3f2d9f0f42ac078465620c082c3d9bd1a00762a2687abfa0`.

El usuario aclaró después que la publicación debe aparecer en «Para ti» y «Siguiendo». Se conectan los selectores reales: público en Para ti, autores seguidos en Siguiendo, filtrados en servidor antes de paginar. Un autor ve su publicación en su perfil y Para ti; sus seguidores la encuentran también en Siguiendo. No se incluyen publicaciones ajenas a los seguidos para rellenar ese modo. Esta última modificación requiere una nueva APK; #205 no la contiene. Cinco pruebas adicionales verifican el filtrado, imágenes/videos, páginas antiguas, lista vacía y errores. Total local: 106.
