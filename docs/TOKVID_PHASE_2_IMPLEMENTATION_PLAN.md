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
**🟢 COMPLETA**

D1 fue construida y validada por bloques en la rama `feature/onboarding-profile-interests`.

Implementado:
- tabla `public.stories`;
- historias de imagen o video;
- expiración lógica a las 24 horas mediante `expires_at`;
- RLS y políticas de lectura/creación/eliminación;
- bucket `stories` público con límite de 50 MB y MIME permitidos;
- Storage restringido por propietario para upload/update/delete;
- flujo de creación desde la galería;
- publicación en Storage + registro en `public.stories`;
- limpieza del objeto si falla el registro en DB;
- entrada de creación desde Home;
- tira horizontal de Stories;
- visor de Stories para imagen y video;
- navegación entre Stories y cierre;
- manejo de Stories expiradas/eliminadas;
- integración de Stories en Home;
- rutas registradas en Expo Router;
- CI validado en los bloques de implementación.

### Alineación arquitectónica de D1

Se revisó la estructura real de `artifacts/mobile` antes de hacer una reorganización.

El repositorio actual **no contiene un directorio `features/`** ni una arquitectura feature-based implementada físicamente. La organización real usa:
- `app/` para las rutas/pantallas de Expo Router;
- `components/` para componentes reutilizables;
- `context/`, `hooks/`, `lib/` y otras áreas compartidas.

Por ello, **no se creó una arquitectura nueva ni se movieron archivos de Stories a una carpeta `features/stories` inexistente**. Stories queda alineado con la arquitectura real vigente: pantallas en `app/` y el componente reutilizable `StoriesStrip` en `components/`.

Esto evita introducir una convención arquitectónica nueva únicamente para D1.

### Validación D1

- La tabla `public.stories` existe y RLS está habilitado.
- Las políticas de lectura, creación y eliminación fueron verificadas.
- El bucket `stories` y sus límites/MIME fueron verificados.
- No hay datos reales de Stories en la base durante esta validación, por lo que no se simuló una publicación autenticada inexistente.
- CI del último bloque de D1: **#120 🟢**.
- `main` permanece intacta.
- No se ha hecho merge.

No se inicia D2 automáticamente.

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

**D1 queda cerrado.** El siguiente bloque definido en el plan es **D2 — Live**. Se inicia únicamente con autorización explícita.
