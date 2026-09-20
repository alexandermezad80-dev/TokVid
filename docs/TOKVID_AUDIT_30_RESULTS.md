# TOKVID — Auditoría integral: 30 resultados y dependencias

**Proyecto:** `alexandermezad80-dev/TokVid`  
**Supabase:** `kvbppgofblldwnkkoscb`  
**Rama de trabajo:** `feature/onboarding-profile-interests`  
**Base protegida:** `main`  
**PR relacionado:** #4 — `feat(onboarding): add profile and interests steps`  
**Tipo de documento:** Resultado de auditoría y matriz de dependencias  
**Regla:** Primero auditar. No modificar código, base de datos, migraciones ni configuración sin autorización explícita.

---

## Resumen

La auditoría integral de TOKVID revisó repositorio, aplicación móvil/web/API, autenticación y onboarding, Supabase, tablas, RLS, Storage, notificaciones/push, CI/CD y la relación con los 38 requisitos maestros.

Los siguientes **30 resultados** constituyen la matriz de conciliación. Las dependencias indican qué componente debe estar resuelto o validado antes de intervenir en cada punto.

> **Importante:** este documento registra hallazgos; no autoriza por sí mismo cambios en código, Supabase, migraciones, configuración ni `main`.

---

## 30 resultados de auditoría

### 01. Integridad de ramas y protección de `main`
**Estado:** 🟢  
**Resultado:** La auditoría y el trabajo de onboarding se mantienen fuera de `main`, en `feature/onboarding-profile-interests`.  
**Dependencias:** revisión de PR, CI verde y autorización explícita antes de cualquier merge.

### 02. PR #4 — onboarding
**Estado:** 🟡  
**Resultado:** PR #4 está abierto y en estado draft; contiene el tramo verificación → perfil → intereses → entrada a la aplicación.  
**Dependencias:** CI, revisión funcional del flujo y conciliación con Supabase.

### 03. CI bloqueado por `pnpm-lock.yaml`
**Estado:** 🔴  
**Resultado:** La instalación de dependencias falla antes de ejecutar typecheck/build por YAML malformado alrededor de la línea 10493, incluyendo el bloque `unpipe: 1.0.0    transitivePeerDependencies:`.  
**Dependencias:** reparación/regeneración válida del lockfile y nueva ejecución de CI.

### 04. Historial de reparaciones del lockfile
**Estado:** ⚠️  
**Resultado:** El lockfile acumuló varias reparaciones manuales de sintaxis y sincronización durante la conciliación de dependencias.  
**Dependencias:** manifestos actuales, versión de pnpm y regeneración consistente del lockfile; no borrar paquetes huérfanos manualmente sin validación.

### 05. Flujo visual de bienvenida
**Estado:** 🟢  
**Resultado:** `welcome.tsx` ya implementa una pantalla propia de TOKVID y no debe sustituirse por el HTML de referencia.  
**Dependencias:** navegación de Auth y estado de sesión.

### 06. Regla de permisos durante onboarding
**Estado:** 🟢  
**Resultado:** El onboarding no solicita cámara, micrófono ni notificaciones. La galería se solicita únicamente cuando el usuario elige una foto.  
**Dependencias:** Expo Image Picker y configuración de permisos del proyecto.

### 07. Paso de perfil del onboarding
**Estado:** 🟡  
**Resultado:** Existe `onboarding-profile.tsx` con nombre, username y foto opcional; valida username y guarda perfil.  
**Dependencias:** esquema `profiles`, Storage `avatars`, `refreshProfile()` y dependencia de Image Picker.

### 08. Esquema real de `profiles`
**Estado:** 🟡  
**Resultado:** La tabla real contiene `id`, `username`, `full_name`, `avatar_url`, `created_at`, `push_token`; el código espera además campos como `email`, `bio`, contadores y `updated_at`.  
**Dependencias:** AuthContext, editor de perfil, funciones de edición y decisión de esquema antes de crear migraciones.

### 09. AuthContext y perfil
**Estado:** ⚠️  
**Resultado:** Debe conciliarse lo que AuthContext considera perfil con el esquema real de producción. Se confirmó deuda previa en operaciones que escriben campos no presentes en la tabla real.  
**Dependencias:** resultado 08, onboarding y `edit-profile`.

### 10. Callback OAuth/verificación
**Estado:** 🟡  
**Resultado:** El callback dirige usuarios autenticados al onboarding; falta comprobar el estado `onboarding_completed` para evitar repetir onboarding a usuarios que ya terminaron.  
**Dependencias:** metadata de Auth, perfil existente y navegación raíz.

### 11. Intereses de onboarding
**Estado:** 🟡  
**Resultado:** El segundo paso exige mínimo tres intereses y guarda `interests` y `onboarding_completed: true` en metadata de Supabase Auth.  
**Dependencias:** Auth del usuario, futura personalización del feed y decisión posterior sobre persistencia relacional.

### 12. Storage `avatars`
**Estado:** 🔴  
**Resultado:** Existe bucket público `avatars`, pero la auditoría no encontró las políticas necesarias para que el flujo de onboarding pueda subir/actualizar avatares de forma segura.  
**Dependencias:** políticas Storage, usuario autenticado y contrato de `profiles.avatar_url`.

### 13. Storage de videos
**Estado:** 🟡  
**Resultado:** Existe bucket público `videos` y políticas relacionadas, pero la configuración de límites/tipos y el endurecimiento de seguridad deben conciliarse antes de producción.  
**Dependencias:** flujo de publicación, RLS/Storage y requisitos de formatos de video.

### 14. Esquema `videos` frente al código de publicación
**Estado:** 🔴  
**Resultado:** La tabla real usa `video_url`; el flujo de creación inserta `url`. Esto rompe la correspondencia entre aplicación y base de datos.  
**Dependencias:** publicación de video, Storage `videos`, tipos/consultas de feed y cualquier contador relacionado.

### 15. Persistencia de likes
**Estado:** 🔴  
**Resultado:** El código usa `video_likes`, pero la auditoría del esquema público no encontró esa tabla.  
**Dependencias:** modelo de datos de likes, RLS, contador `likes_count`, feed y perfiles.

### 16. Comentarios
**Estado:** 🟡  
**Resultado:** Existe `comments` y hay operaciones de creación/eliminación, pero debe conciliarse la actualización consistente de `comments_count` en `videos`.  
**Dependencias:** tabla `comments`, publicación de videos, RLS y mecanismo de conteo.

### 17. Compartidos
**Estado:** 🟡  
**Resultado:** La aplicación maneja `shares_count`, pero la auditoría requiere conciliar cómo se persiste y protege ese contador en Supabase.  
**Dependencias:** tabla `videos`, política de actualización y flujo de compartir.

### 18. Follows
**Estado:** 🟢/🟡  
**Resultado:** Existe `follows`, RLS y un trigger `on_follow_change` para actualizar contadores de perfil. La relación con `auth.users` no tiene FK y queda como deuda estructural a revisar.  
**Dependencias:** `profiles`, contadores, identidad de usuarios y reglas de integridad.

### 19. Videos guardados
**Estado:** 🟢  
**Resultado:** `saved_videos` existe, tiene RLS y restricción única `(user_id, video_id)`; la funcionalidad base está respaldada por datos reales de prueba.  
**Dependencias:** existencia de `videos` y permisos de lectura/escritura.

### 20. Hashtags
**Estado:** 🟡  
**Resultado:** Existen `hashtags`, `video_hashtags` y `upsert_hashtag()`. La funcionalidad está presente, pero las políticas y su relación con publicación deben conciliarse.  
**Dependencias:** publicación de videos, RLS, índices y búsqueda por hashtag.

### 21. Menciones
**Estado:** 🟡  
**Resultado:** La aplicación contempla menciones, pero la auditoría debe mantener alineados el procesamiento de menciones, notificaciones y datos de usuarios.  
**Dependencias:** perfiles, comentarios/contenido, notificaciones y reglas de seguridad.

### 22. Conversaciones
**Estado:** 🟡  
**Resultado:** Existe `conversations`; la política de actualización de participantes es más amplia de lo deseable y requiere revisión antes de producción.  
**Dependencias:** identidad de participantes, RLS y flujo de chat privado.

### 23. Mensajes
**Estado:** 🟡  
**Resultado:** Existe `messages` y el chat puede insertar mensajes; la política de actualización de participantes es amplia y no se encontró política DELETE.  
**Dependencias:** conversaciones, RLS, eliminación de mensajes y futuras notificaciones de mensajes.

### 24. Notificaciones
**Estado:** 🟡  
**Resultado:** Los tipos actuales incluyen `like`, `comment`, `follow`, `mention` y `system`; no existe todavía el tipo `message`.  
**Dependencias:** mensajes, actor/receptor, NotificationsContext, API y push.

### 25. Push notifications
**Estado:** 🟡  
**Resultado:** El permiso de notificaciones se solicita después de autenticación, respetando la regla de no pedirlo durante onboarding. El `projectId: "mobile"` usado para Expo Push Token requiere verificación contra el identificador EAS real antes de producción.  
**Dependencias:** configuración EAS/Expo, autenticación, `push_token` y backend de notificaciones.

### 26. API server
**Estado:** 🟡  
**Resultado:** Existe API principalmente para salud y notificaciones; no cubre todavía Live, llamadas, moderación, recomendaciones, procesamiento de video ni otros servicios avanzados.  
**Dependencias:** arquitectura backend, autenticación de servidor, Supabase y requisitos futuros.

### 27. Aplicación web
**Estado:** 🟡  
**Resultado:** Existe una capa web centrada principalmente en autenticación Google, sesión y home/logout; no representa todavía la aplicación social completa.  
**Dependencias:** autenticación, modelo de datos común y alcance futuro de la plataforma web.

### 28. Seguridad de autenticación: protección contra contraseñas filtradas
**Estado:** ⚠️  
**Resultado:** El Security Advisor de Supabase reportó **Leaked Password Protection Disabled**.  
**Dependencias:** configuración de Auth en Supabase y política de contraseñas antes de producción.

### 29. Índices marcados como no utilizados
**Estado:** ⚠️  
**Resultado:** El advisor reportó 9 índices no utilizados actualmente: `comments_user_id_idx`, `conversations_user1_id_idx`, `conversations_user2_id_idx`, `messages_conversation_id_idx`, `messages_sender_id_idx`, `notifications_actor_id_idx`, `notifications_user_id_idx`, `video_hashtags_hashtag_id_idx` y `videos_user_id_idx`. No deben eliminarse únicamente por el bajo uso actual, porque la base está casi vacía.  
**Dependencias:** volumen real de producción, planes de consulta y medición de rendimiento.

### 30. Brecha frente a los 38 requisitos maestros
**Estado:** 🟡/🔴  
**Resultado:** La auditoría confirmó que existen bases funcionales para perfil, feed, follows, mensajes, notificaciones, hashtags, guardados y autenticación, pero permanecen parciales o ausentes áreas como Stories, llamadas, burbujas personalizables, Live completo, filtros/efectos avanzados, subtítulos, IA, drafts, moderación, protección de menores, copyright, monetización y panel administrativo.  
**Dependencias:** resultados 01–29, arquitectura de datos, backend, seguridad, pruebas y priorización formal antes de implementación.

---

## Dependencias críticas consolidadas

### Cadena A — CI
`pnpm-lock.yaml`  
→ instalación correcta  
→ typecheck/build  
→ pruebas  
→ validación del PR  
→ posible merge.

### Cadena B — Onboarding
Auth  
→ callback  
→ `profiles`  
→ Storage `avatars`  
→ intereses  
→ `onboarding_completed`  
→ navegación a la aplicación.

### Cadena C — Publicación
Storage `videos`  
→ `videos.video_url`  
→ feed  
→ likes/comentarios/compartidos  
→ contadores  
→ hashtags/menciones.

### Cadena D — Perfil/Social
Auth user  
→ `profiles`  
→ follows  
→ contadores  
→ perfil público  
→ notificaciones.

### Cadena E — Mensajería
`conversations`  
→ `messages`  
→ RLS  
→ notificación tipo `message`  
→ push  
→ navegación al chat.

### Cadena F — Producción
Auth security  
→ Storage/RLS  
→ CI  
→ pruebas  
→ observabilidad  
→ endurecimiento de seguridad  
→ producción.

---

## Estado de cierre de la auditoría

**Auditoría:** TERMINADA  
**Resultados documentados:** 30  
**Dependencias:** documentadas  
**Cambios en `main`:** ninguno  
**Cambios directos en Supabase durante esta auditoría:** ninguno  
**Merge del PR #4:** no realizado  
**Siguiente fase:** conciliación, comenzando por las dependencias críticas y respetando la autorización explícita para cada modificación.
