# TOKVID — C2: guardar y reanudar borradores desde el compositor

## Alcance autorizado
El usuario aprobó Borradores locales privados, editor progresivo y respaldo remoto posterior. C1 ya creó `localDrafts.ts`; C2 conecta ese servicio al compositor EXISTENTE. C3 todavía incorporará la sexta pestaña del perfil propio, su grilla y las acciones de eliminación.

## Cambios C2
- `app/(tabs)/create.tsx`: el editor ofrece «Guardar borrador» (sin salir) y al cerrar un proyecto con contenido presenta «Seguir editando», «Guardar borrador» o «Descartar» (con confirmación contextual).
- Guardar es una operación de archivo local y metadatos; jamás llama a `publishDraft` ni inserta `videos`. Una copia guardada se convierte en la nueva fuente de vista previa al continuar, para no depender de la caché temporal.
- El editor acepta opcionalmente `draftId` por parámetro de `/(tabs)/create`; recupera archivo, descripción, propietario e identificador del proyecto. Si el archivo fue eliminado o el índice está dañado, muestra error sin publicar ni reemplazar el archivo.
- La ruta especial de respuestas a comentarios (`comment-video-reply.tsx`) conserva su `replyCommentId`, y si se reabre un borrador de respuesta se vuelve a cargar/validar el comentario para seguir en el editor. El servicio de publicación valida otra vez la relación antes de subir.
- Tras una publicación de borrador reabierto confirmada por el servidor se intenta borrar su copia local. Si la limpieza falla, se informa al usuario sin convertir una publicación confirmada en error. Se conserva el ID del borrador/publicación para reintentos idempotentes.
- Durante un guardado se deshabilita temporalmente la descripción y «Publicar» para evitar que una operación paralela publique un estado intermedio. Los errores de guardar dejan el editor abierto.

## Protección de código / navegación
- No se cambia `publishDraft`, `nativeUpload`, `model`, Supabase, las migraciones, bucket público, los controles del Feed, perfil, branding, sticky ni las rutas superiores.
- El editor en una ruta de comentario conserva `onExit={()=>router.back()}`.
- Si se sale del editor con «Guardar», vuelve al destino previo: comentario si provino de respuesta, o pestañas principales si provino de Crear.
- «Crear otra» desde una publicación de borrador antiguo elimina el parámetro de reanudación de la ruta de Crear.
- No ofrecer imagen falsa de grilla de Borradores antes de C3.

## Límites y pruebas pendientes
- Los borradores son locales; la desinstalación o pérdida de almacenamiento puede eliminarlos. No hay sincronización con otro dispositivo.
- Al usar datos de prueba automatizados se validará aparición de controles, guardias de cuenta/sesión, lectura de ID de recuperación, recuperación de descripción, persistencia local, y que Guardar no llame a los servicios públicos de publicación.
- GitHub Actions prueba regresión/TypeScript/prebuild, pero no valida todavía UX/tacto/galería/grabación física Android.
