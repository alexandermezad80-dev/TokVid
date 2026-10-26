# TOKVID — corrección aislada de swipe y snapping, 26 octubre 2026

## Entrega APK310 — 26 octubre 2026

Código `7d785ac29cd3cae441b95cd3d3b22d7b04f63728`, árbol `77e4f4e0dfba39e03a8d6d3af7ae62c6769dc4e4`, rama `feature/feed-mini-video-avatar`. [Descargar APK310](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40366879684/artifacts/12673095843): extraer el ZIP e instalar `app-release.apk`. [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40366879684); [mapa de fuentes de esta misma APK](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40366879684/artifacts/12671658563). SHA256 APK: `5f81b66241b3081da622a85213bbb450fca4c957a9071141bcab3734805f8a77`. **350 pruebas CI aprobadas, 0 fallos; TypeScript real, prebuild y Android correctos.** `BUILD SUCCESSFUL in 24m 45s`. Se conserva el código aprobado de refresco de APK308 y los 18 hashes protegidos. Sin cambios de iconos/tipografía, Feed, barra inferior, dependencias, backend ni merge a main. APK309 no se entrega: sustituida por310 al corregir el caso de posición nativa casi entera; sus callbacks ya seleccionan índices válidos.

`ci_verified=true`, `physical_device_verified=false`, `emulator_verified=false`. La aprobación física del swipe está pendiente; no atribuirla a la compilación. Conservar APK308 como referencia de su refresco aprobado. [Manifiesto](continuity/SECTION_SWIPE_SNAP_VERIFICATION.json).

## Autorización vigente

Tras revisar el video correcto `swipe 20261025-213414.mp4` y elegir swipe con snapping, el usuario ordena: «Bueno, continúa tu trabajo. Eso es lo único que vamos a hacer, vamos a ver cómo queda. Vamos a irnos poquito a poquito. No toques lo que ya está hecho». Se interpreta como autorización para implementar, validar y entregar esta corrección acotada. **No incluir los ajustes locales previos de los seis iconos/nombres ni Feed automático**: permanecen pendientes. No cambiar tipografía, iconografía, posiciones, tamaños o funciones ajenas.

Indicador solicitado: **22 dp de ancho para la rayita bajo los iconos**, centrada en cada sexta parte de pantalla, con gris de los iconos inferiores del Perfil blanco (#5B6670). Altura actual de 2 dp conservada. No confundir con los iconos, también de 22 dp, que no cambian. Barra propia mantiene 39 dp, distribución, sombras e iconos anteriores.

## Evidencia y causa

Video de 17.945 s, 720×1604: alrededor de 7.3 s aparece «Sin videos compartidos» mientras el corazón está seleccionado, y a 7.4 s vuelve su miniatura. Al entrar en Guardados (3.5–3.8 s) la segunda fila aparece al final porque la altura de la sección anterior recorta la entrante. El video anterior `212screen-20261024-072119.mp4` fue descartado por el usuario para esta revisión: era referencia vertical. El video correcto muestra Perfil y reproductor, no Inbox; los fallos de Actividad/Mensajes se reprodujeron en la lógica compartida y se reportan como tal.

El paginador anterior cambiaba la identidad, posición y contenedor activo mientras seguía una animación nativa. Un segundo gesto partía del índice lógico y no de la posición visible. Tocar durante la animación podía dejar la selección desincronizada. El blanco adicional del Perfil estaba fuera del detector.

## Implementación limitada

- `HorizontalSwipePages.tsx`: coordenada fija por sección, misma key/contenedor y traslado independiente del índice activo; vistas inactivas sin acciones/accesibilidad. Conserva la última presentación activa como vista previa al salir, sin cambiar datos ni consultas. Reinicia por usuario mediante key en las dos pantallas.
- Altura medida por página; durante el movimiento contiene las páginas vecinas completas. Al terminar, recupera altura de la página seleccionada. Perfil tiene altura mínima para ocupar la cuadrícula blanca y el separador existente permanece dentro de la zona del gesto, sin invadir cabecera, avatar o barras.
- `sectionSnap.ts` + `useSectionSwipe.ts`: arrastre horizontal de un dedo, mismos umbrales direccionales; lee posición nativa al interrumpir y conserva movimientos recibidos antes de esa respuesta. Callbacks antiguos se invalidan. Arrastre corto retorna; suficiente o rápido encaja en vecino, como máximo una sección por gesto. 170/240 ms, curva suave sin rebote. Selección al finalizar; un toque de pestaña (incluso la actual) interrumpe y selecciona de inmediato. Limpieza al desmontarse y reproducción de efectos de StrictMode comprobadas.
- Integración solo en Perfil propio e Inbox Actividad/Mensajes, los dos consumidores del paginador. En Inbox el indicador acompaña el desplazamiento conservando 97 dp × 2 dp y turquesa #25F4EE; sus letras, botones y distribución se conservan. El requisito de 22 dp/gris corresponde al indicador de los iconos del Perfil.
- `SwipePositionUnderline.tsx`: indicador del Perfil de 22 dp × 2 dp, centrado y gris #5B6670. Sigue la misma posición animada del contenido.

## Base e integridad

Rama existente `feature/feed-mini-video-avatar`, padre real `c58ed57fb6e3a32449a4b08892ec36e7d44c697a`, árbol `b60a45f9a98055982612c96eb2157d73dd360764`. No crear otra rama ni hacer merge a main. Carpetas locales: snapshots parciales, no checkouts Git; publicar sobre árbol real y con verificación de HEAD esperado. El trabajo previo de iconos se conserva aparte, sin sobrescribirlo ni incluirlo en esta entrega.

Los 18 hashes protegidos siguen intactos. `OwnProfileMagneticRefresh.tsx` = `58d5b80d8153223cd904fc8c637a8b90c5663b2e` y `ownProfilePull.ts` = `e1320754a3ffcb9c0694c3a7e1f78d271cab8f24`: se conserva el refresco propio aprobado de APK308. Recarga de datos y contenido de cada sección comparados contra la base; estilos completos de Perfil e Inbox idénticos. Feed, perfil ajeno, barra inferior, cabeceras, avatares, fotos, herramientas, permisos, Auth, backend, migraciones, dependencias y workflows intactos. Los hooks de datos siguen actualizando al seleccionarse; no se promete eliminar sus cargas de red ni se altera la política de recarga en esta reparación visual.

## Pruebas y estado de entrega

**339 pruebas locales aprobadas, 0 fallos**, incluidas 13 nuevas sobre snapping/interrupciones, selección tardía, toque de pestaña actual, callbacks nativos demorados, límite de una sección, bordes, identidad/altura de páginas, vistas previas, indicador, gestos verticales/multitáctiles, desmontaje y StrictMode. Se adaptaron comprobaciones de integración de las pruebas anteriores sin retirar escenarios funcionales ni modificar sus hashes protegidos.

Límite local: adaptador Babel externo para TSX, no TypeScript real; once pruebas de `feed-realtime.test.cjs` requieren dependencias reales disponibles en CI. CI completo final: 350 pruebas aprobadas, TypeScript real, prebuild y compilación Android correctos; APK310 entregada en el bloque superior. No hay teléfono/emulador conectado: la fluidez, arbitraje nativo entre scroll/swipe/refresco y todas las alturas deben comprobarse en APK. No declarar aprobación física por pasar pruebas JS o compilar.

## Matriz para revisar la APK

Perfil: cuadrícula vacía, una fila y varias; arrastre desde miniatura y desde blanco; avances/regresos cortos y rápidos; invertir a mitad del snap; tocar pestaña actual u otra mientras se mueve; Guardados con segunda fila; ningún mensaje de otra sección; una miniatura sigue abriendo su reproductor. Cabecera/avatar/barras fijos respecto al swipe; scroll vertical y pull aprobado conservados. Inbox: Actividad/Mensajes vacíos y llenos, scroll vertical conservado, interrupciones y selección coherentes. Probar con tres botones y gestos de Android sin cambiar sus insets.

## Reversión y pendientes

Reversión acotada: restaurar solo los cuatro archivos de aplicación existentes modificados y retirar los dos módulos nuevos, junto con sus pruebas/documentación de integración. Nunca revertir toda la rama ni la APK308 aprobada. Los seis iconos/nombres, el Feed automático sin duplicados y la extensión del refresco a perfiles visitados quedan fuera de esta entrega. No mezclar pendientes en una corrección de swipe.
