# TokVid — auditoría de indicador y fluidez de Actividad/Mensajes

28 de octubre de 2026. Solo auditoría/propuesta; sin implementación. Referencia: APK 313, commit `97ae3a3436477638a1c624f2eb5ce8b4fe984214`, rama `feature/feed-mini-video-avatar`, confirmada en remoto durante esta revisión.

## Petición

El indicador debe acompañar tanto el toque manual de Actividad/Mensajes como el swipe. El usuario quiere una sensación parecida a la fluidez de los emojis de comentarios, con ajuste final a la pestaña (snapping). El refresco más firme de Inbox solicitado anteriormente queda pendiente y no se confunde con el movimiento horizontal. Se conserva la aprobación del perfil y de las funciones existentes.

## Hallazgos

- `artifacts/mobile/app/(tabs)/inbox.tsx:282` utiliza `SwipePositionUnderline` con posición animada, ancho de pestaña, ancho del marcador y color. **No pasa `selectedIndex` ni `moving`**. El componente ya tiene una rama que fija la posición del indicador a la selección confirmada cuando termina el movimiento, usada en el perfil propio. Inbox no recibe esa protección contra valores nativos atrasados. Esto identifica una diferencia concreta que coincide con el fallo manual informado por el usuario; no constituye una nueva reproducción física.
- El toque llama a `selectTab(t)` (`inbox.tsx:269`). `useSectionSwipe` cancela la animación pendiente, coloca la posición y confirma la pestaña. El indicador de Inbox continúa dependiendo exclusivamente del valor animado; el perfil tiene además la posición estática confirmada.
- `useSectionSwipe.ts` usa PanResponder: cada movimiento pasa por JavaScript y llama a `position.setValue`. Solo el tramo de animación final usa `useNativeDriver: true`. Una carga del hilo JavaScript puede afectar al seguimiento del dedo; no se midieron cuadros perdidos en el Motorola durante esta auditoría.
- `sectionSnap.ts:30` utiliza una duración fija de **170 ms** para un gesto rápido o **240 ms** para uno lento, con easing cúbico de salida. El gesto rápido se identifica por velocidad mayor a **0.65 dp/ms**. La trayectoria final no conserva la velocidad como condición inicial de un resorte; la velocidad selecciona principalmente el destino y uno de esos dos tiempos.
- `inboxSwipe.ts:6` reconoce la intención horizontal después de **16 dp**, con predominio horizontal **1.6** frente al vertical. La decisión de cambio lento contempla un avance del **22 %** del ancho. Esas protecciones existentes evitan confundir el swipe con el scroll vertical.
- `CommentEmojiStrip.tsx:32–40` usa FlatList horizontal nativo, `decelerationRate="normal"` y `snapToInterval={pitch}`. Ya combina inercia y ajuste, pero al ancho de cada emoji. Copiar ese intervalo o su recorrido a las páginas completas no sería correcto: la referencia es la sensación de movimiento.
- La barra de Inbox actualmente tiene un indicador de **97 × 2 dp, turquesa `#25F4EE`**. La rayita gris de **22 × 2 dp** pertenece al perfil. Esta petición no autoriza cambiar el tamaño o el color de Inbox; se conservarían.
- El render de páginas ya conserva claves/contenido estable y limita interacción a la página activa. Esa protección debe conservarse. Cabecera y selector están fuera del área horizontal que se mueve.

## Propuesta

1. **Indicador manual:** conectar Inbox con el índice seleccionado (`Actividad=0`, `Mensajes=1`) y su estado real de movimiento. Durante el arrastre y el ajuste, seguir la misma posición fraccional que el contenido; en reposo, quedar centrado bajo la pestaña confirmada. También cubrir interrupción de un swipe con un toque y selección por ruta.
2. **Fluidez:** hacer el seguimiento del gesto en el hilo de interfaz de Android mediante un motor local de Inbox, usando las herramientas ya instaladas. Conservar movimiento proporcional al dedo, cambio de dirección sin levantarlo, dos páginas estables y el ajuste final a una de ellas.
3. **Ajuste final:** proponer un resorte dependiente de la velocidad real de liberación, en lugar de los dos tiempos fijos. Valores iniciales para comparar en teléfono: rigidez **280**, amortiguación **30**, masa **1**, con bloqueo de sobrepaso del destino. Son un punto de partida; no parámetros físicamente aprobados. La velocidad de PanResponder está en dp/ms; la del gesto nativo se expresa en unidades por segundo y debe convertirse, no reutilizarse sin conversión.
4. Mantener inicialmente el umbral horizontal de 16 dp, relación 1.6 y criterio de desplazamiento del 22 %. Un gesto corto debe regresar; uno suficientemente decidido debe completar el paso. No añadir desplazamiento libre que deje la pantalla entre Actividad y Mensajes.
5. Indicador, página visible y selección deben compartir el mismo progreso y destino. Al tocar una pestaña, confirmar su selección de forma fiable; cualquier animación de traslado debe ser interrumpible sin dejar una posición vieja.

## Aislamiento y archivos

La conexión manual se limita a `app/(tabs)/inbox.tsx`, reutilizando las propiedades existentes de `SwipePositionUnderline`. Para una mejora completa de fluidez, añadir un motor/paginador específico de Inbox y conectarlo desde esa pantalla, preservando sus contenidos y medidas. Los nombres y la división exacta de esos archivos nuevos se concretarían al autorizar la implementación.

No cambiar por defecto `useSectionSwipe.ts`, `sectionSnap.ts`, `horizontalDrag.ts` ni `HorizontalSwipePages.tsx`: también gobiernan el perfil que el usuario aprobó. No modificar el componente de emojis de comentarios, Feed, perfil, tipografía, iconos, datos de actividad, conversaciones, rutas, cabecera ni barra inferior. Los cambios en la física horizontal no deben introducir nuevas cargas de datos ni marcar actividades como leídas.

En Android, Inbox utiliza actualmente `RefreshControl` nativo mediante `nativeRefreshFallback`; su envoltorio mantiene 64 dp mientras recarga y vuelve con una animación de 220 ms. Los parámetros de arrastre del fallback JavaScript no gobiernan ese arrastre Android. Por eso el futuro ajuste de fuerza del refresco de Inbox debe tratarse de forma aislada, no cambiando números de un componente compartido ni aplicando a ciegas el resorte propuesto para el perfil.

## Validación pendiente

En Motorola G05 con Android 15: tocar ambas pestañas repetidamente; deslizar lento/rápido en ambas direcciones; invertir el dedo sin soltar; interrumpir el ajuste con otro gesto o un toque; probar listas vacías, cargando y con filas; comprobar que scroll vertical, refresco, toques de fila, menús y navegación mantienen su función. Repetir con gestos y tres botones de Android. Comprobar además que el perfil conserva su comportamiento aprobado.

No se ejecutó esa prueba física ni se generó APK. Se inspeccionó código y se comprobó la referencia remota. Solo se creó este informe fuera del proyecto; las propuestas no se han aplicado.
