# TOKVID — B6: excepción delimitada Feed pull-to-refresh, sin tocar diseño aprobado

**Fecha:** 23 octubre 2026. **Rama:** `feature/feed-mini-video-avatar`. **Base:** `0775c619aeb0d97c81a9fd72adf00448998f0cd3`.
**Autorización:** el propietario ordenó limitar el trabajo a pull-to-refresh y swipes, aislando Feed, iconos, tamaños, posiciones, navegación y todas las interacciones aprobadas. **Esta es una excepción funcional SOLO del gesto de actualización**, no permiso para rediseñar Feed ni el reproductor.

## Evidencia concreta y causa
- En `hooks/useVideoFeed.ts`, `isRefreshing` se activa al entrar/recargar automáticamente, no solo cuando el usuario tira. `index.tsx` conectaba ese estado a un `RefreshControl` nativo que podía mostrar el indicador sin gesto.
- `components/VideoCard.tsx` tiene otro `ActivityIndicator` vinculado a carga del reproductor. **Ese círculo del placeholder no equivale necesariamente a actualizar el Feed. No se cambia ni deshabilita el reproductor.**
- El Feed está paginado con `pagingEnabled`, `snapToInterval={SCREEN_HEIGHT}`; un gesto hacia abajo desde un video posterior debe retroceder de página. **Solo desde offset 0 + primer video activo** se permite capturar pull-to-refresh. Con comentarios abiertos no se captura.

## Parche de alcance mínimo y aislamiento
- `index.tsx`: reemplazar solo el `RefreshControl` nativo (que mostraba carga automática) por `PullRefreshUnderHeader` alrededor de la `FlatList`, conservando todas sus props de reproducción, paginación, altura, navegación, renderer, overlays, iconos y demás acciones. Añadir medición `feedPullOffset` sin alterar scroll. La lista ocupa el mismo espacio flexible de pantalla; se crea una brecha animada temporal exclusivamente por el gesto, con cabecera overlay fija y spinner por debajo (`indicatorTop={insets.top+58}`). `maxPull=148`, `triggerDistance=148` para revelar el spinner bajo el header antes de disparar.
- `PullRefreshUnderHeader.tsx`: se amplían únicamente dos parámetros opcionales; Inbox y chats mantienen los valores anteriores.
- `VideoCard.tsx`, `VideoActions.tsx`, `VideoInfo.tsx`, `(tabs)/_layout.tsx`, TOKVID branding, Perfil propio y ajeno, Auth, backend, editor, workflows y migraciones **sin cambios**.
- Hash aprobado del Feed en `scripts/tests/tokvid-apk261-isolation.test.cjs` se sustituye **únicamente** por el nuevo hash del archivo editado, con esta evidencia y autorización específica del gesto. No se mueven ni eliminan las otras 17 protecciones: archivo previo `b3184969ec2bd86f5cb134150fae0341c3d6ebe7`, nuevo Git blob `57f06bed615f4b2153e3ef9b1433991f47ced166`. Si CI falla en otras protecciones, revertir o corregir la excepción; nunca cambiar hashes indiscriminadamente.

## Validación
- Prueba adicional `scripts/tests/feed-gesture-isolation-b6.test.cjs` protege paginación, condición de primer video, exclusión de comentarios, cabecera, overlays y carga automática independiente del indicador. CI pendiente y Android físico pendiente.
- **Nada de esto prueba todavía** que un gesto real se anime como se espera ni que no haya regresiones de video. Requiere captura física con primer, segundo y últimos videos, placeholder y contenido real, comentarios abiertos, pantalla sin publicaciones, y revisión de cabecera/tab bar/video unchanged.
- APK sigue pendiente; este commit es `[prepare only]`.
