# TOKVID — corrección aislada de esquinas negras de miniaturas (APK 261)

## Evidencia y diagnóstico (capturas físicas de APK 261)
El propietario mostró dos capturas del perfil propio, en las pestañas **Me gusta** y **Guardados**: portadas reales 3+1, borde degradado cian/magenta, radio redondeado conservado, pero pequeñas zonas casi negras en las cuatro esquinas externas de cada tarjeta. El origen es verificable en el código:
- `app/(tabs)/profile.tsx` define `styles.gridItem.backgroundColor="#111"` como fondo de la celda.
- `PublicationThumbnail.tsx` renderiza un `LinearGradient` con `borderRadius:10`, que por definición deja transparencia fuera de sus cuatro esquinas curvas; dentro existe `View borderRadius:9` con fondo de placeholder `#181E28`.
- En el extremo curvo, **la celda negra subyacente** se ve como una sombra falsa. No es necesario cambiar portada, formato, radio, margen, borde ni contenido.
- Las capturas comprueban visualmente el problema en el perfil propio; la hipótesis de capa se fundamenta en la composición del código, pero su desaparición efectiva requiere validación Android posterior.

## Corrección autorizada (solo perfil propio, miniaturas de publicaciones)
Se agregó un estilo de superposición **`publishedTileSurface:{backgroundColor:v.white}`** únicamente en los cuatro contenedores que muestran `PublicationThumbnail`: Videos propios, Compartidos, Me gusta y Guardados. La superficie detrás de las esquinas transparentes coincide con el fondo blanco del perfil.

No se tocó:
- `styles.gridItem` original, que sigue con `#111` para los proyectos de **Borradores**; su tratamiento visual no fue solicitado.
- `PublicationThumbnail.tsx`: iconos/badges, marco degradado, radio 10/9, placeholders y carga de imagen intactos.
- Anchos de tres columnas, alto 4:3 de las tarjetas, `gap:2`, navegación de fotos/videos, acciones de likes/guardados/compartidos, barra sticky de 39 dp, Feed y perfil ajeno.
- Branding, Supabase, Auth, workflows Codex, configuración Android, migraciones y archivos fuente ajenos al perfil propio.

## Protección y pruebas
Pruebas de regresión `scripts/tests/profile-thumbnail-corner-surface.test.cjs` comprueban cuatro overrides y que Borradores, Feed y el componente de miniatura siguen intactos. El sistema de aislamiento APK 261 verifica las integridades de los 18 archivos protegidos: **ningún hash necesita cambiarse**. Ejecución GitHub CI y TypeScript obligatorias.

Entrega: commit **`[prepare only]`**, ningún APK hasta cierre global. La confirmación de que las manchas negras desaparecieron en **Android físico** sigue pendiente hasta la APK conjunta.
