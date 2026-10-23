# TOKVID — Editor E1: capacidades nativas y decisiones pendientes antes del primer recorte

**Fecha:** 23 octubre 2026. **Base:** `01c6c69939cbafac7a0bd87d47c9f225fdba81e7`. **Alcance:** exclusivamente auditoría documental; no se modifica el editor ni el diseño aprobado, y no se instala ninguna dependencia. Registro/Login, Feed, identidad visual, perfiles, borradores, publicación, Supabase, migraciones y workflows quedan intactos.

## Resultado de revisar el código real

**Plataforma:** `artifacts/mobile/package.json` declara Expo 54, React Native 0.81.5, `expo-camera`, `expo-image-picker`, `expo-video`, `expo-image-manipulator`, `expo-file-system` y `expo-audio`. `app.json` fija minSdkVersion 24 para Android. El proyecto no declara actualmente en package.json un motor dedicado de exportación/transcodificación o corte de clips de video.

**Captura:** `app/(tabs)/create.tsx` obtiene un único archivo de galería o cámara; hasta 180 segundos. `VideoView` reproduce la previsualización y `player.generateThumbnailsAsync(0)` crea una portada desde el tiempo cero. **Reproducir/pausar o escoger fotograma no produce un archivo recortado**. `expo-image-manipulator` se usa exclusivamente para preparar imágenes/fotogramas; no se halló uso de recorte temporal ni exportación de un video.

**Borradores:** `PublicationDraft` contiene un solo `uri`, tipo, extensión, tamaño, miniatura y, opcionalmente, referencia de comentario; no conserva rangos de recorte ni secuencias de clips. `localDrafts.ts` copia un archivo a almacenamiento privado por cuenta, valida su tamaño y su MIME, y restaura ese mismo archivo. Añadir rangos de edición requiere ampliar el modelo y ofrecer una estrategia para leer borradores históricos sin perderlos.

**Publicación:** `publishDraft` recibe un archivo y no transforma su tiempo o contenido. Un supuesto recorte que solo altere la posición de reproducción, sin exportar un archivo nuevo, **publicaría el original íntegro**: implementación prohibida como falso editor.

## Requisitos de seguridad para un recorte verdadero
- Distinguir **previsualización del intervalo** de **archivo recortado efectivamente exportado**; Publicar debe subir solo el recorte verificado, nunca el original fingiendo que se editó.
- Validar tiempo inicial y final con duración real del archivo; no inventar duración si no consta, y conservar el límite de publicación de hasta 180 s y 250 MB vigente.
- Guardar y recuperar edición sin pérdida accidental, conservando los borradores antiguos y el aislamiento privado por cuenta; evitar crear residuos grandes sin política de limpieza.
- Cancelar/deshacer debe mantener el original intacto; confirmar transformación real y tamaño/MIME del archivo antes de guardarlo o subirlo.
- Distinguir fallos de motor/exportación, almacenamiento insuficiente, cancelación y archivo inexistente. Ningún fallo debe publicar accidentalmente.
- Los videos-respuesta a comentarios conservan vínculo de comentario, permisos y validación actual.
- No tocar ni reacomodar la UI del Feed, el perfil, branding, tab bar, workflow, ni la cámara/galería actual fuera del subbloque aprobado.

## Decisiones expresas pendientes de aprobación del propietario
1. **Primera herramienta concreta:** recortar inicio/final de **un** video (sin mezclar varios clips) o elegir otra función del Editor como primera prioridad.
2. **Presentación/UX de recorte:** diseño exacto de controles/rangos y ubicación en el compositor de TOKVID. No se inventarán iconos ni medidas sin referencia/autorización.
3. **Motor nativo de exportación:** no existe instalado un motor de corte/transcodificación declarado; hay que evaluar compatibilidad Expo/Android, licencias, formatos, rendimiento y APK antes de elegir/añadir uno.
4. **Proyecto guardado:** decidir entre archivo ya recortado guardado como nuevo medio o persistir metadatos/rango del proyecto para reabrir edición; ambos necesitan pruebas físicas y tratamiento de borradores heredados.

## Estado
E0 (auditoría existente) + E1 (factibilidad técnica documental) realizados. **Ninguna herramienta de recorte real queda implementada o validada**. Siguiente paso: pedir aprobación explícita del primer subbloque, luego realizar auditoría técnica del motor específico y recién después programar, probar, hacer push `[prepare only]` y usar APK conjunta para aceptar visualmente.

`scripts/tests/editor-current-behavior-e0.test.cjs` y los contratos C1–C4 siguen protegiendo el comportamiento anterior. Esta auditoría no añade dependencias ni modifica el código de aplicación.
