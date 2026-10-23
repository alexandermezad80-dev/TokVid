# TOKVID — C1: almacenamiento local de borradores (aprobación y contrato)

Auditoría: 22 octubre 2026, rama `feature/feed-mini-video-avatar`, antecedente `abae7a2c344de514a7f9dddd29f0bb2c9761751b`. En el maestro `docs/requirements/TOKVID_MASTER_REQUIREMENTS.md` la sección 18 requiere guardar, recuperar, conservar edición, varios borradores, eliminar y no publicar accidentalmente.

## Decisión expresamente aprobada
- Estrategia híbrida por etapas: primera etapa borradores **locales privados**, luego respaldo privado en la cuenta por separado. No implementar ahora la nube.
- Conservar el editor de publicación actual y ampliarlo posteriormente con funciones progresivas, sin reemplazar su flujo probado.
- Borradores en sexto icono propio, independientes de Herramientas y Detalles. Feed y branding protegidos.

## Auditados antes de escribir
- Compositor `app/(tabs)/create.tsx` contiene estado temporal `PublicationDraft`, descripción y vista previa; la X solamente descarta, no guarda.
- Persistencia: dependencias ya existentes `expo-file-system` y `@react-native-async-storage/async-storage`; no instalar paquetes ni modificar lockfile.
- Supabase real `TokVid`: no se encontró tabla de borradores; bucket `videos` es público. No meter borradores en Storage público.
- El servicio `publishDraft` valida cuenta, archivo y confirmación remota; intocable.
- El editor tiene un caso especial para responder con videos a comentarios, sujeto a validación del comentario; conservar su `replyCommentId`.
- Se auditaron los esquemas y permisos de almacenamiento en solo lectura, sin ejecutar DDL ni escribir datos.

## C1: implementación aislada
- Solo nuevo servicio `lib/features/publishing/localDrafts.ts`, pruebas autónomas y documento. No conectar aún botones ni alterar UI.
- Guardar **copias completas** del archivo y portada opcional bajo `FileSystem.documentDirectory/tokvid-drafts/v1/<user_uuid>/<draft_uuid>/`; no guardar solo rutas de caché.
- Metadata en AsyncStorage por identificador de cuenta: `@tokvid:local-publication-drafts:v1:<user_uuid>`. Incluye descripción, origen de respuesta si aplica y fecha de creación/edición. No almacena URLs públicas `uploadedUrl` ni `thumbnailUrl`.
- API `saveLocalPublicationDraft`, `listLocalPublicationDrafts`, `openLocalPublicationDraft`, `deleteLocalPublicationDraft`. Valida formato UUID, rutas propias, tipo, tamaño y presencia del archivo.
- Serializar escrituras del índice. Actualizaciones conservan el archivo anterior hasta completar escritura de metadata; si falla, eliminar nuevas copias en medida de lo posible. Limpieza de versiones antiguas es de mejor esfuerzo y emite una advertencia diagnóstica si falla.
- No hace llamadas a Supabase, no inserta `videos`, no invoca publicación, no crea migraciones, no accede a claves remotas. Exclusivo para Android/iOS; web falla explícitamente en vez de fingir persistencia.
- Privacidad local = almacenamiento sandbox de la app y claves por cuenta, **no cifrado de extremo a extremo**. Si otra cuenta inicia sesión en el mismo dispositivo no debe acceder vía esta API a los borradores anteriores. Si se borra la app/almacenamiento pueden perderse.
- El tamaño de los archivos originales sigue sometido a `validateMedia` en el flujo que prepara la publicación; C1 valida que exista y que la copia coincida en tamaño. No usar como fuente externa sin el editor.

## Próximas fases — NO implementadas en C1
- C2: botón Guardar borrador, menú Salir (guardar/seguir/descartar) sin publicarlo; recuperar borrador y descripción en el mismo editor. Preservar foto/video y respuesta a comentario.
- C3: sección privada Borradores en la sexta posición de la barra; grilla de miniaturas, reabrir, eliminar con confirmación.
- C4: pruebas de reinicio, cambio de cuenta, espacio insuficiente, archivo desaparecido, borrado y publicación real, en Android físico. Probar una sola APK final por conjunto aprobado.
- Etapa futura con autorización independiente: respaldo privado de cuenta y funciones avanzadas del editor.
