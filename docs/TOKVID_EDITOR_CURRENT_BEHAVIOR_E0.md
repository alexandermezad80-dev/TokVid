# TOKVID — Editor E0: auditoría del compositor y aislamiento de lo funcional

**Base verificada:** `1b7124634363200f1591937c928ec8e8311c0b62`, rama `feature/feed-mini-video-avatar`, después del bloque D3. Esta auditoría **no modifica código de producción**. Registro/Login, Feed, branding, las pantallas aprobadas y los workflows de Codex permanecen intocables.

## Lo que existe de verdad
- `app/(tabs)/create.tsx` implementa cámara foto/video, cambio de cámara, flash, grabación hasta 180 s, elección de video/foto en galería y preparación de fotos (redimensionado a máx. 1920 px si corresponde, JPEG).
- El estado `Phase = pick | edit | uploading | success` incluye **vista previa de video/foto, reproducción/pausa, descripción hasta 300 caracteres, público, Guardar borrador y Publicar**. “edit” aquí **no equivale** a editor multimedia avanzado.
- `lib/features/publishing/model.ts` valida video MP4/MOV hasta 250 MB y 3 min (180000 ms), foto JPG/PNG/WebP hasta 10 MB; tipo y dimensiones del archivo de entrada.
- `localDrafts.ts` guarda copias privadas por cuenta, identificación del proyecto, archivos/portada/descrición; restaura y elimina borradores; valida MIME y cuenta; su estabilidad durante reinicios está cubierta por tests simulados.
- `service.ts` confirma sesión antes y después de subir, usa ID estable en reintentos, valida contexto de respuesta en video a comentario, publica solo tras confirmación del backend. `nativeUpload.ts` mantiene control de subida. El comentario vinculado se valida de nuevo.
- Borradores se guardan solo localmente en el teléfono; no existe sincronización de proyectos en nube.

## Lo que NO existe aún (no representar como terminado)
- Recorte temporal de video, dividir o concatenar clips, pista de audio musical, mezclar/mutar audio, textos o stickers quemados en video, animaciones/efectos, filtros multimedia, transición entre escenas o exportación codificada de una versión editada.
- El `PublicationDraft` no tiene campos para guardar una línea de tiempo, múltiples clips, efectos, mezcla musical ni texto superpuesto; el guardado local actual persiste **archivo original/preparado, miniatura y descripción**, no un proyecto de montaje avanzado.
- No hay una pantalla de selección de portada por fotograma ajustable: se captura el fotograma del segundo 0, en modo best-effort.
- No afirmar que existe copia de respaldo de borradores en servidores ni edición reversible de multimedia.

## Riesgos reales que necesitan decisión/validación separada
1. Una subida a bucket público puede completarse y **fallar posteriormente** la inserción de la publicación. El código conserva reintentos idempotentes por ID, pero puede quedar un archivo huérfano; no prometer privacidad absoluta tras el primer intento de publicar. Auditar política de limpieza/propiedad antes de proponer operaciones destructivas.
2. Añadir transformación real implica decidir formatos de salida, límites de duración, procesamiento nativo, uso de espacio, restauración de proyecto y presentación visual; **no inventar controles o UX**. Es una etapa distinta de la captura actual.
3. La creación audiovisual y restauración local requieren prueba física (permisos, cámara real, grabación, reproducción, copia, almacenamiento lleno y reinicio). CI no reemplaza Android instalado.
4. La aprobación de un Editor avanzado **no autoriza** rediseñar el Feed, modificar Login/Auth, eliminar archivos de terceros, alterar la tab bar ni modificar workflows.
5. `docs/TOKVID_OWNER_DELETED_PUBLICATION_POLICY_D3.md` define las referencias de videos eliminados: el editor no debe reintroducir referencias inválidas.

## Baseline de regresión E0
`scripts/tests/editor-current-behavior-e0.test.cjs` protege las entradas, flujos, seguridad, límites y separación de publicar/guardar, sin bloquear el trabajo futuro. Los contratos ya existentes de C1–C4 y `publishing.test.cjs` deben seguir pasando.

## Próxima etapa de implementación (NO aplicada)
Diseñar el primer recorte real en un **subbloque separado**, estableciendo su comportamiento de edición/guardar/restaurar/exportar y su presentación con autorización del propietario; luego auditar librerías y capacidades Android antes de elegir procesamiento. **No seleccionar arquitectura ni añadir UI sin comunicar/consultar la decisión.**

**Entrega E0:** solo auditoría y pruebas, commit `[prepare only]`, sin APK ni migraciones.
