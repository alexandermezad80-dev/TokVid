# TOKVID — auditoría de alcance y aislamiento B4–B7, previa a prueba física

**Fecha:** 23 octubre de 2026. **Rama exclusiva:** `feature/feed-mini-video-avatar`. **HEAD de código auditado:** `ea46a2ef4b787da542a974ad14cbb5c130f80401`.
**Base de comparación:** `72096401f40eda9056da2ce1e0e7edfed721ed03` (antes del bloque B4).

## Hechos verificados en GitHub
- GitHub compare desde la base: **8 commits y 20 rutas** (código de refresco/swipe, pruebas y documentación). **Cero cambios** a `user-profile.tsx`, `(tabs)/_layout.tsx`, iconos, branding, `VideoCard.tsx`, `VideoActions.tsx`, `VideoInfo.tsx`, autenticación, editor, workflows, Supabase o migraciones.
- Auditoría del árbol Git con los 18 hashes congelados de `scripts/tests/tokvid-apk261-isolation.test.cjs`: **18 de 18 coinciden con los hashes vigentes**. El único hash actualizado desde la referencia original es `index.tsx` del Feed, documentado previamente como excepción **solo del mecanismo pull**, no de diseño. Los otros 17 hashes se conservaron.
- `ProfilePullRefresh.tsx` sigue con el blob original `74b47601c2762a1ee0591f54506d05bd8a326fbd`; el **Perfil propio** ahora monta `PullRefreshUnderHeader` (alias local `ProfilePullRefresh`) y el **perfil visitado** conserva el componente anterior sin cambios.
- **B4:** Inbox y chat privado, CI [40029863046](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40029863046) success; **B5:** chat grupal, [40030018198](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40030018198) success; **B6:** gesto exclusivo de primer video Feed, [40030231423](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40030231423) success; **B7:** Perfil propio con indicador bajo cabecera, [40033137153](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40033137153) success (regresiones + TypeScript + Android prebuild).
- En B7 el primer CI [40033009805](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40033009805) **falló** porque dos pruebas antiguas identificaban el componente de Perfil por nombre. Se corrigieron **solo 5 referencias del mock/test del Perfil propio** en `profile-navigation-presentation.test.cjs`; los tests del perfil ajeno y sus funciones permanecen intactos. CI completo final posterior **aprobado**. No ocultar ese fallo histórico.
- Swipes B1 y B2 mantienen sus detectores puros, direcciones y límites originales; el último parche del Perfil **no altera** umbrales ni responder horizontal.

## Resultado y límites estrictos
Todo esto es integridad de código y **CI**, no inspección de una APK nueva. Estado `physical_device_verified=false`. La APK anterior compilada desde `ff853d60` **no contenía** B4–B7 y no prueba estos arreglos.
La fuente `VideoCard.tsx` tiene un indicador del reproductor/placeholder independiente; ninguna corrección B4–B7 toca el reproductor. Editor E2 permanece pausado, error al recortar sin resolver.

## Prueba física conjunta prevista
1. **Feed:** primer video (con contenido real) permite jalar y ver indicador bajo controles superiores; el mismo gesto en video 2+ retrocede al anterior sin refrescar; deslizar arriba cambia video; comentarios abiertos bloquean refresco; placeholder y rueda de reproducción no se confunden.
2. **Perfil propio:** arrastrar desde arriba revela indicador azul acero sin mover cabecera, sticky 39 dp y seis secciones intactas; swipe entre secciones y scroll vertical siguen independientes.
3. **Inbox:** jalar desde arriba en Actividad y Mensajes revela indicador sin cubrir primera fila; comprobar con filas, sin filas y ante error; swipe B2 horizontal intacto.
4. **Chat privado y grupal:** indicador al tirar desde inicio; teclado, multimedia, burbujas, envío, históricos, cabeceras y scroll al final conservados.
5. **Aislamiento visual:** ninguna variación de tamaño/posición/color/icono en Feed, tab bar, perfil propio o ajeno. Si algo falla físicamente, registrar evidencia y autorizar exclusivamente el ajuste correspondiente, sin tocar bloques aprobados.

**Decisión:** una APK de **validación** por GitHub después de esta auditoría, si se solicita/autoriza explícitamente como continuación del plan; no genera por sí sola un estado de producción. Sin migraciones ni despliegue de base de datos.
