# TOKVID — C4: auditoría final automatizada y verificación física pendiente

## Identidad y límites aprobados
Borradores son solo obras sin publicar del dueño: fotos y videos propios, incluidas las respuestas originales en video a comentarios de otros creadores. Nunca recopila el historial de Compartidos ni Favoritos. El primer almacenamiento es **local privado**, no nube.

Rama exclusiva: `feature/feed-mini-video-avatar`. Feed, branding, sticky, perfiles ajenos, acciones de tab bar, credenciales, Supabase, migraciones y servicio de publicación quedan protegidos.

## Hallazgos y alcance C4
- El repositorio ya tenía C1 (persistencia con copias bajo `documentDirectory`) y C2/C3 (editor, sexta pestaña privada y confirmación de borrado), y la validación anterior `233/233`.
- Se agregaron pruebas que *reinstancian el módulo* compartiendo archivos e índice persistido, aproximación automatizada a reiniciar la app, sin declarar prueba real en Android.
- Casos probados: varios proyectos, foto y video, autor aislado, comentario asociado a una respuesta en video, foto local opcional, ausencia de archivo, error de disco, error al persistir metadata, eliminación/reinicio, falsificación de tipo.
- Corrección mínima de validación: `kind=video` debe concordar con un MIME de video y `kind=image` con MIME de imagen también al leer el índice persistido; se rechazan inconsistencias sin sobrescribir contenido.
- Se protegió el servicio actual `publishDraft` y no se genera una publicación por guardar.
- El test no sustituye a desmontar/reiniciar realmente Android, inspeccionar consumo de espacio del teléfono, probar una sesión real de Auth, o ver cómo responde la cámara/portada real.
- Riesgo operativo: los borradores locales no sobreviven a desinstalación/restablecimiento del almacenamiento ni se sincronizan entre dispositivos. No prometer recuperación desde nube. En falla de borrado de archivos después del índice, puede requerirse limpieza pendiente; no afirmar borrado seguro de bytes sin prueba específica.
- Riesgo heredado de publicación: el editor ya puede haber subido un archivo público en un **intento previo de publicar**, incluso si la confirmación final falla; guardar posteriormente no inicia esa subida pero tampoco la revoca. Se necesita auditoría dedicada antes de declararlo privado extremo a extremo.

## Validación de cierre C4 en Android físico (pendiente)
1. Crear video corto nuevo, agregar descripción, `Guardar borrador`; verificar sin aparición en Feed y sin publicar; cerrar TOKVID por completo y volver a abrir; recuperar desde sexto icono.
2. Crear foto nueva y un segundo video; comprobar tres miniaturas en una fila y texto/portadas propios, sin imágenes repetidas ficticias.
3. Crear video de respuesta desde un comentario ajeno, guardarlo, abrirlo desde Borradores; comprobar que el comentario original sigue enlazado, que se exige validación de comentario y que solo acepta video.
4. Cambiar de cuenta A a B y comprobar que no se muestran ni pueden abrir borradores de A. Volver a A y comprobar recuperación en el mismo teléfono.
5. Eliminar un borrador con confirmación y reiniciar: no debe reaparecer. Cancelar eliminación de otro: debe permanecer.
6. Publicar un borrador expresamente; verificar una sola publicación y borrador eliminado; tocar retroceso y «Seguir editando» no debe publicar.
7. Simular error de almacenamiento (espacio insuficiente) y cámara denegada si el teléfono lo permite, sin borrar borradores anteriores.

## Compilación y cierre
El workflow `android-apk.yml` compila APK únicamente con push a esta rama que NO contenga `[prepare only]`; primero valida tests/tipos y construye release. El artefacto se descarga desde GitHub Actions si termina en éxito. No compartir un APK ni afirmar compilación válida sin comprobar el run y su SHA.

El bloque C4 permanece en espera del resultado real del teléfono físico. Las pruebas automáticas son preliminares.
