# TokVid — ajustes visuales posteriores a APK 241

Fecha: 22 de octubre de 2026. Rama real: `feature/feed-mini-video-avatar`.
Base real: `70d2c828e054bcf552633480be7b4d1e92d3527e`, árbol `188dbc0e3867188cbb46941e3d58d8c69417ff7d`.

## Autorización y decisiones vigentes

El usuario terminó las observaciones y autorizó «Continúa, revisa, audita y aplica los cambios sin dañar nada ... No cambies otras cosas que no te he pedido». Esta orden sustituye la espera previa de auditoría. La autorización incluye implementación y nueva APK en la rama vigente; NO incluye merge a main. APK 241 se conserva como referencia recuperable. El usuario confirmó parcialmente su aspecto, no una validación completa de todas sus funciones.

La aclaración posterior sustituye expresamente «no modificar medidas del Feed»: la MISMA barra inferior compacta se aplica también al Feed invitado/autenticado. Solo su color permanece negro. Se eliminan los fondos azules de CABECERAS, no el branding ni los degradados de Crear ni los estilos elegidos de burbujas/fondos de chat. La demostración `asi.mp4` solo define desplazamiento del perfil; no autoriza copiar su diseño. La petición inicial de una línea gris se sustituye por una sombra sutil, sin líneas. El usuario retiró expresamente la petición de añadir un indicador de gestos debajo del compositor.

## Auditoría y medidas implementadas

React Native/Expo: medidas de layout en dp y texto en unidades lógicas equivalentes a sp cuando se permite escalado. No se dedujeron dp a partir de píxeles de las capturas.

| Elemento | Base 241 | Nuevo |
| --- | --- | --- |
| Cuerpo Tab Bar Android | 56 dp | 50 dp (−10,7 %) |
| Insets inferiores | `useSafeAreaInsets().bottom` | Igual, sin constantes para Android |
| Inicio/Amigos/Mensajes/Perfil | 22 dp | 21 dp |
| Etiquetas | Inter 500, 10; ancho intrínseco | Inter 500, 10; ancho completo de su columna, una línea |
| Área icono autenticado | 28 dp predeterminados | 25 dp; Crear conserva 28 |
| Padding vertical externo del item | 4 dp | 0; contenido centrado y objetivo táctil de 49 dp tras borde de 1 |
| Separación invitado/perfil visitado | 2 dp | 1 dp |
| Crear | 49 × 30, plus 24, dos degradados | Sin cambios |
| Filtro del perfil | 39 dp; iconos 22; dos bordes de 1 | Misma altura/iconos; sin bordes; sombra mínima |
| Menú acciones de comentarios | Fuente predeterminada 17 | Inter 300, 15, lineHeight 25; iconos 24 y filas intactos |
| Texto comentarios/respuestas | Inter 400, 15/20 | Inter 300, 15/20 |
| Compositor cerrado | 62,5 escalados | 58,5; píldora 4 dp más baja, margen seguro 8 en vez de 12 |
| Compositor abierto | 117,5; encabezado 56 | Sin cambios |

Componentes reales de navegación: `app/(tabs)/_layout.tsx` para Feed, Amigos, Crear, Inbox (Actividad/Mensajes), Perfil y la ruta oculta Descubrir; `components/ProfileTabBar.tsx` para perfil visitado. Cuerpo uniforme de 50 dp; negro solo en Feed, blanco en las demás pantallas con esa barra. La franja Android se pinta coherentemente por ruta mediante el mecanismo existente; reproductores `/publication`, `/saved-feed`, `/liked-feed` y `/tag` conservan negro. No se añade una tab bar a pantallas que no la tenían. La rama nativa de iOS no se rediseña.

El Feed recibe su altura real mediante el callback existente, evitando mantener un hueco antiguo de 56. No se editan su reproductor, rail, texto ni contadores. Cada botón conserva su quinta parte horizontal y acción. Las etiquetas completas corrigen el recorte observado en las capturas.

## Perfiles y cabeceras

`ReferenceHeader` y `HeaderSurface` pasan a blanco opaco idéntico a la página; controles y textos oscuros para conservar contraste. Dimensiones, márgenes, safeTop y acciones se conservan. Cabeceras personalizadas de menú de mensaje y selector de burbujas se aclaran sin cambiar sus contenidos/funciones. Los indicadores superiores de Android solo se solicitan oscuros mientras la cabecera está enfocada; al volver al Feed se libera esa preferencia.

En ambos perfiles, el encabezado queda fuera del ScrollView; avatar, estadísticas, biografía y botones siguen siendo los originales dentro del scroll. `stickyHeaderIndices={[1]}` fija su barra de filtros bajo la cabecera. Al bajar se revela otra vez el perfil. Tocar una miniatura conserva la navegación al reproductor original. Se conserva el cuerpo flexible del perfil visitado en carga/error/contenido, que evita que la barra inferior aparezca en medio durante la transición.

## Comentarios: conservación

Solo fuente del menú/textos y descenso de la píldora cerrada. Mismo ancho, alto, margen izquierdo, controles y animación; «Responder» permanece sin destinatario ni encabezado extra. Sin indicador inferior añadido. Los insets se descuentan una sola vez, también si la ventana modal ya excluye las barras del sistema. El extremo con teclado abierto sigue en 117,5; la interpolación se ajusta únicamente para unir el nuevo extremo cerrado.

Se mantienen: ediciones propias, borrado personal/global, cascada del principal propio, preservación de respuestas ajenas, contadores cero/singular/plural, MRU al reabrir, inercia de emojis, fotos, menciones, dictado, respuestas con video y mini-video. No se modifican servicios, políticas, Auth/OTP ni migraciones. No repetir migraciones anteriores.

## Verificación

- Rama/HEAD/árbol remoto consultados antes del trabajo y antes de publicación. Snapshot local parcial sin `.git`; no se inicializa un historial artificial. Se publica sobre el árbol completo real, con lease y sin force. La diferencia local preexistente de `docs/BRAND_KIT_FILES.json` se excluye.
- 191 pruebas locales aprobadas, 0 fallos: comentarios/teclado/conteos, borrado, funciones de chat, perfiles y navegación. Incluye 6 nuevas pruebas de presentación/rutas/insets 0/16/24/48, controles de perfil y estados de carga/error. La ejecución local utiliza el adaptador Babel disponible; no sustituye TypeScript real.
- Los 11 casos de la biblioteca realtime no pueden ejecutarse aquí sin la dependencia instalada; se ejecutarán en CI con el lockfile existente. El proxy local no permitió descargar TypeScript; no se cambian dependencias del proyecto.
- Comparación de 260 expresiones de eventos JSX: idénticas a la base. Diff acotado a presentación y scroll solicitado.
- CI real, TypeScript, prebuild y APK nueva: pendientes al publicar; registrar cierre con enlaces/checksum.
- `physical_device_verified=false`: no hay emulador/teléfono conectado. La sombra Android, scroll nativo y transición requieren la revisión final del usuario con gestos y tres botones. No se promete ausencia absoluta de regresiones por compilar.

## Archivos modificados

- `artifacts/mobile/app/(tabs)/_layout.tsx`
- `artifacts/mobile/app/(tabs)/create.tsx`
- `artifacts/mobile/app/(tabs)/friends.tsx`
- `artifacts/mobile/app/(tabs)/inbox.tsx`
- `artifacts/mobile/app/(tabs)/profile.tsx`
- `artifacts/mobile/app/_layout.tsx`
- `artifacts/mobile/app/activity-publications.tsx`
- `artifacts/mobile/app/call-history.tsx`
- `artifacts/mobile/app/chat-details.tsx`
- `artifacts/mobile/app/chat.tsx`
- `artifacts/mobile/app/edit-profile.tsx`
- `artifacts/mobile/app/live-chat.tsx`
- `artifacts/mobile/app/live-create.tsx`
- `artifacts/mobile/app/profile-connections.tsx`
- `artifacts/mobile/app/search.tsx`
- `artifacts/mobile/app/story-create.tsx`
- `artifacts/mobile/app/user-profile.tsx`
- `artifacts/mobile/app/user-tools.tsx`
- `artifacts/mobile/components/CommentActionsPopover.tsx`
- `artifacts/mobile/components/CommentsSheet.tsx`
- `artifacts/mobile/components/ProfileTabBar.tsx`
- `artifacts/mobile/components/VideoShareSheet.tsx`
- `artifacts/mobile/components/reference/HeaderSurface.tsx`
- `artifacts/mobile/components/reference/ReferenceHeader.tsx`
- `artifacts/mobile/constants/palette.ts`
- `artifacts/mobile/context/RegistrationContext.tsx`
- `artifacts/mobile/lib/commentSheetMotion.ts`
- `artifacts/mobile/lib/commentsGlassGeometry.ts`
- `artifacts/mobile/lib/features/live/LiveChat.tsx`
- `artifacts/mobile/lib/features/live/ShareLive.tsx`
- `artifacts/mobile/lib/features/messages/components/BubbleStylePicker.tsx`
- `artifacts/mobile/lib/features/messages/components/MessageMenu.tsx`
- `scripts/tests/comment-glass-presentation.test.cjs`
- `scripts/tests/comment-motion-emojis.test.cjs`
- `scripts/tests/profile-navigation-presentation.test.cjs`

## Base conservada

APK 241: [compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39605038448), [APK](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39605038448/artifacts/12348508340), [mapa correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39605038448/artifacts/12348774084). BUILD SUCCESSFUL in 26m 45s; 196 pruebas CI, TypeScript y prebuild correctos. SHA256 `d96c62a64e45598e81440f05035777fde19d36dadd51d2fce8e191ce0c3c179a`.

Un APK no se fusiona a Git: el merge conserva código. Mantener ambos APK y sus commits permite comparar; decidir main después de la aceptación física y revisar su diferencia sin sobrescribir otras ramas.
