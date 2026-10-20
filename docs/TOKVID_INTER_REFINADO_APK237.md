# TokVid — ajuste tipográfico con Inter (propuesta aislada)
Fecha: 2026-10-19

## Contexto y base
- APK 237: commit `3d565023929a591b8b10180208a3831cec4a1e69` (según `CONTINUAR_AQUI.md`).
- Rama operativa: `feature/feed-mini-video-avatar`. Esta propuesta parte de su estado vigente posterior a APK 237 para preservar las correcciones de comentarios ya existentes.
- Rama de trabajo: `feature/inter-refinado-apk237`. No se modifica `main` ni se fusiona automáticamente.
- Inter ya está incluida mediante `@expo-google-fonts/inter` y cargada en `app/_layout.tsx`. No se agregan nuevas dependencias ni se extraen tipografías de TikTok.

## Alcance autorizado
Aplicar una apariencia más fina, legible y elegante inspirada en la referencia visual, con una tipografía de uso comercial permitido:
- `Inter_400Regular`: biografías, descripciones, comentarios, campos de texto y etiquetas.
- `Inter_500Medium`: botones, nombres secundarios y títulos de secciones ligeros.
- `Inter_600SemiBold`: nombre principal de usuario y encabezados que requieren jerarquía.

Se sustituyen pesos 700/800 demasiado marcados solo en textos seleccionados, eliminando `fontWeight` donde se fija explícitamente un archivo de Inter para evitar negritas sintéticas. No se cambia el tamaño `fontSize`, ni el `lineHeight`, ni ancho, alto, márgenes, bordes, colores, animación, estado, eventos, lógica o navegación. El cambio de métricas de la fuente puede alterar saltos de línea: debe probarse visualmente.

## Archivos de app modificados
1. `artifacts/mobile/app/(tabs)/profile.tsx`: nombre, biografía, estadísticas, botones y títulos del estado vacío («Tu primera publicación»).
2. `artifacts/mobile/app/user-profile.tsx`: perfil público y botón de seguimiento.
3. `artifacts/mobile/app/edit-profile.tsx`: encabezado, «Guardar», etiquetas, entradas, correo y menú de fotografía.
4. `artifacts/mobile/components/CommentsSheet.tsx`: título, nombre, comentario, metadatos, texto del campo y contador. No modificar teclado, mini-video, estados de editar/borrar/responder ni envío.

## Verificación y límites
- Cambios limitados a estilos tipográficos de texto en los cuatro archivos de app (sin tocar reproductor, feed, Supabase, migraciones, autenticación, iconos ni workflows).
- `_layout.tsx` conserva las cuatro fuentes Inter precargadas.
- Pendiente: `pnpm --filter @workspace/mobile run typecheck` y pruebas automatizadas correspondientes, según CI.
- Pendiente: **una** compilación de prueba y comprobación física en Motorola G05 / Android 15, incluyendo teclado abierto, modo edición, título largo, nombres largos, biografía, «Guardar» y «Tu primera publicación».
- No afirmar que la pantalla se ve mejor hasta que se pruebe en teléfono. `physical_device_verified=false`.
- No incorporar fuentes ni archivos de TikTok; inspiración estética no significa copiar el diseño ni el archivo tipográfico.
- No fusionar ni disparar compilaciones repetitivas sin revisar el diferencial.
