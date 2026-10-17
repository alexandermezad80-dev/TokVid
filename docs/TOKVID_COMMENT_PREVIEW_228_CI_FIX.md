# TokVid — corrección del fallo CI #228

Fecha: 17 octubre 2026. Rama estable de comparación: `feature/feed-mini-video-avatar`. Base exacta: `3ceda9cce80393e6e19191586c7375a40341f17b` (merge PR #6), derivada de APK 227 `a25ef9638cb6d4145cd117125578b69b5bbe7757`.

## Error reconocido

[GitHub Actions, ejecución 39076819712](https://github.com/alexandermezad80-dev/TokVid/actions/runs/39076819712), job 117525576675: **140 pruebas, 138 aprobadas, 2 fallidas**. Falló en `node --test scripts/tests/*.test.cjs`; no se ejecutaron TypeScript, Expo ni Gradle. Esta avería se introdujo en el PR #6 sin revisar toda la suite. No se generó ninguna APK #228.

## Diagnóstico basado en logs y código

1. `scripts/tests/comment-video-layout.test.cjs` aún exigía exactamente ratio `9/16` y posición superior `32` dp de la geometría previa. La especificación aprobada, `Comentarios feed-medidas.zip`, exige **155 × 275 dp** desde **42 dp** en referencia de 360 × 802. La prueba antigua no estaba actualizada para la nueva geometría.
2. `scripts/tests/feed-presentation.test.cjs` crea el mock de `ref` para garantizar un único reproductor/video; `VideoCard.tsx` lo había eliminado al dejar de medir el feed con `measureInWindow`. Esa eliminación rompió la prueba (TypeError) sin necesidad de cambiar la lógica de reproducción.

## Corrección mínima

- `artifacts/mobile/components/VideoCard.tsx`: restaurar el mismo `useRef<View>` y `ref={containerRef}` en la raíz, **sin volver a cambiar el reproductor ni la posición calculada**.
- `scripts/tests/comment-video-layout.test.cjs`: mantener todas las comprobaciones de teclado, safe areas y separación, pero cambiar las dos expectativas obsoletas por el ratio físico exacto `155/275` y la posición `42` dp. No se debilitan comprobaciones ni se deshabilitan tests.
- No se modifican backend, autenticación, políticas, paleta, comentarios ni teclado.

## Verificación real y límites

- Prueba local reproduciendo **los dos casos geométricos afectados** de `comment-video-layout.test.cjs` y cinco casos de `comment-preview-geometry.test.cjs`: **7/7 correctas**, en Node.js 22.
- La prueba mock de reproductor tiene restaurada la referencia usada por el test y no toca los callbacks del player. **Pendiente de CI completo**: las 140 pruebas y TypeScript/Android deben aprobarse en GitHub tras integrar esta rama.
- No declarar el video alineado físicamente ni la nueva APK entregada sin una compilación aprobada y comprobación en el Motorola G05.
- No iniciar fase 2 del área de comentarios: solo etapa 1.
