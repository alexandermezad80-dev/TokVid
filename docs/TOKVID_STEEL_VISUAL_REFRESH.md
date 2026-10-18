# Presentación azul acero y transición del branding — 17 octubre 2026

## Autorización y fuente válida

El usuario confirmó «Este es y trae las medidas y dónde se aplican sin dañar lo que ya está hecho» y autorizó «solo es visual aplica sin romper nada ... recuerda el flasheado blanco del branding ... implementa». Base: APK 226, código `9a162c843231958e4facf428a7e3fb7addae257b`; padre real de publicación `de61bff8e3b7996ed244d9ef47043e8af0a8b328`, rama `feature/feed-mini-video-avatar`.

Fuente válida: **TokVid-r-Medidas-y-colores-2.zip**, SHA256 `2fcf3e4fe7d161ca3d88015c140f928a95bf85353c829f20380cd79a730a301b`, con 12 imágenes anotadas, `Medidas-y-colores-TokVid.pdf` y `Colores-TokVid.txt`. Complemento visual: las 12 imágenes de **tus sueños.zip**. El PDF individual **Medidas-y-colores-Estilo-de-burbuja.pdf está descartado por el usuario**: no usar sus siete estilos como instrucción para eliminar opciones existentes.

## Medidas aplicadas

Todas en dp, referencia de pantalla de 390 dp de ancho. Las cabeceras tienen fondo azul acero, texto/iconos blancos, esquinas en los cuatro lados y una zona blanca superior con iconos de estado oscuros. Los valores superiores son mínimos: si la zona segura es más alta, se respeta su altura más 8 dp; el ancho sigue siendo el disponible menos los márgenes laterales.

| Cabecera | Margen por lado | Arriba | Alto | Radio | Ancho en 390 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Perfil propio y visitado | 10 | 38 | 40 | 16 | 370 |
| Ajustes, herramientas e Información de perfil, también con teclado | 12 | 44 | 48 | 20 | 366 |
| Chat y su menú | 6 | 40 | 50 | 20 | 378 |
| Detalles del chat | 12 | 40 | 50 | 20 | 366 |
| Inbox, actividad, mensajes y detrás de sus modales | 6 | 36 | 38 | 17 | 378 |
| Estilo de burbuja, dentro de la hoja | 12 | 17 | 40 | 20 | 366 |

- Franja «Mensaje»: azul acero oscuro, ancho completo, 40 dp, a 2 dp bajo la cabecera (y=92 en la referencia). Las opciones y reacciones existentes conservan sus acciones y presentación flotante; no se sustituye el comportamiento por un menú nuevo. La colocación se limita al espacio debajo de la franja.
- Hoja de estilos: blanca, máximo 588 dp de alto (y=256 en 844), radio superior 24, asa negra 60×4 a 8 dp del borde. Conserva los diez estilos actuales, con scroll y espacio seguro inferior.
- Perfiles: cuerpo blanco y texto oscuro; avatar de 84 dp conforme a la referencia, marco diagonal de 1 dp y radio 12. Botones Saldo/Suscripción/Mensajes de 84×32, radio 7 y marco 1.5 dp. Acciones y deshabilitados conservados.
- Barra de contenido de perfiles: iconos existentes de 22 dp, mismas columnas; superficie blanca, alto 39, líneas negras superior/inferior de 1 dp. En la composición colapsada de referencia queda alrededor de y=254.5/293 en A y y=258/296 en B; el contenido expandido y las zonas seguras desplazan la barra en flujo, sin superponerla a la biografía.
- Información de perfil: dos líneas de 1 dp, cian–magenta, ancho completo, bajo el bloque de foto y bajo el bloque que incluye el contador. Guardar: alto 34, radio 8, marco 1.5. Correo mantiene solo lectura, fondo blanco y borde gris. Campos, contador y ajuste de teclado conservados.
- Detalles: avatar 83×83, marco horizontal de 2.5, radio 13; Crear grupo/Ver perfil/Buscar: alto mínimo 56, radio 13, marco 1.5 e interior blanco. Iconos oscuros sobre blanco.
- Inbox: pestañas blancas, texto activo oscuro y separación gris de 1 dp alrededor de y=117.5. Contadores y subrayado cian conservados.
- Crear (+): 49×30, radio 9, marco horizontal de 1 dp cian–magenta, interior degradado azul. No se cambia el tamaño del icono ni el comportamiento de navegación/registro.

## Colores

| Uso | Código |
| --- | --- |
| Cabeceras | `#4B7194` |
| Franja Mensaje e inicio del degradado azul | `#3F6486` |
| Final del degradado azul | `#6F9CC4` |
| Marcos y líneas, izquierda a derecha | `#15DFF3` → `#E91C84` |
| Texto oscuro, líneas de pestañas, asa y barra inferior | `#0E1216` |
| Fondos/interior de marcos | `#FFFFFF` |
| Iconos inactivos | `#9AA5AE` |
| Etiquetas del perfil | `#5B6670` |
| Textos secundarios | `#6B7580` |
| Amigos y contador de caracteres | `#3F3F46` |
| Bordes | `#D5DADF` |
| Separador Inbox | `#E5E8EB` |
| Campo de escritura y etiqueta Amigos | `#F2F4F6` |
| Rosa existente, conservado | `#FE2C55` |
| Cian claro existente, conservado | `#25F4EE` |

El estilo de mensaje Degradado usa ahora los dos azules de la fuente válida en dirección horizontal. Los demás estilos y preferencias se conservan. Las variantes nuevas de ReferenceHeader se aplican expresamente a las pantallas indicadas; las demás cabeceras no se redimensionan por cambiar un componente compartido. El estado oscuro de los iconos del sistema solo se activa mientras la pantalla blanca tiene foco.

## Destello blanco antes del feed

Se confirmó en código que la paleta global había cambiado a blanco el contenedor de carga, la raíz y el fondo del Stack. La base anterior tenía contenedores oscuros. Se restauran esas tres superficies a negro y el indicador de estado claro durante la carga; además se declara negro como fondo nativo de la app para la transición. Las pantallas blancas siguen pintando su propia superficie.

No se modifican el archivo del logotipo, el splash turquesa `#0C959F`, su tamaño de 200, iconos de aplicación, plugins de branding, Auth, tiempos de carga ni flujo de entrada al feed. Esto corrige las capas blancas identificadas; la ausencia del destello en Android real requiere comprobación física, no queda demostrada por compilar.

## Conservación y verificación

Los callbacks de guardar, seguimiento, navegación, mensajes, borrar, reacciones y preferencias permanecen. No hay cambios de servicios, hooks, permisos, migraciones ni base de datos. No se modifican el escalado de fondos corregido en 226, el controlador de teclado, las alturas del compositor o panel de comentarios, ni los controles del reproductor. Las otras observaciones del usuario no se implementan como parte de este ajuste visual.

Validación sintáctica local de todos los archivos cambiados aprobada. Auditoría comparativa: se conservan los 137 enlaces JSX de eventos de los archivos existentes modificados. Pruebas existentes de guardar foto con fallo/reintento y estabilidad de hooks aprobadas; solo se adaptan sus dobles de componentes decorativos nuevos, sin eliminar aserciones. CI completó 135 pruebas sin fallos, TypeScript real, prebuild y Android correctamente. La verificación física permanece pendiente; ver el cierre de entrega y el manifiesto.

## Cierre de verificación APK 227 — 18 octubre 2026

Código `a25ef9638cb6d4145cd117125578b69b5bbe7757`. [Descargar APK 227](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410/artifacts/12108250234): extraer el ZIP e instalar `app-release.apk`. [Mapa de fuentes correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410/artifacts/12108210454). Compilación Android: `BUILD SUCCESSFUL in 18m 4s`; 135 pruebas aprobadas, 0 fallos, TypeScript y prebuild correctos. SHA256 APK: `66f73fa066e891c2c46071d467e06aa70f2d61627285c7fbb58d54861085149f`.

Cabeceras, medidas, colores y líneas del ZIP válido implementados; capas blancas identificadas del arranque corregidas. La ausencia del destello requiere prueba en teléfono: `physical_device_verified=false`.

Al cerrar el registro, la rama ya contiene cambios posteriores de comentarios hasta `ba910406234390673436b47c06897fc6afae4e52`. Se conservan íntegros. APK 227 identifica esta entrega visual; no incluye esos cambios posteriores y no debe presentarse como la última compilación de la rama.

[Manifiesto verificable](continuity/APK_227_VERIFICATION.json).
