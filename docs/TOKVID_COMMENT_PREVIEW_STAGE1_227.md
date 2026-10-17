# TokVid — Corrección aislada de miniatura (etapa 1)

Fecha: 17 octubre 2026. Alcance autorizado: **solo miniatura y desfase de video**, tomando como referencia visual la **build 227** que indicó el usuario. Fuente: `Comentarios feed-medidas.zip`, `LEEME-medidas-y-aclaraciones.md`, sección 3.

## Línea base y conservación

- Rama de origen: `feature/feed-mini-video-avatar`.
- HEAD de origen comprobado antes de editar: `a25ef9638cb6d4145cd117125578b69b5bbe7757`.
- Rama de trabajo **aislada**: `fix/comments-preview-build227-stage1`.
- **APK 227 confirmada:** [GitHub Actions ejecución 39050681410](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410) corresponde al código `a25ef9638cb6d4145cd117125578b69b5bbe7757`, exactamente el HEAD de origen de esta rama. 135 pruebas, 0 fallos; TypeScript, Gradle y generación APK aprobados. El paquete APK original es [artefacto 12108250234](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39050681410/artifacts/12108250234), SHA256 interno del APK `66f73fa066e891c2c46071d467e06aa70f2d61627285c7fbb58d54861085149f`. Corresponde a la APK sin corrección. El repositorio no contiene todavía un manifiesto específico 227.
- Ninguna modificación de Supabase, RLS, autenticación, comentarios, compositor, cabecera, teclado, navegación, branding, reproductor, fuentes, disposición de filas o otras pantallas.
- Sin build de Android: la rama separada no activa el workflow que escucha solo `feature/feed-mini-video-avatar`.

## Implementación (únicamente etapa 1)

| Archivo | Cambio acotado |
|---|---|
| `artifacts/mobile/lib/commentVideoLayout.ts` | Establece 155 × 275 dp centrados en referencia 360×802; superior 42 dp para safe top 25; hoja desde y325 con aire de 8 dp. Usa insets + origen del modal. En pantallas pequeñas reduce proporcionalmente para reservar espacio de comentarios. No depende del teclado. |
| `artifacts/mobile/components/CommentsSheet.tsx` | Usa safeTop absoluto y viewportTop para medir desde el mismo origen; marco radio16, borde blanco 40%; icono maximizar ~10 dp a 16 dp del borde, conservando área táctil de 36 dp. No cambia la lógica ni el teclado. |
| `artifacts/mobile/components/VideoCard.tsx` | Evita restar `measureInWindow()` de la ventana de feed a coordenadas de la ventana de Modal, probable causa de desfase Android ~35 dp. Anima la misma superficie del video a las coordenadas físicas del frame, radio16, conservando `VideoView`, `contentFit=cover`, player y acciones existentes. |
| `scripts/tests/comment-preview-geometry.test.cjs` | 5 pruebas de geometría sin tocar configuración de CI. |

## Comprobaciones efectuadas

- TypeScript puro: `tsc --target es2020 --module commonjs --strict --skipLibCheck commentVideoLayout.ts`: **aprobado**.
- `node --test scripts/tests/comment-preview-geometry.test.cjs`: **5/5 aprobadas localmente** usando `typescript` de Node; referencia 360×802, teclado invariable, cambio de origen del modal, safeTop alto y pantalla estrecha/baja.
- **No ejecutado:** typecheck total React Native, prebuild Expo, Gradle, APK, pruebas en Motorola G05 y reproducciones de videos. No reportar «resuelto en dispositivo» hasta probar.
- Hipótesis del desfase: mezcla de `measureInWindow` entre dos ventanas Android; requiere confirmar con captura real de APK compilada. En otros diseños de feed, validar origen del elemento activo.

## Prueba física requerida antes de etapa 2

1. Build 227 ya confirmada por commit/run. Generar una nueva APK desde el cambio aislado y verificar sus resultados automáticos; no confundirla con la 227 original.
2. En Motorola G05 abrir comentarios desde cualquier video real: comprobar marco y video coincidentes, **x=102,5; y=42; ancho=155; alto=275; radio=16** (referencia 360×802).
3. Comprobar aire de 8 dp y que se ven los cuatro bordes y el botón maximizar.
4. Repetir con teclado cerrado/abierto varias veces: **miniatura inmóvil**. Cambiar de video y volver al feed sin salto ni video superpuesto.
5. Si se observa diferencia por barras nativas o coordenadas del feed, registrar captura/mediciones; corregir **solo este tramo** antes de pasar a cabecera/compositor.

## Etapas siguientes, sin implementar

- Etapa 2: cabecera de vidrio/cuerpo blanco/barra de 74 dp con teclado cerrado.
- Etapa 3: pieza de 146,5 dp sobre teclado; 7 emojis, imagen/sticker/@/mic, contador y botón.
- Etapa 4: visibilidad de nuevo comentario y retorno al estado cerrado.

No ampliar alcance ni declarar aceptación física hasta confirmación del usuario.
