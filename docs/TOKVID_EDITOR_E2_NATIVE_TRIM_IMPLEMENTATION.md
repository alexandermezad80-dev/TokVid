# TOKVID E2 — corte real Android / candidato a primera APK
**Rama:** `feature/feed-mini-video-avatar`. **Base:** `514e1d1bcdc83697408cdfeb01d1cd1b8ee0f1a8`.
El propietario autorizó una ventana de editor independiente y el primer bloque de recorte inicio/final de un video; luego solicitó una APK para probar este bloque.

## Implementación
- `app/video-editor.tsx`: editor a pantalla completa. Vista previa, pistas para inicio/final y ajustes de medio segundo, Aplicar y Cancelar. Controles visuales **provisionales hasta aprobación física**, sin afirmar que texto/música/filtros estén hechos.
- `videoTrimNative.ts`, `plugins/withTokvidVideoTrim.js` y módulo Kotlin: AndroidX Media3 Transformer 1.7.1. Crea MP4 nuevo en caché privada Android usando clipping real, comprueba archivo/duración/tamaño. Conserva original. No se invoca publicación desde el editor.
- `videoEditorSession.ts`: traspaso en memoria por proyecto/cuenta. El retorno a Crear valida resultado; la ruta anterior conserva los mismos flujos de Guardar borrador (C1–C4) y Publicar, y siempre exige acción del usuario.
- Si hubo carga pública previa del mismo borrador, se usa ID nuevo para el archivo editado; el material subido previamente no se sustituye. La versión previa guardada queda intacta hasta un guardado expreso.
- Cambios acotados a botón de entrada en `create.tsx`, módulo nativo nuevo, ruta nueva y registro de plugin en `app.json`. No modificar Feed, tab bar, login, perfiles, branding, servicios congelados ni workflows.
- Sin migraciones Supabase; sin actualización del formato local de borradores. Los proyectos C1–C4 heredados siguen siendo consumibles por el compositor.

## Límites y validaciones
- E0, E2, APK261 y tests anteriores permanecen activos; no cambiar hashes para silenciar fallos.
- Android API 24+, Expo 54, React Native 0.81.5; el motor es una elección técnica **a validar con Gradle en CI**, no afirmar compatibilidad comprobada antes del build.
- La interfaz de primera versión no incluye línea de tiempo con miniaturas, texto, música, filtros ni unión de clips.
- Requiere prueba física con MP4/MOV soportados, audio, cancelación, almacenamiento, guardar/abrir, cambiar cuenta, respuestas a comentarios y verificación de que se sube el recorte y no el original.
- Un recorte sin guardar permanece temporalmente en caché; su limpieza exhaustiva y proyectos multipista requieren bloque posterior.
