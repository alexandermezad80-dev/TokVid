# TOKVID — C3: sexta pestaña Borradores del perfil propio
## Regla aprobada
Los borradores son exclusivamente creaciones propias sin publicar: foto/video creado o seleccionado por su usuario, incluidas respuestas originales en video a comentarios de publicaciones ajenas. Los videos de otros usuarios compartidos o marcados como favoritos NO se convierten en borradores.

## Cambios restringidos
- El sexto espacio propio `Más` (que antes duplicaba Herramientas) pasa a `Borradores` con el icono vectorial file-pen-line (nombre de componente `drafts`), color activo/inactivo existente. No se agregan posiciones ni se alteran los 39dp, ancho/6 o scroll sticky.
- Hamburguesa SUPERIOR `/user-tools` sigue siendo entrada a Herramientas y tres puntos superiores a `/edit-profile`, completamente separados del sexto espacio.
- La grilla C3 lee exclusivamente `listLocalPublicationDrafts(user.id)` mediante hook condicionado por tab/foco; no consulta `videos` ni perfiles visitados.
- Tres columnas con ancho ya aprobado; foto con su copia local, video con portada local si existe; sin portada: icono VIDEO, no imagen demo ni carga remota. Iconos discretos para tipo y eliminar; tocar el proyecto reabre `/(tabs)/create?draftId=...`; eliminación con confirmación irreversible.
- En caso de corrupción, error recuperable y sin borrar los archivos. Los borradores no existentes no se inventan.
- Refrescar al volver al perfil y al hacer pull-to-refresh en la pestaña Borradores; lista aislada por `user.id`, incluso durante cambio de sesión.
- Publicación se mantiene exclusivamente mediante el compositor; C1 y C2 protegen copias locales y respuesta video a comentario.

## Sin cambios
Feed aprobado, cabecera, sticky, tab bar inferior, colores/medidas existentes, pantallas visitadas, Auth, Supabase, Storage remoto, migraciones y flujo de publicación. No generar APK hasta validar el bloque de pruebas y luego acordar prueba física.

## Pruebas
CI + TypeScript + Android config; validar Android real con una foto, video, respuesta a comentario, dos borradores, cambio de sesión, eliminación y publicación. La prueba física no queda reemplazada por el CI.
