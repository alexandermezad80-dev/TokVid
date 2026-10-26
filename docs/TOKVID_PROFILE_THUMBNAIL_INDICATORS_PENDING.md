# TOKVID — indicadores de miniaturas del Perfil: anotación pendiente

Fecha: 26 octubre 2026. **Estado: documentado, NO implementado.**

## Instrucción vigente

El propietario aporta las capturas `1000183118.jpg` (Guardados) y `1000183116.jpg` (Me gusta) y ordena: «no hagas nada toma nota». Esta anotación no autoriza cambios de aplicación, otra APK, merge a main ni cambios al editor. Su pregunta posterior «Has documentado todo?» se atiende guardando este requisito en GitHub y enlazándolo desde los documentos de continuidad.

## Presentación solicitada

1. En la esquina superior derecha, dentro de cada miniatura, mostrar **únicamente el símbolo de reproducción ▶ y su número de vistas**.
2. Mantener en la parte inferior, dentro de la miniatura, los indicadores correspondientes: corazón, guardado y los demás que ya existan. Evitar que se superpongan con el play o con las vistas.
3. Retirar el distintivo adicional que diferencia «foto» de «vídeo». El play permanece junto al contador de vistas; no debe confundirse con conservar otro distintivo de tipo en la parte inferior.
4. Conservar tamaños, distribución, contenido, acciones de las miniaturas y funciones aprobadas. No extender este apunte a un rediseño del Feed, de las barras o del perfil.

El comentario de que una foto editada con música pasaría a vídeo expresa el razonamiento del usuario. **No se ha verificado ni implementado aquí una conversión automática de formatos**, ni se autoriza cambiar el editor por esta nota.

## Base que se conserva

- Última entrega: APK311, código `90ca07cc03b682e45239211fd6d23b8ed850f3a8`, rama `feature/feed-mini-video-avatar`.
- [Entrega de iconos/indicador, pruebas y APK311](TOKVID_PROFILE_ICONS_INDICATOR_20261026.md): 359 pruebas CI aprobadas y compilación Android correcta. Esta nota no modifica ese binario ni su código.
- Aprobación anterior del usuario: swipe y toques de APK310, con la excepción del indicador; refresco propio de APK308 aprobado. Conservar esos comportamientos.
- Las dos capturas por sí solas no confirman todos los casos dinámicos de la corrección del indicador de APK311. No registrar una aprobación física completa sin esa confirmación.
- Feed automático sin duplicados y extensión del refresco a perfiles visitados siguen como pendientes separados; no se implementan con esta anotación.

Referencias recibidas: SHA256 `1000183118.jpg` = `9d57355522b00e635938d413745c6b37f68ff7cc0542dce6a92dddb44cc1429c`; SHA256 `1000183116.jpg` = `c3f3188c808e983fa6f7ee9ddb9168b932221605d390f7622090d416b8a59e9e`.

## Siguiente paso

Esperar a que el propietario termine sus observaciones y autorice implementar. Entonces auditar el componente real de miniatura y sus consumidores, comprobar el dato real de vistas y limitar el ajuste a la presentación acordada. **Por ahora: solamente documentación, sin cambios de código, pruebas nuevas ni APK.**
