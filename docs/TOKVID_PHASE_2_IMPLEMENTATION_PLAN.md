# TOKVID — Fase 2: Plan de implementación segura

**Fecha de actualización:** 21 de septiembre de 2026
**Rama:** `feature/onboarding-profile-interests`
**Base protegida:** `main`

## Objetivo

Cerrar de forma controlada los hallazgos de auditoría y mantener `main` intacta hasta el cierre final.

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
- No se inicia Fase D en este cierre.
- Los cambios se mantienen en `feature/onboarding-profile-interests`.

## Siguiente etapa

**Fases A–C cerradas.**

La siguiente etapa es **Fase D — funcionalidades del producto**, pero queda fuera de este cierre y requiere autorización explícita para iniciar cada bloque.
