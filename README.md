# TokVid

Red social TokVid.

## Estructura del repositorio

- `artifacts/web`: aplicación web Next.js.
- `artifacts/mobile`: aplicación móvil Expo.
- `artifacts/api-server`: backend Node.js/Express.
- `lib`: librerías compartidas y esquema de base de datos.
- `scripts`: utilidades de desarrollo.

## Requisitos

- Node.js 20+
- pnpm

## Instalación

```bash
pnpm install
```

## Desarrollo

### Web

```bash
pnpm --filter @workspace/web run dev
```

### Mobile

```bash
pnpm --filter @workspace/mobile run dev
```

### API server

```bash
pnpm --filter @workspace/api-server run dev
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## Ignorar archivos locales

No se deben subir archivos de entorno locales ni builds generados, como `.env.local` o `artifacts/web/.next`.

## CI

Se agregó un workflow básico en `.github/workflows/ci.yml` que ejecuta:

- instalación de dependencias
- typecheck del workspace
- build de `web`
- build de `api-server`
- typecheck de `mobile`
