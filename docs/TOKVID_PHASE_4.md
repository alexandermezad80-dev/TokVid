# TokVid — fase 4 autorizada, 14 de octubre de 2026

Estado: implementación en curso; no hay APK nueva ni prueba física de esta fase. Base remota `0e217d8cbc6ce668677bc66613d77b33c826bf03`, rama `feature/feed-mini-video-avatar`. El usuario autorizó «ahora sí implementa y documenta estos cambios» después de aportar referencias. Las aclaraciones aquí registradas prevalecen sobre fases anteriores.

## Decisiones que conservar

- El contenido compacto de Información de perfil de APK 217 fue aprobado físicamente. No rehacer guardado, validación, fotos ni estructura. Su teclado y el del chat siguen necesitando corrección: compilar no equivale a probarlos en teléfono.
- Comentarios: edición/borrado individual solo por autor; borrar el principal propio elimina el hilo. Conservar comentarios, mini video y tab bar tapada; no reabrir esas decisiones.
- Buscar en detalles del chat solo muestra campo y teclado al tocarlo. Las funciones existentes se conservan.
- Saldo y Suscripción visibles; no inventar un servicio financiero. Las nuevas pantallas preparadas no significan cobros activos.
- El placeholder personalizado «Solange» se aplica **solo a la cuenta de Solange**, confirmado expresamente. No a otros usuarios ni a mensajes enviados.

## Alcance y criterios de aceptación

1. **Información de perfil:** cabecera negra `#0B0B0D`, esquinas inferiores 20, zona de avatar con degradado de referencia, contenido editable blanco y correo sobre negro. Teclado cubre zona negra/correo; solo desplaza lo necesario para nombre, usuario o descripción. Avatar puede quedar parcialmente bajo la cabecera fija. Al tocar fuera se oculta el teclado y se restaura el desplazamiento. Separación pequeña y línea fina, sin hueco grande. Respetar insets Android reales.
2. **Perfil propio:** puntos superiores abren directamente Información de perfil; se elimina menú intermedio. Hamburguesa abre pantalla completa con Saldo, Herramientas de usuario, Centro de actividades, Ajustes y privacidad, Código QR, Eliminar cuenta, Cambiar cuenta, Cerrar sesión. Destinos preparados a pantalla completa; Saldo 0.00 es marcador explícito del diseño. Perfil con degradado gris/teal moderado, pestañas slate y grilla blanca. Mantener medidas actuales o menores que den espacio, nunca agrandar por copiar otra resolución. Avatar rectangular redondeado y borde de marca muy fino.
3. **Perfil público:** mismo diseño; Mensajes reemplaza Saldo, Suscripción visible. Sin hamburguesa ni puntos privados. Amigos permanece: muestra relaciones públicas y permite seguir/dejar de seguir desde la cuenta visitante. Solo Me gusta y Compartidos tienen visibilidad elegida por el dueño; no exponer otros controles privados ni datos privados mediante consultas.
4. **Feed propio/invitados:** columna lateral alineada, iconos de calidad equivalente a navegación, sustituir flecha de compartir rechazada; contador de cada acción. Avatar real con borde de marca muy fino; + de seguir más cerca. Compartir muestra iconos reales de apps instaladas y abre destino directamente, sin segundo selector. Conservar envío interno.
5. **Chat y detalles:** cabecera degradada de referencia con texto/iconos blancos y esquinas inferiores 20; contenido blanco. Detalles conserva opciones/estructura; botones y chips negros con iconos blancos, Denunciar rojo. Conservar flecha actual si es mejor. Buscar conserva activación puntual.
6. **Teclado chat:** editor entero sobre teclado, margen pequeño; último mensaje visible sin buscarlo; historial desplazable, cabecera fija. Teclado normal y emojis, cambios de altura, gestos y botones Android. Campo personalizado rectangular de bordes suavemente difuminados sin perder forma; placeholder Solange solo en su cuenta, desaparece al escribir y vuelve si vacío.
7. **Burbujas:** quitar Redonda del catálogo y normalizar preferencias antiguas a Clásica. Previews Hola de una línea sin deformar Elegante. Menú contextual de mensaje se conserva; Burbujas abre hoja inferior blanca con cabecera degradada, no otro popover lateral. Detalles conserva lista desplegable y comparte catálogo/colores. Añadir Magenta y dos estilos glass sobrios gris/azul. Persistencia y compatibilidad con clientes antiguos.
8. **Fondos:** los 8 originales 1080×2400 se ven completos, proporcionados y sin zoom/estiramiento (olas/sol incluidos), tanto chat como miniaturas/vista previa. Aunque se mencionó cover, prevalece ver la imagen entera: contain y relleno acorde cuando difiere la proporción. Añadir gris neutro y azul neutro.
9. **Inbox:** usar medidas del PDF, blanco, cabecera degradada y pestañas slate. Menú de conversación blanco: Eliminar para mí y Eliminar todos los mensajes. Confirmación blanca/roja para borrar la bandeja propia; no borrar historial ajeno ni mensajes nuevos que lleguen después del corte confirmado.
10. **Actividad:** mensajes tienen contador de no leídos que se limpia al entrar al chat; una notificación nueva comienza otro conteo. No galería para mensajes. Comentarios, likes de video/comentario, compartidos y favoritos tienen contadores separados por actor/tipo; tocar fila abre acción más reciente y destino exacto. Tocar avatar abre pantalla nueva de miniaturas relacionadas con esa actividad, fondo blanco y cabecera con colores/formas/medidas de Actividad. No exponer actividad ajena privada. Conservar navegación de seguir y otros tipos existentes.

## Medidas y colores de referencia

Las medidas se expresan en dp sobre 390 de ancho; los insets reales de Android reemplazan el ejemplo de 38. No escalar usando píxeles de capturas.

- Chat/Detalles: alto de contenido de cabecera 52.5 más inset superior, radio inferior 20; degradado 110° `#5F6A74`, `#76818B` (50%), `#2F9A9F`. Títulos blancos, controles táctiles 44. Información de perfil: zona negra de referencia 96 total, correo alto46/radio13, fondo `#161823`, borde `#2C2C2E`, texto `#8A8B97`.
- Perfil principal: controles 38 más inset, zona degradada referencia196.5; no agrandar medidas actuales. Herramientas: cabecera 96 total de referencia, degradado `#6B7885`→`#1FA5A9`, filas56, margen20, iconos22, texto17. Tarjeta Saldo margen20/fondo `#F9F9F9`/radio16, etiqueta15 y valor32.
- Hoja Burbujas: radio24, cabecera64, asa60×4, fondo blanco, backdrop negro50%, filas64/gap4/margen12/radio14, texto17. Seleccionado `#F1FAFA`/borde `#2F9A9F` 1.5. Preview84×40; Compacta60×32. Clásica `#7A64BE`; Minimalista blanco/borde `#2B4A8B`; Cristal `#E6E9EC`/`#C3C9CF`; Degradado `#5F6A74`→`#2F9A9F`; Borde suave `#FFF6E5`/`#E8B04B`; Elegante `#161616`; Compacta `#1F8A5B`.
- Inbox: cabecera38 más inset, título22, pestañas42 `#232F39`, activo blanco/inactivo `#9AA5AE`, indicador97×2 `#25F4EE`. Filas90, avatar48/margen15/texto empieza74, nombre15/mensaje14/hora13. No leído `#FFF1F3`, badge `#FE2C55`. Popover304/radio16/filas56. Confirmación310/radio20, botones46 y rojo `#E5393A`.

Fuentes: Medidas-Inbox-completo.pdf; Medidas-Encabezado-Detalles-del-chat-y-Chat.pdf; Medidas-y-colores-Estilo-de-burbuja.pdf; Medidas-Herramientas-de-usuario-y-Saldo.pdf; capturas e imágenes Chat-con-fondo-*.png de los ZIP suministrados. Se archivará texto extraído para continuidad.

## Registro de implementación y comprobaciones

Pendiente de completar con cambios reales, verificaciones, migraciones registradas, commit remoto y APK. No confundir los criterios anteriores con trabajo entregado. La comprobación física de teclado, aspectos visuales y destinos externos requiere la nueva APK en Android.
