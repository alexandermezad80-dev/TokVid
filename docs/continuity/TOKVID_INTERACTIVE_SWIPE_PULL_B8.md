# TOKVID — B8: swipe horizontal interactivo y pull elástico (solo gestos)

**Base de APK aprobada como mayormente correcta:** `746851d5bfea371d7f7235e5b9022d4cd284b53f` (GitHub Android APK run [40033393756](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40033393756), success). La existencia de una APK NO prueba aún aceptación física de todos los gestos.
**Rama única:** `feature/feed-mini-video-avatar`. Dueño autorizó explícitamente **solo** movimiento horizontal continuo reversible y pull elástico, protegiendo lo que funciona.

## Referencias visuales del dueño (23-oct-2026)
- Video de pull: `screen-20261023-173419.mp4`: cabecera fija; cuerpo acompaña el dedo hacia abajo, abre hueco blanco, se retrae con suavidad. **Mantener solo círculo azul `ActivityIndicator` de TOKVID; no copiar los dos puntos de la referencia.**
- Video de swipe: `screen-20261023-175625.mp4`: el comportamiento actual cambia pestaña al soltar; el deseado es arrastre horizontal reversible **sin levantar el dedo**, con velocidad al soltar, contenido acompasado y línea bajo iconos siguiendo posición, iconos seleccionados en negro y demás grises.
- **Perfil ajeno sin swipe horizontal:** solo grilla de videos. No tocar `app/user-profile.tsx` ni su `ProfilePullRefresh`.
- **Perfil propio:** cabecera, avatar, estadísticas, tab bar sticky **39dp** y las **6 pestañas** fijas e intactas; solo mueve contenido bajo ellas y posición del pequeño indicador inferior. No alterar dimensiones, nombres, color del resto de iconos, acciones, grilla, estados, rutas.
- **Inbox:** mismo arrastre bidireccional entre Actividad y Mensajes, dejando fija su cabecera y pestañas, conservando su indicador de refresco y color existente.

## Cambio estrictamente aislado
- Nuevo módulo funcional `lib/features/gestures/horizontalDrag.ts`: normaliza desplazamiento a páginas, invierte sin soltar, limita endpoints y al soltar considera desplazamiento y velocidad.
- Nuevo `components/HorizontalSwipePages.tsx`: muestra página original y vecinas cercanas (no renderiza seis grillas simultáneamente), mantiene alto original del contenido del perfil/flex Inbox, solo traslada horizontalmente las páginas existentes. `pointerEvents="none"` en previews laterales, sin acciones duplicadas.
- Nuevo `components/SwipePositionUnderline.tsx`: pequeña línea negra móvil DENTRO de la barra de 39dp existente, sin cambiar sus seis iconos ni sus dimensiones. El propio valor animado de progreso arrastra barra y contenido sincronizados.
- `profile.tsx`: mantiene `PanResponder` y captura horizontal, añade `onPanResponderMove` bidireccional, inercia al soltar y nuevas páginas visuales reutilizando JSX previo `renderSection(section)`. Los datos y handlers por sección se mantienen.
- `inbox.tsx`: mantiene exactamente las dos pestañas/labels, fila/burbuja, mark-as-read, acciones y refresco. Gesto horizontal ahora acompaña el dedo en tiempo real; `renderInboxPage(section)` reutiliza contenido existente. Preview inactivo no captura refresco.
- `PullRefreshUnderHeader.tsx`: **dos nuevos parámetros opcionales** `holdWhileRefreshing`/`holdDistance`. Solamente Perfil propio los activa y conserva **el círculo azul original**; permite tirón elástico mayor (156) y mantiene espacio/indicador hasta terminar su `onRefresh`, tras lo cual regresa. Feed, Inbox y chats mantienen comportamiento y colores anteriores.
- No tocar Feed, VideoCard, perfiles ajenos, editor, historias, iconos, branding, Auth, Supabase, migraciones o workflows. **18 protecciones Git blob** permanecen como estaban en el punto de partida.

## Validación / alcance
- Pruebas nuevas B8 cubren posición continua, reversión, velocidad, límites, separación vertical/horizontal, indicador circular azul retenido, pestañas/rutas y sintaxis.
- Pruebas previas que asumían cambio inmediato al `onPanResponderRelease` se ajustan **solo** para el nuevo gesto. No cambiar tests de contratos visuales ni ocultar fallos.
- Compilar y validar con CI primero, después **una APK de prueba** por workflow sin editar workflows. No declarar aceptado en teléfono sin prueba física del usuario.

## Afinación de B8 antes de prueba física
La selección visual gris/negro de los iconos del Perfil propio usa la sección más cercana durante el arrastre (\`previewTab\`) sin cambiar el icono, tamaño, acción al tocar ni su estado accesible confirmado; la barrita usa el mismo progreso continuo animado. Prueba dinámica de PanResponder: arrastre izquierda/derecha/centro con el mismo dedo simulado y snap al soltar. CI pendiente de esta afinación.

## Resultado comprobado en CI y alcance final

Último código B8: [`6726558f`](https://github.com/alexandermezad80-dev/TokVid/commit/6726558f5dc4164a4edcb1740285c431bad14b87).
- GitHub compare desde `746851d5`: **3 commits, 16 rutas**, exclusivamente dos pantallas de gestos, componentes de gesto, tests y docs. **18/18 archivos de integridad protegidos coinciden**; sin cambios a Feed, perfiles ajenos, iconos, diseño general, Auth, backend, editor, dependencias o workflows.
- El primer CI B8 [40043860633](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40043860633) falló por 7 aserciones antiguas del responder/fixture y nombres, no por prueba física; se corrigieron estas expectativas preservando las comprobaciones de geometría, colores autorizados, botones, rutas y perfil ajeno.
- CI [40044011312](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40044011312) superó regresiones + TS + prebuild. Afinación posterior del color de selección gris/negro basado en la sección bajo el dedo y test dinámico de PanResponder: CI [40044201865](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40044201865) **success** en las tres fases.
- **Aceptación física pendiente**: el video del usuario constituye referencia del objetivo, no confirmación de la implementación. Una APK nueva debe mostrar control reversible con un solo contacto, barrita móvil, iconos seleccionados negro/gris, release con snap, scroll vertical inalterado y pull con solo círculo azul visible mientras carga. No aprobar hasta prueba en teléfono.
