# Seguimiento autorizado — 1 noviembre 2026

Base: APK315 aprobada, `7d5e5d0a353b223f52b5a388364a08c23f19e71c`, rama
`feature/feed-mini-video-avatar`. Sin rama nueva ni merge a main.

El propietario autoriza mayor resistencia progresiva y retorno firme **en todos
los lugares donde ya existe refresco por gesto**, conservando dos punteros,
recargas, swipe, pestañas adhesivas y presentación aprobada. Inventario: perfil
propio/visitado, Actividad/Mensajes (vacíos y con contenido), chats privados y
grupales, búsqueda y comentarios. Feed conserva la decisión independiente de
refresco automático sin duplicación de solicitudes.

Compartidos debe guardar una referencia por vídeo ajeno compartido aunque se
envíe a varias personas. La miniatura no muestra destinatarios. Compartir dentro
de TokVid genera actividad al destinatario que abre el contenido exacto; también
se solicita para historias propias/ajenas, conservando caducidad y acceso. No
equivale a poder identificar destinatarios o confirmar entregas en otras apps.
Quitar de Compartidos elimina la referencia personal, no el original ni mensajes.

Pendientes autorizados relacionados: favoritos inmediatos con reconciliación y
reversión ante error; miniaturas del perfil con play/vistas arriba a la derecha y
estados abajo; Feed automático sin refrescos duplicados. No modificar estilos,
dimensiones, iconos, funciones o rutas fuera de la necesidad descrita.

Estado al 3 noviembre: implementación preparada para CI. Sin nueva APK ni
prueba física. Backend aplicado y verificado según el cierre inferior. Los snapshots anteriores y sus cierres documentales se conservan.
El snapshot local no es un checkout Git; publicación contra padre/árbol reales
con comprobación del HEAD remoto y lista explícita de archivos.


## Aclaraciones posteriores

- Compartir y Me gusta son independientes. Compartir **desde** la lista Me gusta
  registra el envío; dar/quitar un corazón nunca añade ni elimina referencias.
- 3 noviembre: captura1000186184.jpg. El propietario observa un trazo más grueso
  en corazón y comentarios que en Favoritos, **como sugerencia**. Recomendada
  únicamente igualación de grosor; todavía no implementada ni autorizada como
  nueva edición. Tamaño, altura y separación aprobados; conservarlos.
- No existe campo de vistas/reproducciones en `public.videos`. Se preguntó si se
  inicia un conteo real nuevo o se aplaza ese punto. Sin respuesta, se deja
  pendiente; no se inventan números ni se cambia `PublicationThumbnail`.

## Verificación local del trabajo en curso

18 pruebas de física/gestos pasaron, incluidos dos punteros, fallo de red,
finalización tardía y cabecera. 4 pruebas de favoritos pasaron: propagación entre
pantallas, retorno al estado anterior ante fallo, consultas limitadas al elemento
seleccionado y bloqueo de doble toque. Aún falta TypeScript real/CI/Android y
validación física. El TypeScript local es una adaptación para transpilar, no el
compilador semántico real. El backend fue aplicado y verificado posteriormente; ver el cierre inferior.


## Backend aplicado — 3 noviembre 2026

Migración real `20261103164341_shared_content_references_and_delivery` aplicada
al proyecto TokVid. Archivo conservado con la versión devuelta por el servidor;
no había CLI Supabase instalada, se utilizó el MCP oficial para DDL.
Prueba SQL con rol `authenticated` y rollback completo: envío atómico, reintento
sin duplicado, video/historia exactos, historia propia, rechazo de caducada,
quitar referencia sin eliminar original/mensajes, nuevo envío que restaura una
sola referencia y aislamiento entre usuarios: **aprobada**. No quedan mensajes,
notificaciones ni publicaciones de prueba. Se preservan los avisos al creador.
`videos` se incorpora a Realtime para sus contadores ya públicos; relaciones
privadas de favoritos permanecen privadas. Sin cambios a funciones anteriores.
Los trazos del corazón/comentarios siguen sin modificar.


## CI real — 5 noviembre 2026

Código publicado: `52fa5a773ffcb9de12c0d48d2d61733e7b50bb87`, misma rama.
[Intento316](https://github.com/alexandermezad80-dev/TokVid/actions/runs/42039499608):
**389 pruebas aprobadas, cero fallos**. TypeScript detectó tres incompatibilidades
de tipos en las referencias del contenedor de refresco; no se generó APK.
Corrección limitada a `CommentsSheet.tsx` (tipo de la referencia nativa) y
`ResistantRefresh.tsx` (props compatibles con Reanimated y reenvío de referencia).
Sin cambios a estilos, física, datos, dependencias ni workflows.

La implementación se concentra en `ownProfilePull.ts` y `ResistantRefresh.tsx`
para el gesto; Inbox, chat privado/grupal, búsqueda y comentarios conectan sus
listas existentes. Los motores de perfil y paginadores aprobados se conservan.
Feed solo retira el interceptor de pull y evita solicitudes concurrentes en
`useVideoFeed.ts`, manteniendo su recarga al entrar/volver.

Compartidos: `VideoShareSheet.tsx`, `visibility.ts`, `useMySharedVideos.ts` y
los puntos existentes de compartir registran referencias; `ActivityBanner.tsx`
y `story-viewer.tsx` abren el contenido concreto. Quitar de Compartidos está en
el menú por pulsación larga de la miniatura propia y no afecta Me gusta.
Favoritos: `changes.ts`, `useSavedVideos.ts` y `useVideoSaveCount.ts` propagan el
cambio entre instancias y revierten ante fallo.

Pendiente de prueba física: sensación del arrastre en Motorola G05/Android15,
uno/dos dedos, convivencia con swipe, y navegación/gestos y tres botones.
Los tests automáticos no equivalen a esa aprobación. El dibujo del corazón y
comentarios y los contadores de vistas de miniaturas siguen fuera de esta entrega.


## Comprobaciones adicionales durante la compilación317

Código de aplicación `cc287937ff56b327e00bf1b17f4e0f60e84a21d2`: TypeScript real,
pruebas de CI y prebuild aprobados; Android en curso al registrar este punto.
Dos pruebas locales adicionales, sin cambios de aplicación: contador de
favoritos optimista frente a lecturas antiguas/error y coalescencia de carga
inicial/recarga/paginación del Feed con deduplicación. Ambas aprobadas
(6 pruebas del archivo `favorites-live-followup.test.cjs`, cero fallos).
Se conservarán en el cierre; no atribuir estas dos pruebas nuevas al run317.

Comparación de contenido contra la base315: `VideoActions`, `VideoCard`,
`PublicationThumbnail`, `OwnProfileMagneticRefresh`, `VisitedProfileRefresh`,
`ProfilePullRefresh`, `PullRefreshUnderHeader`, `InboxSwipePager`,
`HorizontalSwipePages`, `useSectionSwipe`, `useSystemNavigation`, `palette` y
`app/(tabs)/_layout.tsx`: **idénticos**. Las declaraciones de estilo de las
pantallas modificadas también se conservan. Esto no sustituye la prueba física.


## Observación de trazos — auditada, no implementada

En `VideoActions.tsx`, corazón vacío y comentarios usan Feather a tamaño28;
Favoritos usa un SVG de28×28 con `viewBox`24×24 y `strokeWidth=1.65`
(unidades del SVG, no dp directos). No basta cambiar una propiedad de grosor
en los glyphs Feather. Propuesta pendiente: conservar sus contornos, tamaño28,
colores y estados, y dibujar únicamente los dos contornos con el grosor de
Favoritos. Contenedores52×mínimo48, gap6 entre acciones y gap4 con contador
permanecen aprobados. No se modifica `VideoActions.tsx` en esta entrega.


## Entrega317 — 5 noviembre2026

> **5 noviembre 2026 — APK317 entregada: resistencia del pull, Compartidos y favoritos.** Código `cc287937ff56b327e00bf1b17f4e0f60e84a21d2`, rama `feature/feed-mini-video-avatar`. [Descargar APK317](https://github.com/alexandermezad80-dev/TokVid/actions/runs/42056157887/artifacts/13431026905) (extraer ZIP e instalar `app-release.apk`); [compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/42056157887); [mapa de fuentes](https://github.com/alexandermezad80-dev/TokVid/actions/runs/42056157887/artifacts/13431636671). SHA256 APK `b0c2458aa2aee168038071caceab71c3c1c0a7a8d199290751fb4b9677373aca`. **389 pruebas CI aprobadas, cero fallos; TypeScript real, prebuild y Android correctos**, `BUILD SUCCESSFUL in 25m 59s`. Dos pruebas locales adicionales de contador/Feed también aprobadas y conservadas en el cierre; no pertenecen al run317. Resistencia progresiva en los refrescos por gesto Android; Feed automático sin pull ni solicitudes duplicadas. Compartidos guarda referencias de videos ajenos/historias y la actividad interna abre el contenido exacto; quitar referencia conserva original/mensajes. Favoritos se actualiza de inmediato con reversión ante error. Migración `20261103164341_shared_content_references_and_delivery` aplicada y probada: no repetir. Estilos, medidas, iconos y paginadores aprobados conservados. Trazo de corazón/comentarios: sugerencia pendiente; vistas de miniaturas pendientes de conteo real. **Prueba física de esta versión pendiente**, especialmente Motorola G05/Android15; sin merge a main. [Registro y límites](continuity/REFRESH_SHARING_VERIFICATION.json). Este cierre sustituye los estados pendientes históricos inferiores.

El cierre conserva documentación y dos pruebas adicionales, sin modificar el
código de aplicación de la APK317 y sin reconstruir Android. El intento316
no produjo APK; quedó sustituido por317 tras corregir los tipos.
