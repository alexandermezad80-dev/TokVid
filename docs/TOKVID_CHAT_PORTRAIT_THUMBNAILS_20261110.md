> **Corrección posterior autorizada:** se retira cover y la prop thumbnail. Todos los usos comparten de nuevo contain para las imágenes originales: composición completa, escala uniforme y sin recorte. Se mantienen exactamente las dimensiones verticales del commit8beeaaeb, los colores y stableFrame. Si difieren las proporciones del JPG y la tarjeta, contain deja espacio libre; no se afirma que llene el marco ni que reproduzca un screenshot del chat con idéntica relación de aspecto. La indicación más reciente prioriza imagen íntegra y medidas fijas. Se ha explicado este límite al usuario. Cinco pruebas existentes del lienzo sin cambios aprobadas; comparación del diff confirma que no cambia ningún estilo ni medida. Sin validación visual Android, TypeScript integral o nueva APK. Este bloque sustituye la decisión cover descrita en el historial inferior.

# Miniaturas verticales del chat — 10 noviembre 2026

## Autorización y alcance
El usuario autoriza aplicar la corrección: intercambiar ancho y alto del recuadro horizontal actual, conservar su tamaño pequeño y rellenar la miniatura. Sustituye la propuesta provisional de 40 × 89.
Base real: `1348709c81cfc6aeac275d5c608b381f670012a8`, rama `feature/feed-mini-video-avatar`. Snapshot local parcial sin .git; base y diferencias comparadas contra GitHub, sin sobrescribir snapshots anteriores.

## Implementación
- `artifacts/mobile/app/chat-details.tsx`: antes ancho min(112, 30.8% del grid) y alto 62dp. Ahora ancho 62dp y alto min(112, 30.8% del grid), medido por onLayout. Misma superficie y dimensiones intercambiadas. Conserva tres columnas, nombres, selección, acciones, márgenes y radios.
- `artifacts/mobile/lib/features/messages/components/ChatWallpaper.tsx`: opción thumbnail explícita, utilizada solamente por el catálogo. Imágenes con cover proporcional para llenar el marco; puede recortar los bordes del JPG, sin deformarlo. Colores/gradientes originales conservados. El comportamiento predeterminado y stableFrame del chat no cambian.
- No se añaden fondos, dependencias, animaciones ni trabajo por fotograma. Un estado compartido de medida para todas las tarjetas.
- Chat completo, teclado, burbujas, editor, pull aprobado, feed y barra inferior conservados. La adaptación de otros fondos a pantalla completa no forma parte de esta corrección de miniaturas.

## Verificación y límites
Cinco pruebas existentes de wallpaperFrame aprobadas (teclado, rotación, medidas, actualización y conservación del chat). Diff revisado: solo dos archivos de aplicación. No se ejecutó TypeScript integral ni compilación Android. Pendiente comprobar visualmente en dispositivo. No se generó APK ni se fusionó main.
Publicación con [skip ci] para no generar otra APK.

## Estado previo
APK320 fue entregada en run42518194402. El usuario confirmó los colores observados y el fondo fijo con teclado; reportó como defecto las tarjetas horizontales. Esa aprobación se conserva, sin afirmar aprobación física de esta nueva corrección.
