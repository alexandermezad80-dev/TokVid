# TOKVID — Fase 2: Plan de implementación segura

**Fecha de actualización:** 21 de septiembre de 2026
**Rama:** `feature/onboarding-profile-interests`
**Base protegida:** `main`

## Objetivo

Cerrar de forma controlada los hallazgos de auditoría y construir las funcionalidades del producto por bloques pequeños, verificables y sin tocar `main` hasta el cierre final.

## Estado de cierre

### Fase A — Inconsistencias existentes
**🟢 COMPLETA**

- Shares: una única vía segura mediante RPC.
- Feed: estado real sin fallback que oculte ausencia funcional.
- Perfil público: cuadrícula conectada al contenido real.
- Notifications: flujo de mensaje → notificación → push → navegación.
- Mentions: notificación → push → navegación.
- Hashtags: sincronización atómica de `usage_count`.

### Fase B — Hardening de seguridad
**🟢 COMPLETA**

- Datos privados de perfil separados de `profiles`.
- UPDATE de `profiles` limitado a campos editables.
- Grants de `videos` restringidos.
- UPDATE de `notifications` limitado a `read`.
- Límites y MIME de Storage definidos para `avatars` y `videos`.
- Ejecución de funciones SECURITY DEFINER restringida según su uso.

### Fase C — Integridad y rendimiento
**🟢 COMPLETA**

- `follows.follower_id → auth.users.id` con `ON DELETE CASCADE`.
- `follows.following_id → auth.users.id` con `ON DELETE CASCADE`.
- `saved_videos.video_id` permanece como `text`, sin FK a `videos`, porque el producto admite IDs demo y UUID reales.
- `auth_rls_initplan` corregido usando `(select auth.uid())`.
- Índices marcados como unused no fueron eliminados porque la base todavía no tiene datos/consultas representativas suficientes.

## Conciliación de base de datos

Las migraciones aplicadas en Supabase para las fases A–C están registradas en el historial de Supabase. Las migraciones de B6, C3 y C1 también quedan representadas en `supabase/migrations/` de esta rama para mantener Git y Supabase alineados.

## Fase D — Funcionalidades del producto

### D1 — Stories
**🟡 EN CONSTRUCCIÓN**

Primer bloque iniciado el 21 de septiembre de 2026.

Fundación implementada y verificada:
- tabla `public.stories`;
- historias de imagen o video;
- expiración automática lógica a las 24 horas mediante `expires_at`;
- RLS habilitado;
- lectura solo de historias activas para usuarios autenticados;
- creación y eliminación restringidas al propietario;
- índices para propietario y expiración.

Migración aplicada en Supabase y representada en:
`supabase/migrations/20260921110000_stories_foundation.sql`.

Pendiente dentro de D1:
- almacenamiento de media de Stories;
- creación desde la app;
- visor de Stories;
- integración visual con Home;
- pruebas funcionales y CI.

No se inicia D2 hasta cerrar D1.

## Criterio general de cierre

Una tarea se considera cerrada cuando:
- código y base están alineados;
- RLS/grants están verificados;
- no existen rutas alternativas inseguras conocidas;
- CI pasa;
- las pruebas correspondientes pasan;
- la documentación refleja el estado real;
- no queda un mock ocultando una ausencia funcional.

## Protección del proyecto

- `main` permanece intacta.
- No se hace merge automáticamente.
- Los cambios se mantienen en `feature/onboarding-profile-interests`.
- Se trabaja un solo bloque de Fase D a la vez.

## Siguiente paso

Continuar **D1 — Stories**, empezando por el almacenamiento y flujo de creación, y validar antes de avanzar al visor/integración.
