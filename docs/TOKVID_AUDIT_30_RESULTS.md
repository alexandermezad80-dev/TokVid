# TOKVID — Auditoría integral y conciliación actualizada

**Proyecto:** `alexandermezad80-dev/TokVid`  
**Supabase:** `kvbppgofblldwnkkoscb`  
**Rama de trabajo:** `feature/onboarding-profile-interests`  
**Base protegida:** `main`  
**PR relacionado:** #4  
**Fecha de conciliación:** 20 de septiembre de 2026

> **Regla de protección:** primero auditar, documentar, identificar existente/incompleto/faltante y dependencias; después planificar, solicitar autorización, implementar, probar e integrar. Este documento no autoriza cambios en código, Supabase, migraciones, configuración, `main` ni merge.

## 1. Corrección del diagnóstico anterior

La versión anterior de esta auditoría contenía estados que ya habían sido superados por reconciliaciones posteriores. En particular, los resultados sobre CI, likes, comments, shares, saved videos, hashtags, conversaciones, mensajes, notifications y push necesitaban actualizarse.

Esta versión es la **matriz documental de referencia actual**.

## 2. Estado actual de los 30 resultados

### 01. Integridad de ramas y protección de main
**🟢** El trabajo permanece fuera de `main`, en `feature/onboarding-profile-interests`. No se realizará merge sin autorización explícita.

### 02. PR #4 — onboarding
**🟡** El PR #4 contiene el trabajo de onboarding. Su integración sigue pendiente de revisión y autorización.

### 03. CI
**🟢** La CI actual está operativa. Usa `actions/checkout@v6`, Node 24, pnpm 10.15.1, typecheck y builds. Las ejecuciones recientes revisadas están verdes.

### 04. Historial de lockfile
**🟢** El problema histórico del lockfile ya no bloquea la CI actual. No se debe volver a editar manualmente el lockfile sin necesidad.

### 05. Flujo visual de bienvenida
**🟢** `welcome.tsx` usa una implementación propia de TOKVID con thumbnails locales como fondo visual. No copia el HTML de referencia.

### 06. Permisos durante onboarding
**🟢** No se solicitan cámara, micrófono ni notificaciones durante onboarding. La galería se solicita al elegir foto.

### 07. Perfil del onboarding
**🟢** Existe el paso de nombre, username y foto opcional; valida username, guarda en `profiles`, usa Storage `avatars` y continúa a intereses.

### 08. Esquema de profiles / AuthContext
**🟡** La tabla real incluye `id, username, full_name, email, avatar_url, bio, followers_count, following_count, likes_count, push_token, updated_at`. El código está conciliado para esos campos. Permanece un problema de seguridad: SELECT público expone también `email` y `push_token`, y el UPDATE propio conserva privilegios amplios sobre campos sensibles/contadores.

### 09. Callback OAuth/verificación
**🟢** El callback verifica el estado de onboarding y dirige usuarios completados a `/(tabs)` y usuarios incompletos a `/auth/onboarding-profile`.

### 10. Intereses de onboarding
**🟢** El segundo paso exige mínimo tres intereses y guarda `interests` y `onboarding_completed: true` en metadata de Auth.

### 11. Storage avatars
**🟢/🟡** El bucket `avatars` existe, es coherente con el código y tiene políticas de ownership para subir, actualizar y eliminar. Falta hardening de límites de tamaño/MIME.

### 12. Storage videos
**🟡** El bucket `videos` y ownership existen. No hay límite de tamaño ni allowlist MIME. También queda una política de delete duplicada/legacy para limpiar posteriormente.

### 13. Publicación de videos
**🟢 base** La creación usa `video_url`, Storage `videos`, progreso de subida y publicación. Quedan pendientes drafts, edición avanzada, procesamiento/transcodificación y formatos avanzados.

### 14. Likes
**🟢** `video_likes` existe, tiene PK compuesta, RLS propia, índices y trigger para contadores. El hardening de privilegios de funciones/counters permanece pendiente.

### 15. Comentarios
**🟢 base** `comments` existe con RLS de lectura/creación/eliminación y trigger que sincroniza `videos.comments_count`. El flujo completo de notificación/push/navegación aún no está cerrado.

### 16. Compartidos
**🟡** Existe RPC segura `increment_video_share_count(uuid)`, exige usuario autenticado y limita EXECUTE. Sin embargo, `artifacts/mobile/app/tag.tsx` todavía actualiza `shares_count` directamente. Debe unificarse antes de cerrar shares.

### 17. Follows
**🟢/🟡** Follow/unfollow, RLS, prevención de self-follow y rollback de errores están implementados. La integridad referencial con usuarios sigue como deuda estructural y los contadores requieren hardening.

### 18. Saved videos
**🟢/🟡** RLS, PK, FK de usuario y UNIQUE(user_id, video_id) están correctos. Falta FK de `video_id` hacia `videos`; no debe modificarse durante esta auditoría.

### 19. Hashtags
**🟡** `hashtags` y `video_hashtags` tienen PK/FKs/UNIQUE/RLS/índices correctos. `usage_count` no tiene mecanismo de sincronización identificado.

### 20. Menciones
**🟢 base / 🟡 flujo completo** La extracción y persistencia de menciones existe y excluye al autor. Falta cerrar de extremo a extremo notificación → push → navegación.

### 21. Conversations
**🟢** RLS de participantes y actualización de metadata están endurecidos. Los grants de UPDATE autenticado están limitados a `last_message` y `last_message_at`.

### 22. Messages
**🟢 base / 🟡 producto** El mensaje solo puede ser insertado por el participante correspondiente y el sender puede actualizar `text`/`read_by_other`. DELETE está revocado. Falta implementar la UX/semántica completa de eliminación de mensajes.

### 23. Notifications
**🟡** Los tipos incluyen `like, comment, follow, mention, system, message`; FKs y RLS base están presentes. El UPDATE del receptor sigue siendo demasiado amplio. Además, el flujo `message → push → tap → chat` aún no está completamente conectado.

### 24. Push notifications
**🟢 base / 🟡 verificación final** La configuración usa el projectId desde app config cuando existe y no solicita notificaciones durante onboarding. Falta verificar un build EAS real con el identificador de proyecto correcto antes de producción.

### 25. API server
**🟢** La API valida bearer token, identidad del actor, participantes y destinatarios según el tipo de notificación, y usa service role solo en servidor. CI está verde. Los servicios avanzados aún no existen.

### 26. Web
**🟢 base / 🟡 alcance** El onboarding web está implementado y CI lo construye correctamente. La plataforma web social completa aún no está desarrollada.

### 27. Cross-review de producto
**🟡** El feed consulta videos reales y pagina resultados, pero mantiene `BASE_VIDEOS` como fallback mock. El perfil público mantiene una cuadrícula mock (`GRID_THUMBS`/`MOCK_VIEWS`). Ambos deben resolverse antes de producción.

### 28. Leaked Password Protection
**⚠️ pendiente por plan** Supabase Advisor reporta la protección deshabilitada. Se intentó habilitarla, pero Supabase indicó que la función requiere Pro o superior. No se debe alterar otra configuración de contraseñas para compensarlo.

### 29. Performance Advisor
**🟡** Existen advertencias `auth_rls_initplan` y 11 índices marcados como unused. Dado que la base está casi vacía, no se recomienda eliminar índices ahora. Debe revisarse con tráfico/datos reales.

### 30. Brecha frente a los 38 requisitos maestros
**🟡/🔴** La base funcional existe para Auth, perfil, feed, follows, likes, comentarios, guardados, hashtags, menciones, conversaciones, mensajes, notificaciones y onboarding. Siguen incompletos o ausentes Stories, llamadas, burbujas personalizables, Live, enlace de perfil, edición avanzada, filtros/efectos, voz/sonido, subtítulos, IA, drafts, procesamiento avanzado, seguridad de mensajería avanzada, ayuda, protección de menores, políticas, copyright, monetización, herramientas de grandes creadores y panel administrativo.

## 3. Hallazgos cruzados de seguridad

1. **Profiles:** SELECT público expone `email` y `push_token`; UPDATE propio permite modificar más campos de los que deberían ser autoritativos.
2. **Videos:** RLS bloquea actualmente UPDATE, pero los grants de columna son amplios.
3. **Storage:** falta límite de tamaño y allowlist MIME.
4. **Notifications:** UPDATE propio no está limitado por grants a campos como `read`.
5. **Security Advisor:** tres funciones security-definer siguen apareciendo como warnings:
   - `increment_video_share_count`
   - `sync_video_comments_count`
   - `update_video_like_counts`
6. Estos puntos son **hardening pendiente**, no cambios que deban ejecutarse durante esta auditoría.

## 4. Requisitos maestros — resumen

| # | Área | Estado |
|---|---|---|
| 1 | Identidad y perfil | 🟡 |
| 2 | Feed | 🟡 |
| 3 | Stories | 🔴 |
| 4 | Seguidores/seguidos/amigos | 🟡 |
| 5 | Mensajes privados | 🟡 |
| 6 | Llamadas/videollamadas | 🔴 |
| 7 | Burbujas de mensajes | 🔴 |
| 8 | Live | 🔴 |
| 9 | Requisitos Live | 🔗 |
| 10 | Enlace en perfil | 🔴 |
| 11 | Creación/producción de video | 🟡 |
| 12 | Filtros/efectos | 🔴 |
| 13 | Voz/sonido | 🔴 |
| 14 | Subtítulos | 🔴 |
| 15 | IA para creadores | 🔴 |
| 16 | Hashtags | 🟡 |
| 17 | Menciones | 🟡 |
| 18 | Borradores | 🔴 |
| 19 | Formatos/procesamiento | 🔴 |
| 20 | Notificaciones | 🟡 |
| 21 | Seguridad mensajería | 🔴 |
| 22 | Ayuda | 🔴 |
| 23 | Ayuda psicológica | 🔴 |
| 24 | Conducta repetida/advertencias | 🔴 |
| 25 | Protección de menores | 🔴 |
| 26 | Políticas TOKVID | 🔴 |
| 27 | Copyright | 🔴 |
| 28 | Monetización | 🔴 |
| 29 | Herramientas grandes creadores | 🔴 |
| 30 | Panel administrativo | 🔴 |
| 31 | Arquitectura segura | 🟢 |
| 32 | Ramas/workflow | 🟢 |
| 33 | Propiedad de código | 🟡 |
| 34 | Versiones/recuperación | 🟡 |
| 35 | Supabase/DB versionada | 🟢 |
| 36 | Auditoría antes de cambiar | 🟢 |
| 37 | Regla de protección | 🟢 |
| 38 | Principio general | 🟢 |

## 5. Dependencias críticas

- **CI:** lockfile → instalación → typecheck/build → pruebas → PR.
- **Onboarding:** Auth → callback → profiles → avatars → interests → onboarding_completed → app.
- **Publicación:** video Storage → video_url → feed → likes/comments/shares → contadores → hashtags/mentions.
- **Social:** Auth → profiles → follows → contadores → perfil público → notifications.
- **Mensajería:** conversations → messages → RLS → message notification → push → chat.
- **Producción:** Auth security → Storage/RLS → CI → pruebas → observabilidad → hardening → producción.

## 6. Cierre de esta conciliación

**Auditoría técnica:** completada.  
**Conciliación documental:** actualizada.  
**main:** sin modificar.  
**Supabase:** sin cambios durante esta conciliación.  
**Merge:** no realizado.  
**Código funcional pendiente:** no se modifica automáticamente por aparecer como 🟡/🔴.

La siguiente etapa, cuando se autorice, debe comenzar por una dependencia concreta y verificable; no se deben atacar todos los rojos simultáneamente.
