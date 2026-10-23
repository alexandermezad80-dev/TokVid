# TOKVID — D4: Guardados sin IDs activos de publicaciones eliminadas

## Regla del propietario
Cuando el autor borra un video, desaparece de Guardados, Me gusta y Compartidos al **confirmar una lectura**. Una referencia antigua debe mostrar «Este video ya no está disponible». Una falla de red NO equivale a eliminación. Estas reglas se mantienen, sin tocar la UI del Feed ni crear migraciones.

## Auditoría actual
- En D3, el perfil y el reproductor de Guardados ya pasaban y verificaban `videoId` estable para no abrir otro video por índice.
- `resolveSavedVideos` omite una publicación que no retorna de `videos`, pero `loadSaved` seguía guardando como `savedIds` **todos** los IDs de `saved_videos`, incluso aquellos ausentes tras una consulta exitosa.
- Como `savedIds` determina el estado del icono de favorito, el bookmark podía seguir marcado aun sin miniatura accesible.
- Al guardar desde un video abierto anteriormente, la consulta optimista podía no resolverlo y aun así intentar insertar su referencia, que es texto y no garantiza FK a `videos`.
- El código de `Me gusta` ya resuelve IDs históricos mediante `readProfileActivity` (bajo RLS); `Compartidos` usa esa lectura y su registro tiene `ON DELETE CASCADE`. No migrar, no borrar historiales a ciegas.

## Corrección limitada a useSavedVideos
1. `visibleSavedIds` deriva el conjunto de IDs activos **solo de publicaciones efectivamente resueltas** tras una consulta exitosa. Las relaciones del servidor no se borran.
2. Al intentar guardar un video no resuelto, se cancela antes de escribir y se restaura el estado previo con mensaje «Este video ya no está disponible».
3. Si falla red o Supabase, `resolveSavedVideos` arroja error: se conserva la lista anterior y se mantiene opción de reintento. Los placeholders históricos de prueba no se eliminan prematuramente.
4. No se altera `VideoCard`, Feed, Login/Auth, perfil visual, reproductor, rutas, gradientes, tamaños, reglas RLS, base de datos, Live ni Codex workflows.

## Validación y límites
Pruebas de resolución con presente+eliminado+demo, fallo de consulta, detección anterior a inserción, rollback y enlaces por ID. La desaparición instantánea *sin volver a consultar* no está implementada ni afirmada. La comprobación de cascadas y recuentos reales requiere prueba con dos usuarios, tras una APK conjunta. Eliminar permanentemente IDs huérfanos en el backend requeriría consentimiento específico.

Entrega `[prepare only]`, CI completo y sin generar APK.
