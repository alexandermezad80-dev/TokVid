# Corrección de escala de fondos de chat — 17 octubre2026

## Problema y alcance

El usuario reportó repetidamente fondos gigantes/recortados dentro del chat y en Detalles. La captura1000176560 muestra miniaturas en las que faltan las olas, el patrón de Ondas y casi todos los doodles. La referencia1000173452 muestra tarjetas compactas de tres columnas con la composición reconocible completa. Pidió continuar con la corrección; se limita a la presentación de fondos.

## Causa y corrección

`ChatWallpaper` aplicaba `StyleSheet.absoluteFill` a una `Image` de un asset local1080×2400, sin ancho ni alto explícitos. Los offsets absolutos no sustituyen las dimensiones intrínsecas que una imagen local aporta: `resizeMode="contain"` actúa sobre las dimensiones del elemento, no establece las del padre. La imagen podía ocupar su tamaño original y quedar recortada dentro del contenedor.

Ahora el elemento Image tiene `width:'100%'` y `height:'100%'` del contenedor, conserva `contain`, y su capa de fondo limita el desbordamiento. El componente es el mismo en chat, selector y vista previa. Se conserva toda la composición y proporción, incluidos los motivos inferiores; si la proporción del espacio difiere, hay margen de fondo y no zoom/estiramiento. Esto prioriza la instrucción explícita de ver la imagen completa; `cover` podría recortar.

Las tarjetas del selector pasan de1080/2400 a9/16 como la nueva referencia; ancho100% de su columna, máximo112dp y centradas. En un teléfono de390dp, con los márgenes actuales, la tarjeta ronda103×183dp; máximo112×199dp. Se conservan tres columnas, orden, nombres, selección, colores y las imágenes originales. La propuesta preliminar72×160dp queda sustituida por esta referencia posterior.

Solo cambian:
- `artifacts/mobile/lib/features/messages/components/ChatWallpaper.tsx`
- `artifacts/mobile/app/chat-details.tsx` (estilo de miniatura)

No se modifican teclado, compositor, alturas del chat, mensajes, acciones de borrado, burbujas ni preferencias guardadas. Tampoco se modifica branding, feed, perfiles o permisos. Los demás requisitos recientes siguen fuera de esta implementación.

## Verificación

Ocho originales comprobados:1080×2400. Inspección del original Ondas coincide con la composición proporcionada. Cálculo de ajuste verificado en espacios de miniatura y de chat con/sin teclado: escala uniforme, imagen completa dentro de los límites. Validación sintáctica local de los dos archivos correcta.

Ejecución local amplia:124 pruebas aprobadas; un archivo no pudo ejecutarse porque falta la dependencia local `@supabase/supabase-js`. CI ejecutó las 135 pruebas con dependencias reales: todas aprobadas; TypeScript y prebuild Android aprobados. Esta comprobación de código/geometría no equivale a renderizado nativo verificado. APK 226 compilada correctamente: `BUILD SUCCESSFUL in 26m 19s`. Validación física pendiente: comparar Ondas, Menta y olas y Doodles en selector, vista previa y chat aplicado.


## Entrega APK 226

Código `9a162c843231958e4facf428a7e3fb7addae257b`, árbol `ef42c8df29b5126ec7f51475ff00145aade54370`, rama `feature/feed-mini-video-avatar`. [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777) y [descarga APK 226](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777/artifacts/12089588382). Extraer el ZIP e instalar `app-release.apk`.

SHA256 del APK: `6f973866409bab2765b547a6448a8a1ddaa41d5c7ac8fd6e006d4bf0eb0afe51`. [Mapa de fuentes del mismo binario](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39001106777/artifacts/12089598314); [manifiesto completo](continuity/APK_226_VERIFICATION.json). No confundir el digest del ZIP con el del APK.

Esta entrega contiene únicamente el ajuste visual de fondos sobre APK 225. No corrige el branding de inicio que el usuario rechazó ni implementa las nuevas observaciones de perfiles, videos o comentarios. `physical_device_verified=false`: las pruebas y la compilación no sustituyen comprobar las tres vistas en un teléfono.
