# Comentarios: menú inferior, respuesta identificada y acciones nuevas

19 de octubre de 2026. Estado: implementado; validación local/SQL completada salvo dependencia local de Realtime; CI, APK y revisión física de esta actualización pendientes.

## Petición y precedencia

El usuario aprueba la presentación observada y las funciones, excepto los emojis recortados. Referencias: `1000178334.jpg` y capturas `1000178331.jpg`, `1000178330.jpg`, `1000178329.jpg`. Esta aclaración sustituye la conservación histórica del popover flotante y la píldora separada «Respondiendo».

- Menú blanco que entra desde abajo, con grupos redondeados y cierre al tocar fuera o usar Atrás. Sin filas «Responder» ni «Cancelar».
- Editar y Eliminar conservan sus permisos exclusivos de autor. Ocultar mensajes conserva su alcance personal y Mostrar sigue restaurando hilos.
- Se añaden Copiar, Responder con video y Guardar. Copiar lleva el texto exacto al portapapeles, incluidos saltos y emojis.
- Confirmación explícita: Guardar corresponde al **video**, igual que favoritos del feed. Se comparte el mismo estado y callback con la pantalla anfitriona; si ya está guardado, muestra Quitar de favoritos. No se crean favoritos de comentarios.
- Confirmación explícita: Responder con video crea una **publicación vinculada al comentario**, no un adjunto dentro del hilo.
- Responder permanece debajo del comentario. El mismo campo muestra «Responder a @usuario» como placeholder, sustituido por el texto al escribir. Se elimina la píldora separada. Una X discreta dentro del campo conserva la posibilidad de abandonar la respuesta sin perder el borrador. Cancelar edición se conserva fuera del menú.
- Emojis de18dp en celdas de24dp, sin aplicar escalado tipográfico adicional al icono, con espacio para el glifo Android. Siete visibles, catálogo/recientes/selección/desplazamiento conservados. La fila conserva su espacio de18dp dentro del compositor; el glifo usa3dp de los márgenes existentes por cada lado vertical, sin mover campo, herramientas ni teclado.

## Responder con video

Ruta independiente `comment-video-reply` que reutiliza el compositor de publicaciones. Carga el comentario por ID, muestra usuario y texto, permite grabar o elegir **video**, conserva la previsualización y exige pulsar Publicar. El acceso normal a Crear mantiene fotos, videos y LIVE.

`PublicationDraft.replyCommentId` se conserva junto al ID idempotente de publicación. Antes de subir se comprueba el comentario; al insertar se guarda `videos.reply_to_comment_id`. No hay una segunda escritura separada que pueda dejar una publicación sin enlazar tras un fallo. La tarjeta de respuesta en la información del video abre la publicación original y enfoca el comentario. Publicaciones ordinarias no llevan tarjeta ni consultan comentarios adicionales.

Si el comentario desaparece antes de publicar, se informa del error y se conserva la selección. Si se elimina después, la clave foránea queda a NULL y la publicación de respuesta permanece como publicación propia; no se conserva una copia del texto eliminado. Las reglas vigentes de eliminación del hilo se mantienen.

## Base y conservación

Base real: APK237, commit `3d565023929a591b8b10180208a3831cec4a1e69`, árbol `045f6ca89f8b0a85bf8d6118e1da9ca5baf47e96`. [Manifiesto de237](continuity/APK_237_VERIFICATION.json).175 pruebas, TypeScript/prebuild y Android correctos; SHA256 APK `08ac0d6d30cd649a01fb3e45f415505c0186c8408f4db95319e2491ae2852faa`.

Se mantienen branding, geometría/reproducción del video y miniatura, controlador del teclado, dimensiones aprobadas del panel/compositor, envío de texto, recientes, permisos, servicios de comentarios, mensajería privada y perfiles. `VideoCard` solo transmite el ID opcional del comentario a `VideoInfo`; no se modifica el reproductor. Las cinco pantallas que abren comentarios solo agregan la conexión a su favorito existente.

## Base de datos y pruebas

Migración aplicada y registrada `20261019124836_comment_video_reply_publications`; MD5 del historial `870c3ca1fae23073bcc433ebe466380c`. Copia exacta en `supabase/migrations/20261019124836_comment_video_reply_publications.sql` y `docs/sql/comment_video_replies.sql`. No repetir migración. Columna nullable con FK ON DELETE SET NULL e índice; restricción de tipo video; trigger SECURITY INVOKER privado, con search_path vacío y sin EXECUTE público. RLS y Auth existentes conservados.

Prueba SQL revertida `scripts/tests/comment-video-replies.rollback.sql`: vínculo a comentario ajeno, rechazo de imagen/ID inexistente/autoría suplantada, conservación del borrado de raíz en cascada y desvinculación del video posterior.0 videos o comentarios de prueba conservados. Grants: autenticado puede insertar el vínculo; invitado no puede insertar videos ni ejecutar el trigger; autenticado no recibe permiso UPDATE a videos. Asesores de seguridad sin avisos nuevos frente al estado previo.

Pruebas de UI y servicios: menú inferior/cierre externo/áreas seguras, opciones propias/ajenas, copia Unicode, favoritos del anfitrión, ruta con ID exacto, placeholder/respuesta/cancelación de destino, conservación del borrador, reintentos, publicación idempotente con vínculo, videos únicamente en respuesta, fotos y videos en Crear normal, celdas completas de emojis y orden estable.

Limitación local: no hay dispositivo Android/emulador. El glifo real y el gesto/teclado necesitan comprobación física; no se presentan imágenes de referencia como capturas de esta APK. La suite Realtime local requiere `@supabase/supabase-js`; CI debe ejecutarla con las dependencias reales, además de TypeScript/prebuild y Android.
