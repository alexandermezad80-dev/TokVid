# TOKVID — E2: aislamiento de lo funcional antes de desarrollar el editor

**Fecha:** 23 de octubre de 2026. **Rama exclusiva:** `feature/feed-mini-video-avatar`. **Base auditada:** `7109f44fa5ad440832d913b0090ace71454547aa`.  
**Alcance de este registro:** únicamente prueba de regresión + documento de continuidad. **No se ha implementado un editor, recorte, ruta nueva, dependencias nativas ni un nuevo APK.**

## Decisión del propietario

Conservar y aislar **todo lo que ya funciona** antes de introducir la ventana de editor independiente aprobada en [E2](../TOKVID_EDITOR_E2_SEPARATE_WORKSPACE.md). El primer subbloque autorizado sigue siendo recortar inicio y final de un solo video. Las demás herramientas son posteriores y no quedan implementadas ni priorizadas por este aislamiento.

## Protección previa que sigue activa

- `docs/TOKVID_APK261_PROTECTED_BASELINE.md` + `scripts/tests/tokvid-apk261-isolation.test.cjs`: 18 archivos de Feed, tab bar, visuales TOKVID y workflows fijados por Git blob SHA-1, además de contratos de Perfil/Inbox.
- `scripts/tests/editor-current-behavior-e0.test.cjs`: flujos existentes de cámara, galería, previsualización, descripción, publicar, respuestas a comentarios, límites y borradores.
- Contratos C1–C4 y pruebas de publicación / respuesta: persistencia privada local, recuperación, seguridad por usuario, confirmación antes de publicar y reintentos.
- **Ninguna de esas protecciones se reemplaza ni flexibiliza.** Las pruebas automáticas nunca equivalen a una prueba en teléfono físico.

## Aislamiento adicional E2

Se agrega `scripts/tests/editor-e2-protected-baseline.test.cjs`:

1. **Congelación exacta de cuatro dependencias aprobadas**, con hashes de contenido Git SHA-1 comprobados en la rama auditada:
   - `artifacts/mobile/lib/features/publishing/service.ts` — `952640c2984ac1c4cf7dba0de03024dead7828f3`
   - `artifacts/mobile/lib/features/publishing/nativeUpload.ts` — `340e1ccabc76b273d18822b806ef3209a54a7e76`
   - `artifacts/mobile/lib/features/publishing/localDrafts.ts` — `5dab1dfd853a6b60bd07665c810542fce7099fa2`
   - `artifacts/mobile/app/comment-video-reply.tsx` — `0f7ac1aacb502b0649feb9d64f0f6f4ca084b554`
2. **Contratos de `app/(tabs)/create.tsx`**, sin congelar toda esa pantalla porque más adelante requerirá enlazar la nueva ventana: cámara, galería, duración, fotografía, reproductor, descripción, restricciones de respuesta en video y acciones existentes.
3. **Separación Guardar/Publicar**: Guardar borrador nunca invoca publicación/subida, conserva la identidad de cuenta y la restauración del comentario; Publicar continúa siendo una acción expresa.
4. **Salida segura del compositor**: conservar Seguir editando, Guardar borrador y Descartar cuando hay un trabajo sin publicar.
5. **Límites vigentes:** video máximo 180 segundos, 250 MB y formatos MP4/MOV. No afirmar aún que existe recorte real.

## Política de cambios para el próximo bloque

- Toda modificación de un archivo con hash fijado debe tener necesidad concreta, revisión de diff, autorización del propietario, pruebas nuevas y registro del SHA nuevo. **No actualizar hashes para hacer pasar CI sin auditar el cambio.**
- La futura ventana y la transformación real deben implementarse de manera aislada; no rediseñar Crear, Feed, Perfil, Tab Bar, marca o workflows. Los nuevos controles del editor necesitan revisión visual.
- El aislamiento del servicio actual es intencional: si guardar proyectos de edición exige evolucionar `localDrafts.ts`, se diseñará y autorizará una migración compatible de formato *local*, que deberá seguir abriendo borradores heredados sin pérdida. No implica ninguna migración Supabase.
- El video original nunca puede publicarse como si hubiera sido recortado. El recorte futuro necesita exportación real verificada, conservación del original, manejo de fallos y pruebas específicas.
- Se usa commit `[prepare only]`, sin APK ni modificaciones de workflow. El CI de la rama ejecuta `node --test scripts/tests/*.test.cjs` sobre cambios en `scripts/tests/**`.

## Entrega y límites

En este checkpoint solo cambian este documento y la nueva prueba. No se modifican archivos de producción, paquetes, bases de datos, migraciones, Auth, Feed, branding ni workflows. La aprobación por CI se anotará **solo si GitHub la confirma**. Pruebas físicas del editor y cambios posteriores a APK 261 siguen pendientes. 

**Continuación:** auditar alternativas de motor nativo real y preparar propuesta visual del editor; consultar antes de elegir motor, instalarlo o modificar un flujo aprobado.
