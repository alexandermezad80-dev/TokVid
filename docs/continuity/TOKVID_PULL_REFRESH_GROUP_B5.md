# TOKVID — B5: pull-to-refresh aislado de chat grupal
**Rama:** `feature/feed-mini-video-avatar`; **base:** `ed1960a81941de04476e522fdfc379a124bc8485`.
**Autorización:** continuar solo refresco y swipes. Editor visual sigue pausado.

La conversación grupal ya se actualizaba por suscripción/temporizador mediante una función `refresh` local al foco; su `FlatList` carecía de gesto pull. Se agrega una referencia a ese mismo refresco, con un indicador temporal bajo `HeaderSurface` al tirar hacia abajo cuando el scroll está en cero. Se conserva exactamente la acción de actualización, los mensajes, la inserción, teclado, burbujas, control de leído, compositor y opciones de grupo. No hay modificaciones a Feed, perfil, inbox, iconos, tabs, branding, servicios, bases de datos ni workflows.

Se prueba sólo de forma estática/CI; falta validación física. Se conserva el mecanismo de carga de mensajes anteriores existente y se dispara únicamente al gesto desde el tope. Cambios: `app/chat-group.tsx`, prueba B5 y esta documentación. `[prepare only]`: sin APK.
