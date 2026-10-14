# TokVid — diseños de referencia, fase 3

Estado del 13 de octubre de 2026: implementación publicada y [APK #217](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859633718) compilada y entregada. No equivale a confirmación física.

## Autorización y decisiones vigentes

El usuario autorizó aplicar los ZIP de Feed/comentarios, Perfil/Amigos, Detalles del chat y Fondos con sus medidas adaptables. La rama de entrega es `feature/feed-mini-video-avatar`; `feature/onboarding-profile-interests` se consultó como fuente de diseños, sin fusionar su código anterior.

- **Buscar** en Detalles conserva el comportamiento de la app: el campo no está siempre visible. Tocar Buscar lo muestra, enfoca y abre el teclado. Esta aclaración sustituye la instrucción «SIEMPRE visible» del documento de Detalles.
- **Saldo y Suscripción visibles y deshabilitados**, confirmado expresamente dos veces. No hay cobros ni saldo inventado.
- Branding de APK #210 aprobado físicamente: se conserva.
- Mensajería inmediata y vista previa/contador de Inbox aprobados: se conserva su servicio y suscripciones.
- El teclado de APK #210 todavía ocultaba el editor, confirmado por captura del usuario. No registrar ese problema como previamente resuelto.
- Eliminar un comentario o respuesta propia es una sola acción desde su menú, sin segunda confirmación. Solo su autor puede eliminarlo individualmente. El principal propio elimina todo su hilo; una respuesta propia elimina solo esa respuesta y conserva/reubica sus descendientes. Esto sustituye la anterior moderación individual por el dueño de la publicación.

## Implementación

### Feed y comentarios

Avatar lateral 48, cuadrado de radio 12 y fijo. Iconos Feather de 32; flecha para Compartir. Se retiran el avatar y Seguir inferiores, y los tres puntos laterales. Nombre, descripción ampliable y música permanecen. Para ti y Siguiendo se agrupan, con búsqueda a la derecha. El video termina por encima de la barra de navegación.

Compartir abre una hoja con destinatarios y herramientas en scroll horizontal. La búsqueda consulta usuarios, no únicamente amigos. Incluye envío por chat con ID estable de reintento, compartir del sistema, acceso a WhatsApp/LINE/SMS, copiar enlace, Facebook mediante selector del sistema, descarga mediante carpeta elegida en Android, denunciar, ocultar del feed actual y crear grupo. El propietario conserva Eliminar dentro de la hoja. La descarga en iOS usa Compartir. No se implementaron editores de Dúo/Pegar, conversión a GIF/sticker ni fondo de pantalla del sistema; las capturas de referencia no acreditan que esas funciones existan en TokVid.

Comentarios ocupa hasta el borde inferior y cubre la tab bar. La vista pequeña conserva 9:16 y 36% de la altura disponible completa, con margen 8 y transición de 220 ms sin resorte. Se conserva la instancia del reproductor. Abrir teclado no recalcula el tamaño del video. El editor flota por encima del teclado, fuera del panel que podría recortarlo. La lista mantiene su altura y admite desplazamiento hasta los mensajes cubiertos.

### Perfil y Amigos

Perfil con avatar 88/radio16, acceso a historias, tres contadores reales, biografía desplegable, seis accesos de sección y grilla de tres columnas 3:4 con separación 2. Saldo/Suscripción se muestran deshabilitados. La grilla conserva publicaciones reales y paginación; Galería filtra las fotos ya cargadas y permite cargar más. Historias abre el visor existente. Editar, Ver foto, Amigos y Cerrar sesión están en el menú.

Edición: avatar128/radio20, guardar, cargar/tomar/ver foto, recorte de la foto actual con arrastre y zoom, nombre, usuario y biografía de hasta 200 caracteres y tres líneas explícitas. Correo no editable. Ver foto abre pantalla completa con imagen de hasta300/radio20. El recorte produce JPEG512 y se guarda con el flujo de subida existente. Un fallo de subida conserva la selección para reintentar.

Amigos conserva sus consultas y relaciones; avatar44 y botón de seguimiento32. Navegación inferior64 más el inset real. Las zonas seguras se calculan, no se fijan para una marca de teléfono.

### Detalles y fondos del chat

Cabecera56, avatar88/radio26 con borde degradado, accesos58, tarjetas agrupadas y filas54. Claro/oscuro, burbujas lila y previsualizaciones compactas. Buscar conserva el flujo puntual confirmado por el usuario. Llamadas, silenciar, bloqueo, denuncia y creación de grupo usan los servicios existentes.

Ocho JPG originales1080×2400: Aurora, Atardecer, Menta y olas, Burbujas, Ondas, Confeti, Doodles y Cielo; más Sin fondo. Catálogo de tres columnas y vista previa completa antes de aplicar. Fondo fijo con cover, oscurecimiento18% en oscuro y barras casi opacas.

La elección del nuevo fondo se guarda **localmente por cuenta y conversación en el dispositivo**, sin ampliar los cuatro valores de la tabla antigua. Se recarga al volver al chat. Las otras preferencias conservan su persistencia actual en servidor. Los fondos no se sincronizan entre dispositivos en esta fase.

El chat usa ventana de altura estable y editor independiente, siguiendo la superposición medida del teclado. El modo Android se cambia solo durante la pantalla y se restaura al salir. Cambiar de teclado/letras/emojis no provoca desplazamiento automático al final por el simple cambio del padding. Los mensajes nuevos y el envío conservan su seguimiento del final.

## Servidor

Migración aplicada y registrada: `20261013102948_comment_removal_author_only`.
Se estrechan únicamente las dos comprobaciones de autor de `tokvid_internal.remove_feed_comment`; se conserva el bloqueo por hilo y la reubicación de hijos antes de eliminar una respuesta. La migración define la función, **no ejecuta borrados de comentarios existentes**.

`scripts/tests/coherent-comment-actions.rollback.sql` pasó con transacción revertida: autor, denegación al dueño de publicación ajena, cascada principal, conservación de hijos/hermanos/likes, contadores y privilegios. No dejó publicaciones de prueba.

Los advisors no señalaron la función modificada. Persisten avisos generales en funciones anteriores de Live/compartidas/hashtags y protección de contraseñas, fuera de este cambio: [funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificó Auth/OTP ni Live para este trabajo visual.

## Validación y límites

- Primera comprobación remota:127 pruebas aprobadas; un error de TypeScript corregido antes de la compilación final.
- Segunda comprobación remota:127 pruebas, TypeScript y prebuild Android aprobados.
- Pruebas de geometría: anchuras320/360/412/800, varias alturas de ventana/teclado, vista9:16 estable, recorte dentro de los píxeles originales.
- Pruebas de reproducción: misma instancia de video al comentar y volver; no adelanta ni reinicia.
- [Compilación final](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390) aprobada: 127 pruebas, TypeScript, prebuild y `BUILD SUCCESSFUL in 17m 33s`. [Manifiesto y checksum](continuity/APK_217_VERIFICATION.json).
- **Pendiente físico**: teclado normal/emojis en chat y comentarios, barra inferior con botones/gestos, texto grande, selección de fondos y búsqueda, foto/cámara/recorte, feed y comentarios entre dos cuentas. No hay prueba en todos los modelos de teléfono ni captura renderizada nativa de esta fase.

Esta fase no activa las funciones económicas ni los editores avanzados citados arriba. Conservar esta distinción en futuras entregas; no describir botones o capturas de referencia como funciones probadas.

## Aclaración visual posterior — Información de perfil

El usuario comparó la captura con Alexander y la referencia con Raúl. Aprobó funciones, iconos y medidas, pero rechazó la composición del formulario de nombre, usuario, descripción y correo. El formulario anterior conservaba cajas grandes que no correspondían a la referencia. Se sustituye exclusivamente esa presentación por nombre inline, usuario y descripción sin cajas, contador usado/200 a la derecha, separadores de ancho completo y una franja de correo legible no editable. La descripción crece para evitar recortar el texto. Se conserva espacio libre debajo, sin texto ficticio de futuras funciones. Guardar, selección/subida/recorte de foto, validación y persistencia permanecen iguales. No extrapolar esta corrección a rediseñar iconos o medidas aprobados.

La APK #216 terminó correctamente (127 pruebas, TypeScript, prebuild y Android). Su [manifiesto](continuity/APK_216_VERIFICATION.json) corresponde al código previo a esta aclaración. La presentación compacta está incorporada en [APK #217](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859633718), con comprobación física pendiente. #216 no incorpora esta corrección.
