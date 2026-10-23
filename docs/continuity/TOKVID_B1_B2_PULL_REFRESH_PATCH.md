# TOKVID — B1/B2 swipe y pull-to-refresh de Inbox: parche preparatorio

**Fecha:** 23 octubre 2026. **Rama:** `feature/feed-mini-video-avatar`. **Base:** `55d9a65af4a76a85c98628ae38faf1a2af02057d`.

Decisión vigente del propietario: terminar los gestos de actualización/swipe primero; el editor de fotos/videos queda en pausa hasta aportar su diseño. Ningún archivo de editor ni publicación se toca; no hay APK en este commit de preparación.

## Problemas corroborados en código
- B1 de Perfil y B2 de Inbox usaban PanResponder en fase bubble. Los ScrollView nativos anidados pueden adelantarse al responder; se añade capture únicamente para movimiento horizontal dominante, manteniendo umbrales y acciones existentes.
- Los estados de Inbox vacío, error o carga no tenían ScrollView/RefreshControl y por tanto no podían refrescar mediante pull. `RefreshableInboxEmpty` agrega el ScrollView nativo bajo la cabecera y pestañas inalteradas y centra el mismo contenido anterior.
- `handleRefresh` en Inbox carecía de finally; si una petición fallaba, refreshing podía quedar atascado. Ahora hay guardia y finally.

## Alcance y aislamiento
Solo `profile.tsx`, `inbox.tsx`, nuevo auxiliar `RefreshableInboxEmpty.tsx`, pruebas y esta nota. Nada de Feed, iconos, branding, barras, chat, cámara, editor, Supabase, migraciones, workflows o hash de protección APK261. La UI de Inbox con filas conserva exactamente sus dos RefreshControls actuales y las acciones de pestañas.

## Pendientes
- **Perfil:** su implementación `components/ProfilePullRefresh.tsx` figura entre los 18 hashes cerrados de APK261; no se cambió. El reporte físico dice que el indicador no aparece y requiere diagnóstico y excepción explícita al aislamiento si hay que modificar ese componente.
- **Feed:** `app/(tabs)/index.tsx` también tiene RefreshControl pero está protegido con hash; el usuario observa ausencia de indicador. Solo auditar, sin modificar su diseño aprobado.
- **Validación:** CI TypeScript y tests pendientes tras el push; prueba en teléfono pendiente para Inbox vacío/lleno, Perfil, swipes, gesto vertical, cabeceras, sticky y compatibilidad con toques de filas.
