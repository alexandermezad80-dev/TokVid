# TOKVID — revisión del indicador y gestos del Perfil, 27 octubre 2026

## Petición y evidencia física

El usuario confirma que los iconos, nombres al tocar y demás funciones de APK311 están bien. Reporta que el indicador continúa fallando con selección manual, aunque acompaña correctamente el swipe. La corrección de memoización de APK311 **no resolvió ese defecto en teléfono**; no presentar los tests anteriores como prueba física de éxito.

Solicita mayor fluidez del swipe, nombre de sección también después de deslizar, pull más resistente y retorno firme, continuidad al añadir otro dedo, y ajuste de la barra a la cabecera al subir una distancia regular, pudiendo bajar para ver el perfil completo. Confirma explícitamente: «Sí, más resistencia y mantener el arrastre al añadir otro dedo».

Alcance: Perfil propio y sus gestos. Conservar dibujos, nombres, estilos, medidas, colores, contenido y acciones. Las miniaturas (play/vistas arriba, demás indicadores abajo) continúan **solo anotadas**, sin autorización de implementación. Feed automático sin duplicados y extensión del pull a perfiles visitados siguen como pendientes separados. No mezclar esos trabajos aquí.

## Base y cambios

Rama existente `feature/feed-mini-video-avatar`. Base real `2b3c2ba7c3f0b8036310cd46b2836fdf87efb1f0`, árbol `48f546685def1ba5f9deca 03de3651a2af2e1fb2`. Código de la APK311: `90ca 07cc03b682e45239211fd6d23b8ed850f3a8`. Carpetas locales: snapshots parciales, no checkouts; publicar contra el árbol real con HEAD esperado. No otra rama ni merge a main.

- **Indicador manual:** en reposo, el Perfil usa una vista estática calculada desde la pestaña seleccionada; durante arrastre/snap conserva la vista animada y su seguimiento fraccional. Una actualización nativa tardía no decide la posición en reposo. Se separan ambas vistas para que la limpieza de una animación anterior no restablezca la posición de la nueva. Indicador 22×2 dp, centrado y gris #5B6670, sin cambios de estilo. Inbox no recibe este modo nuevo y conserva 97×2 dp/turquesa.
- **Nombres al deslizar:** selección manual y finalización del swipe pasan por el mismo callback `selectWithHint`. Mantiene la selección y muestra el nombre con el componente, temporización, color y tipografía ya aprobados. No duplicar llamadas por un mismo toque.
- **Fluidez:** se mantiene estable la transformación animada del paginador, evitando reconstruir su conexión cuando cambian el contenido o la sección. Scroll vertical del Perfil deshabilitado únicamente mientras está activo el gesto horizontal. No se reescriben el controlador, los umbrales de swipe, el límite de una página ni sus tiempos 170/240 ms. El componente compartido del paginador mantiene sus dimensiones y comportamiento en Inbox.
- **Pull firme:** ganancia inicial 0.6 (antes 1), disparador de distancia bruta 140 dp (antes 95), spring 420/38/0.8, sin sobrepasar el destino. Conserva recorrido largo con límite suave según el viewport, retoma un arrastre interrumpido sin salto y mantiene círculo azul original, altura 40 dp, separación 8 dp y espera 72 dp. Callback de datos, espera real, prevención de duplicados y retorno tras error conservados. Esta solicitud autoriza cambiar la resistencia antes aprobada; no reabrir las demás partes del refresco.
- **Segundo dedo:** máximo 2 punteros, trayectoria media y desplazamiento acumulado continuo de RNGH; añadir un dedo durante un pull activo no reinicia ni hace fallar el gesto. Se usa `translationY`, que conserva continuidad al cambiar de puntero, en lugar de la coordenada absoluta que puede saltar. El refresco se decide al finalizar el gesto, no al añadir el segundo dedo.
- **Ajuste a cabecera:** al soltar el scroll dentro del tramo del perfil, subida suficiente ajusta a la altura medida del perfil, dejando filtros bajo la cabecera fija; una subida corta vuelve al origen. Umbral 40% con límites 48–88 dp para alturas normales, y nunca más de media altura si el bloque es muy pequeño. Al bajar por ese tramo, retorna a 0 para mostrar el perfil. Movimientos inferiores a 12 dp no disparan el ajuste. El scroll de la cuadrícula más allá de ese tramo sigue libre. No ajustar con dedo todavía apoyado, durante swipe horizontal ni durante refresco. Se usa deceleración nativa rápida solo en Perfil; no alturas fijas para áreas seguras.

Aplicación: `app/(tabs)/profile.tsx`, `components/SwipePositionUnderline.tsx`, `components/HorizontalSwipePages.tsx`, `components/OwnProfileMagneticRefresh.tsx`, `lib/features/profile/ownProfilePull.ts` y el nuevo `lib/features/profile/profileHeaderSnap.ts`. Los estilos completos de Perfil y del contenedor pull son idénticos; `ProfileSectionIcon`, `ProfileTabHint`, el controlador/hook de swipe y el archivo de Inbox se conservan. Sin cambios a Feed, perfil visitado, barra inferior, comentarios, editor, Auth, backend, dependencias o workflows. Los 18 archivos protegidos siguen intactos.

## Verificación y límites

**355 pruebas locales aprobadas, 0 fallos.** Nuevos escenarios: selección manual con posición animada atrasada; nombre tras swipe y toque; exclusión vertical durante swipe; resistencia/retorno; añadir/quitar segundo puntero con saltos de coordenada absoluta; ajuste a cabecera después de soltar, descenso completo, distintas alturas y scroll libre de cuadrícula; bloqueo de ajuste durante otro gesto/refresco. Se conservan pruebas de datos, errores, desmontaje, cancelación, rutas, insets y geometrías SVG.

Se actualizan los contratos de callback y únicamente los hashes del pull y paginador que esta petición autoriza modificar, fijados en `scripts/fixtures/profile-gesture-refinement-hashes.json`; no se alteran los 18 hashes protegidos ni se eliminan escenarios funcionales.

Localmente se usa adaptador Babel externo para TSX: no sustituye TypeScript semántico. Once pruebas FeedRealtime requieren dependencias completas y se ejecutarán en CI. TypeScript real, CI completo, Android y APK nueva pendientes. **Sin emulador/teléfono conectado:** estos tests simulan eventos; la fluidez, resistencia y continuidad nativa con dos dedos requieren revisión física. No declarar aprobado el indicador hasta confirmación del usuario.

## Revisión física prevista y reversión

Alternar toque/swipe en las seis secciones, también interrumpiendo el snap; comprobar indicador y nombre, miniaturas y rutas. Jalar con uno, sostener, añadir otro y continuar; retirar uno sin soltar todos; confirmar que no salta ni retorna antes de finalizar. Pull corto no recarga y pull suficiente recarga una sola vez; errores retornan. Subida pequeña conserva perfil, subida regular fija barra bajo cabecera, descenso vuelve a perfil completo; scroll profundo de cuadrícula no queda atrapado. Probar con gestos y tres botones Android, conservando sus insets reales.

Si requiere reversión, limitarla a estos seis archivos de aplicación y sus tests/docs, manteniendo los iconos y nombres de 311 y las demás funciones aprobadas. No revertir toda la rama ni reutilizar una APK histórica como base completa.
