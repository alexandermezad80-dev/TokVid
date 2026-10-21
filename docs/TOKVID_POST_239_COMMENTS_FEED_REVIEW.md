# Correcciones después de APK239: comentarios, feed y transición de perfil

## Alcance autorizado y base conservada

Petición del21octubre2026, `23Comentarios-medidas-7.zip`, video `fallas .mp4` y aclaraciones posteriores. El usuario autoriza aplicar lo necesario y auditar para conservar lo aprobado. Rama `feature/feed-mini-video-avatar`; base real APK239 `f170cd3a5c2e0744e0a0419d88920e7b95c744ab`. No se parte de main ni de onboarding.

Las aclaraciones habladas prevalecen: barra inferior del perfil visitado BLANCA con las dimensiones aprobadas de56dp, iconos22dp y Crear49×30; no cambiarla a48dp. Píldora dice solamente «Responder», tanto abierta como cerrada. Menú conserva «Eliminar» como nombre del borrado personal. «Comienza la conversación» en chat vacío es correcto.

## Diagnóstico y cambios

| Área | Evidencia / cambio | Conservación |
| --- | --- | --- |
| Transición chat→perfil visitado | Video muestreado a30fps: entre2.967–3.100s la barra aparece a y471–650px. El estado de carga solo ocupaba180dp. Cuerpo flex:1 estable en carga, error y contenido; barra al pie. | Animación de navegación, cabecera, rutas y medidas de barra. Color blanco también en zona de Android del perfil visitado. |
| Identidad al abrir chat | El fallback fabricaba `@Conversación` y una C. Se mantiene el espacio vacío hasta cargar la identidad real. | Verificación de miembros, mensajes, entrada por Actividad, llamadas y chat vacío. |
| Biografía propia/visitada | El justificado ensanchaba espacios entre palabras en columnas estrechas. Alineación izquierda y espaciado natural. | Márgenes, tamaño, expansión y Ver menos. |
| Feed invitado/autenticado | Comparten VideoActions. Separación vertical18→10dp; Compartir siempre tiene un texto numérico de respaldo0. | Iconos28dp, contadores reales, acciones, permisos, reproducción y barra inferior. |
| Píldora de comentario | Texto14dp nativo sin multiplicarlo por el ancho; sin padding vertical que empuje/recorte. «Responder» en una línea centrada. | Campo cerrado265×38 y abierto36 de alto, escalado geométrico existente; límites300 y envío. |
| Márgenes del ZIP7 | Cerrado: izquierda16, final12 por encima del área segura medida. No restar dos veces insets que ya excluye el Modal. | Encabezado56, dimensiones y posición del video minimizado, teclado y controles abiertos. |
| Emojis rápidos | Sin disableIntervalMomentum ni desaceleración rápida: desplazamiento con inercia normal y alineación de un emoji completo al terminar. | Catálogo completo3781, animaciones, inserción sin cortar secuencias, MRU20; no saltar mientras se busca. Al reabrir, inicio de recientes. |
| Contadores | Hoja y feed usan el mismo total visible para la cuenta.0: «Comentarios»;1: «1 comentario»;≥2 plural. Borrado personal invalida también el contador montado del feed. | El total público del video sigue intacto para otros cuando se usa Eliminar; Ocultar/Mostrar no equivale a borrar. |
| Borrado global | Confirmación blanca de radio24 antes de Eliminar para todos, en principal/respuesta propios. | Principal borra hilo; respuesta propia se borra sin eliminar respuestas ajenas, que se enlazan al padre. No permisos sobre mensajes ajenos. Cancelar existe solo en esta confirmación, no en el menú. |
| Menú | Fuente nativa17dp; filas51dp y separador fino entre las dos eliminaciones. | Menú desde abajo: editar, eliminar, eliminar para todos, ocultar, copiar, responder con video y favorito del video según permisos. Sin Responder/Cancelar como acciones del menú. |

## Herramientas inferiores de comentarios

Antes estaban deshabilitadas. Ahora:

- Imagen abre selector nativo de una foto; convierte aJPEG, limita8MB, muestra miniatura56×56 con quitar. Permite foto sola o con texto. Subida por cuenta, referencia confirmada del servidor, conservación del adjunto y request_id al reintentar. La imagen publicada abre completa con contain. Editar conserva el adjunto existente; reemplazar una foto durante edición no forma parte de este cambio.
- Carita abre panel de emojis con categorías, recientes y búsqueda en español mediante CLDR. Altura tomada del teclado, ABC regresa al campo. Durante el selector se reserva la altura del compositor; no cambia el recorrido habitual del teclado nativo.
- @ inserta en el cursor y sugiere cuentas seguidas o participantes de ese video. Filtra y sustituye la mención incompleta; una mención publicada abre el perfil correspondiente.
- Micrófono usa SpeechRecognizer deAndroid y el idioma del teléfono para dictado de texto, con permiso, resultados parciales/finales e indicador azul #4682B4 con pulso suave. Otro toque detiene; salir/cambiar contexto cancela y destruye el reconocedor. Si el teléfono no ofrece dictado, informa el motivo. No introduce mensajes de audio ni modifica el chat privado.

## Servidor y conservación

Migración **20261021121622_feed_comment_tools_and_visible_counts**, aplicada por el conector y registrada con su versión real. No repetir. Añade `comments.image_path`, bucket privado `comment-images`, RPC separado para comentarios con foto, sugerencias y contadores visibles. RPC de texto anterior permanece compatible. RLS exige dueño de la foto; no permite editar/eliminar contenido ajeno. Lectura de imagen publicada mediante URL firmada de60segundos; al borrar se impiden nuevas lecturas ajenas, aunque una URL ya emitida puede durar hasta su expiración. No se borran archivos de Storage mediante SQL. Preferencias de borrado personal solo visibles a la cuenta: anon dispone de SELECT para contar bajo RLS, pero no obtiene ninguna fila privada.

Prueba real `scripts/tests/comment-tools-counts.rollback.sql`: dos cuentas, principal, respuestas propias/ajenas, hijo de respuesta, raíz ajena, invitado, foto, reintento, edición y eliminación. Todo dentro de transacción revertida; sin contenido de prueba persistente. Verificados total0, conservación de ajenos y privacidad. Auditor de seguridad: sin errores; avisos de funciones SECURITY DEFINER preexistentes y protección de contraseñas ajenos al alcance. Funciones nuevas son SECURITY INVOKER.

## Validación y entrega

185 pruebas locales aprobadas,0 fallos (27 archivos). Incluyen conservación de publicación/mensajería/registro/video/teclado, envío fallido, borrador, menú, respuesta, recientes, foto y cursor. El entorno local usa Babel para cargarTS: no equivale a typecheck. Las11 pruebas de feed-realtime, TypeScript real, prebuild y compilaciónAndroid se comprueban enCI antes de entregar.

Nueva compilación todavía pendiente al publicar este registro. Actualizar con run, commit, APK y checksum al finalizar. `physical_device_verified=false`: quedan por comprobar en teléfono la transición lenta, teclado/gestos/tres botones, galería/permisos/dictado, selector de emojis y comparación visual. No declarar esas pruebas realizadas por generar un binario.

Conservar branding, colores, video pequeño, tamaños aprobados de barras, flujos deAuth/OTP, cámara/publicación, mensajes privados y estados ya aceptados. El ajuste del nombre transitorio del chat es únicamente presentación.
