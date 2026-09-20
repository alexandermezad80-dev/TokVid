# TOKVID — Fase 2: Plan de implementación segura

**Fecha:** 20 de septiembre de 2026  
**Rama:** `feature/onboarding-profile-interests`  
**Base protegida:** `main`

## Objetivo

Convertir los hallazgos de la auditoría en una secuencia controlada de trabajo. Esta fase **no implementa funcionalidades ni modifica Supabase**; define el orden, dependencias y criterios de cierre.

## Regla

Una tarea solo pasa a implementación cuando:
1. su alcance está definido;
2. sus dependencias están verificadas;
3. existe una prueba de aceptación;
4. se autoriza explícitamente el cambio.

## Orden de trabajo propuesto

### Fase A — Cerrar inconsistencias existentes
1. Shares: eliminar la ruta directa de `tag.tsx` y dejar una única vía mediante RPC.
2. Feed: sustituir/retirar el fallback mock cuando exista una estrategia real de estado vacío/error.
3. Perfil público: conectar la cuadrícula con videos reales.
4. Notifications: cerrar message → notification → push → navegación al chat.
5. Mentions: cerrar notification → push → navegación.
6. Hashtags: definir y cerrar sincronización de `usage_count`.

**Criterio:** ninguna de estas tareas debe introducir cambios de esquema innecesarios.

### Fase B — Hardening de seguridad
1. Revisar exposición pública de `profiles.email` y `profiles.push_token`.
2. Limitar UPDATE de perfiles a campos editables.
3. Revisar grants de `videos`.
4. Limitar UPDATE de `notifications` a los campos necesarios.
5. Definir límites de tamaño y MIME de Storage.
6. Revisar las funciones security-definer señaladas por Advisor.

**Criterio:** cada cambio debe probarse con roles anon/authenticated y con intentos explícitos de acceso no autorizado.

### Fase C — Integridad y rendimiento
1. Evaluar FK de `follows`.
2. Evaluar FK `saved_videos.video_id → videos.id`.
3. Revisar `auth_rls_initplan`.
4. Revisar los índices unused después de disponer de datos/consultas representativas.

**Criterio:** no eliminar índices solo por aparecer como unused en una base casi vacía.

### Fase D — Funcionalidades del producto
Después de cerrar A–C, abordar los requisitos maestros faltantes por dependencia:
- Stories.
- Live.
- Llamadas/videollamadas.
- Edición avanzada.
- Filtros/efectos.
- Voz/sonido.
- Subtítulos.
- IA para creadores.
- Borradores.
- Procesamiento/transcodificación.
- Seguridad y moderación.
- Protección de menores.
- Copyright.
- Monetización.
- Herramientas de grandes creadores.
- Panel administrativo.

## Criterio general de cierre

Una tarea se considera cerrada solo cuando:
- código y base están alineados;
- RLS/grants están verificados;
- no existen rutas alternativas inseguras;
- CI pasa;
- las pruebas correspondientes pasan;
- la documentación refleja el estado real;
- no queda un mock ocultando una ausencia funcional.

## Protección del proyecto

- `main` permanece intacta.
- No se hace merge automáticamente.
- No se modifican migraciones/RLS/Storage por iniciativa propia.
- No se implementan varios bloques grandes simultáneamente.
- Cada cambio se realiza en rama de trabajo y se valida antes de continuar.

## Próximo bloque autorizado por planificación

**Bloque A1 — Shares:** auditar nuevamente el flujo de compartir y preparar el cambio mínimo para que todas las rutas persistentes utilicen la RPC segura.

Este bloque todavía requiere autorización explícita para modificar código.
