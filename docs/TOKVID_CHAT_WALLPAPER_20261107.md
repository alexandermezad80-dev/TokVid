# Chat privado — Aurora adaptable y catálogo compacto

7 noviembre 2026. Autorización del propietario después de prepare only y propuesta visual 02: «Bueno aplica los cambios y aisla todo lo que funciona bien».

## Alcance implementado

Aurora es el primer fondo adaptable: campos de color SVG a tamaño relativo, usando react-native-svg ya instalado. Conserva la familia de tonos pastel de la propuesta; no estira ni recorta un JPG. Se reutiliza en la conversación, el catálogo y la vista previa. Los otros diseños permanecen como estaban; no se han sustituido automáticamente por los ejemplos ilustrativos de la maqueta.

El lienzo decorativo del chat conserva la mayor altura medida al mismo ancho durante la apertura/cierre del teclado. El teclado oculta parte del fondo sin comprimirlo. Al cambiar el ancho se vuelve a medir (rotación/ventana dividida). No se altera el KeyboardAvoidingView, el scroll, el compositor ni los insets. Si el chat se monta ya con teclado visible, la primera medida corresponde al área disponible; se amplía al recibir una medida mayor. Un cambio de altura de ventana sin cambio de ancho conserva el lienzo y lo oculta parcialmente; no se afirma validación física de ese caso.

Detalles conserva los mismos fondos, nombres y acciones: miniaturas de 62dp de alto en tres columnas, radio10, marca de16dp e icono10; borde seleccionado1.5dp. Las etiquetas mantienen12sp y su separación pasa de8 a6dp. Área táctil mayor de48dp de alto. La vista previa grande y el guardado de la selección por cuenta/conversación permanecen intactos. Se añade estado accesible de selección.

## Base y aislamiento

Rama existente: feature/feed-mini-video-avatar. Base real: 17a1ad70c73cce99c98806f9ee98b2433911bc92. Snapshot local independiente: /workspace/TokVid-chat-wallpaper-work, sin .git; nunca se presenta como checkout real. No se creó rama ni se hizo merge a main.

Tres archivos existentes de aplicación modificados: app/chat.tsx (únicamente prop stableFrame del fondo), app/chat-details.tsx (solo catálogo), lib/features/messages/components/ChatWallpaper.tsx. Dos auxiliares nuevos: components/AuroraWallpaper.tsx y wallpaperFrame.ts bajo lib/features/messages. Un archivo de pruebas nuevo. Sin cambio de datos, servicios, permisos, envío, burbujas, preferencias, catálogo de recursos, dependencias o workflows.

Comparación binaria con la base: resto de archivos de aplicación locales intactos. Comprobación específica de pull aprobado, Feed, perfiles, Inbox, Compartidos, grupos y package.json. En chat.tsx se verificó igualdad exacta con la base al retirar exclusivamente la prop nueva. El pull de APK318 está aprobado por el propietario; no recalibrarlo.

## Validación y límites

Cinco pruebas dirigidas aprobadas mediante node scripts/tests/chat-wallpaper-frame.test.cjs: secuencia de teclado, cambio de ancho/rotación y crecimiento, tamaño independiente de miniaturas/vista previa, medidas inválidas/no-op y conexión aislada al chat. Se ejecuta la lógica TypeScript con stripTypeScriptTypes de Node24; el test conserva fallback al compilador TypeScript de CI.

No se completó el typecheck integral ni la validación de renderizado nativo: el snapshot carece de dependencias y la descarga del compilador quedó interrumpida. No confundir pruebas de lógica con prueba en teléfono. No se genera APK ni se activa CI para compilar: publicación con [skip ci], workflows intactos. La última APK sigue siendo318; esta implementación no está instalada en el teléfono. Antes de una futura APK, ejecutar typecheck completo y revisar Aurora con/sin teclado, vista previa, catálogo, Android15 con gestos/tres botones y selección persistida.

## Pendientes separados

Compartidos y tarjeta de miniatura en Mensajes permanecen en prepare only. No se ha corregido su envío: demo id1 rechazado por UUID inválido; publicación propia JPG llega como texto/enlace y necesita tarjeta. Mantener regla de videos ajenos en Compartidos. No generar APK para este bloque hasta nueva instrucción del propietario.
