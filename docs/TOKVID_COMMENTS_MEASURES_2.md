# Comentarios: segunda referencia sobre APK 231

18 octubre 2026. Cambio de presentación autorizado por el usuario; implementación en validación.

## Base y alcance confirmado

- Base que indicó el usuario: [Android APK 231](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39092998361), código `ba910406234390673436b47c06897fc6afae4e52`, compilación correcta. [APK de base](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39092998361/artifacts/12123577792).
- Padre de publicación `cf1a424cddf34356d52f8e3064d974e00651c4fe`: mismo código de 231, más documentación de la entrega 227. Rama `feature/feed-mini-video-avatar`.
- El usuario confirmó expresamente corregidos los colores globales, el branding y el video minimizado. Se conservan. Solo autorizó auditar comentarios y aplicar la apariencia/medidas del ZIP nuevo sin perder opciones.
- Fuente: **Cccomentarios-medidas-2.zip**, SHA256 `ed1ba3c64bc994e7ecf00e84cf86f233cdd48cf22c42bf17900ac0ed2c83aa7a`. Contiene dos referencias A/B, tres capturas actuales C/D/E y dos documentos de medidas/correcciones. A/B son el objetivo; C/D no son un diseño nuevo.
- Las instrucciones antiguas del ZIP acerca de corregir de nuevo la miniatura y crear opciones que ya existen quedan sustituidas por la aprobación del usuario y la auditoría de 231. No se cambia VideoCard, commentVideoLayout, el indicador de carga del reproductor, Auth, mensajería privada ni base de datos.

## Auditoría previa entregada al usuario

| Área | Encontrado en APK 231 | Conservación |
| --- | --- | --- |
| Publicar | Confirma guardado antes de vaciar, quitar foco y cerrar teclado; fallos conservan borrador | Mismo handler y hook |
| Edición/respuesta | Editar solo propio; guardar/cancelar edición restaura borrador; responder y cancelar respuesta | Mismos handlers, botones accesibles |
| Menú propio | Responder, Editar, Eliminar, Ocultar mensajes, Cancelar | Mismas opciones y permisos |
| Menú ajeno | Responder, Ocultar mensajes, Cancelar | Sin permisos nuevos |
| Hilos/likes | Expandir/ocultar respuestas, más páginas, likes y sus contadores, refrescar/recargar | Conservados |
| Ocultos | Ocultar hilo y restaurarlo con Mostrar | Solo presentación de Mostrar cambia |
| Editor | Un TextInput, Unicode hasta 300, envío habilitado por contenido/ocupación | Un solo campo durante ambas vistas |
| Emojis | Siete botones activos y teclado nativo Android | Mismos caracteres y handlers |
| Imagen, sticker, @, micrófono | Visibles, explícitamente deshabilitados | Continúan deshabilitados; no se inventan servicios |
| Video pequeño | Geometría 155×275, y42 y espacio8 en referencia360×802; independiente del teclado | Archivos y bloque de preview sin modificación |

Las propuestas históricas de nuevas reglas «Eliminar para todos» en comentarios no se implementan durante este ajuste visual. No se eliminan opciones existentes ni se cambian las reglas actuales de borrado.

## Presentación aplicada

Referencia 360×802 dp. Se conserva el inicio de la hoja calculado desde el video aprobado (y325 en esa referencia).

| Pieza | Resultado |
| --- | --- |
| Cabecera | 56dp en ambos estados; asa32×4 a y6.5 |
| Recuento | mínimo125×32, x10.5/y14, texto15 semibold; puede crecer sin invadir X/cancelación |
| Cerrar | X14×14, trazo SVG2 blanco; toque40×40, centro y30 y22 del borde derecho |
| Primera fila | Avatar16dp bajo cabecera; mismos márgenes entre filas, fuente y acciones de la app |
| Mostrar | 95×36, x11.5, 12dp bajo cabecera; siguiente avatar10dp después; vidrio azul acero, sin degradado rosa |
| Campo cerrado | 265×38 desde x8; avatar28 desde x17; texto15 desde x55.5 y flecha centrada x255 |
| Barra cerrada | 74dp, campo a12.5dp desde arriba; en referencia gestos y728–802 |
| Pieza abierta | y325–471.5 en referencia; termina en el teclado real, no en una altura prefijada |
| Emojis | fila y57–77, siete símbolos16dp; prevalece la medida específica de sección6 sobre el18dp residual de sección8 |
| Campo abierto | y80–116, alto36, avatar28 en x10, entrada desde x44 hasta350, radio13; contador alineado al centro de su altura |
| Herramientas | y119–143, iconos20 separados20; enviar44×24; quedan3.5dp hasta teclado de referencia |
| Teclados altos | Formulario desplazable si falta altura, manteniendo el editor y la miniatura; no dibuja ni redimensiona el teclado Android |

Color base vidrio `rgba(70,130,180,0.38)`, borde `rgba(200,225,248,0.50)`, brillo blanco superior, texto blanco. La lista sigue blanca. Se elimina la capa blanca que antes quedaba detrás de la cabecera y se evita aplicar dos tintes sobre la misma superficie. La cancelación de edición/respuesta conserva su acción y queda dentro del área táctil raíz, sin superponerse al recuento.

Desenfoque: Expo BlurView existente con intensity24 y blurReductionFactor1. En [Expo SDK54 Android](https://github.com/expo/expo/blob/sdk-54/packages/expo-blur/android/src/main/java/expo/modules/blur/ExpoBlurView.kt), el radio se divide por blurReductionFactor (valor predeterminado4); se evita reducir24 a6. El resultado GPU y su equivalencia visual con la referencia necesitan teléfono real; no se afirma equivalencia física exacta de filtros distintos.

Zona inferior: la referencia deja23.5dp dentro de su barra para gestos compactos (inset redondeado hasta24). Para insets mayores se reserva fuera de la barra el valor completo medido. Con inset42, la barra queda y686–760 y el campo y698.5–736.5. Se limita al borde real de pantalla/Modal para no restar la zona segura dos veces cuando la ventana ya la excluye. No se supone que todos los teléfonos tengan42dp.

## Archivos y comprobaciones

Código de aplicación: solo `artifacts/mobile/components/CommentsSheet.tsx` y `artifacts/mobile/lib/commentsGlassGeometry.ts`.

Pruebas: se actualizan las expectativas de geometría del ZIP anterior y se añaden casos de barra de tres botones/Modal ya recortado. Nuevo harness de CommentsPanel prueba borrador entre teclados, emojis, envío confirmado/fallido, menú propio/ajeno, likes, restaurar ocultos y cancelación de edición.

- 49 pruebas dirigidas aprobadas localmente.
- Auditoría textual: handlers de menús/acciones, renderizado de filas, envío y emojis idénticos a231.
- Hashes sin cambio de VideoCard, commentVideoLayout, useOverlayKeyboard, useKeyboardSheetViewport, useFeedComments, raíz y app.json.
- Suite local:142 pruebas aprobadas; una suite no puede cargar `@supabase/supabase-js` en el entorno local. CI con dependencias reales verificará la suite completa y TypeScript antes de compilar Android.
- No hay dispositivo/emulador Android conectado en este entorno. No se presentan capturas reconstruidas como si fueran pruebas de la APK. Pendientes las capturas reales de teclado cerrado, abierto y Mostrar, como pide el ZIP.
- `physical_device_verified=false` para esta presentación nueva. La confirmación del usuario sobre colores/branding/miniatura de231 sí queda registrada y no se reabre.
