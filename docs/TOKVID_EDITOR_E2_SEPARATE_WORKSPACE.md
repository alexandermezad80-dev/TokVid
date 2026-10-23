# TOKVID — E2: editor audiovisual independiente, alcance confirmado

**Fecha:** 23 de octubre de 2026.
**Rama autorizada:** `feature/feed-mini-video-avatar`.
**Base auditada antes de documentar:** `03dc1a59c94fe30861daaa44e00b026e20206c25`.
**Tipo de entrega:** documentación de alcance / preparación; **NO implementación**, **NO APK**.

## Decisiones expresas confirmadas por el propietario

1. TOKVID debe contar con una **pantalla/ventana de editor audiovisual independiente**, no una pantalla separada exclusivamente para un botón de recorte ni un rediseño general de Crear.
2. Es el **espacio común de edición** para videos recién grabados, videos importados y proyectos **sin publicar** que se guarden y se reanuden desde Borradores. Al terminar de editar, el usuario conserva las opciones de continuar, guardar sin publicar o publicar expresamente.
3. El editor crecerá de manera progresiva con las herramientas previstas en **§11 de `docs/requirements/TOKVID_MASTER_REQUIREMENTS.md`**: recortar, unir clips, texto, música/sonido, efectos, filtros y ajustes visuales. Mencionar una herramienta prevista **no equivale a tenerla implementada ni a autorizarla como siguiente tarea**.
4. **Primera herramienta autorizada para desarrollar por bloques:** recortar el inicio y el final de **un único video**. No se presupone unión de clips ni efectos en este primer bloque.
5. El editor debe poder devolver su resultado al proceso actual de publicación, sin perder la posibilidad de guardar y reabrir Borradores.

## Auditoría del código existente (solo lectura)

- `artifacts/mobile/app/(tabs)/create.tsx` es hoy el compositor de captura, galería, vista previa, descripción, guardado y publicación; todavía no hay un editor audiovisual real independiente.
- `artifacts/mobile/lib/features/publishing/model.ts` representa un archivo por proyecto sin rangos de recorte, línea de tiempo ni transformaciones.
- `artifacts/mobile/lib/features/publishing/localDrafts.ts` guarda archivos locales privados por cuenta, valida el índice y conserva sus propios mecanismos de recuperación y borrado.
- `artifacts/mobile/lib/features/publishing/service.ts` publica la URI recibida. Cambiar solo la previsualización, sin crear un archivo realmente recortado, **publicaría el video original**, lo que es inaceptable.
- `docs/TOKVID_EDITOR_CURRENT_BEHAVIOR_E0.md` y `docs/TOKVID_EDITOR_VIDEO_TRIM_E1_FEASIBILITY.md` documentan las funciones existentes y la ausencia de motor de corte/exportación instalado.
- Plataforma declarada en la rama: Expo 54 / React Native 0.81.5; Android minSdk 24. La compatibilidad técnica de un motor concreto **no está comprobada**.

## Contratos que no pueden romperse

- **APK 261:** respetar `docs/TOKVID_APK261_PROTECTED_BASELINE.md`, sus pruebas y sus 18 archivos cerrados. Feed, identidad visual, tab bar, perfiles, Inbox y workflows de Codex no se tocan.
- **Crear existente:** mantener captura, cámara, galería, previsualización, descripción, controles, respuestas a comentarios y publicación base. Añadir una navegación al editor solo cuando se apruebe su presentación concreta; no recolocar el compositor existente.
- **Borradores C1–C4:** proyectos existentes deben seguir abriendo y guardándose, privados por cuenta y sin publicar accidentalmente. La persistencia de recortes o de su resultado necesita diseño de compatibilidad.
- **Publicación:** separar vista previa de exportación. Solo subir un recorte real confirmado, validado por duración/tamaño/formato, con manejo seguro de errores y sin convertir un fallo en publicación del original. Mantener relación con comentarios y reintentos idempotentes.
- Sin cambio de Auth/Login, Supabase, migraciones ni eliminación automática de archivos publicados por terceros. Editar/reemplazar una publicación que ya está en el servidor es **otro alcance**, no autorizado por esta decisión.
- Mantener el acuerdo de commits `[prepare only]` y única APK conjunta tras cierre/auditoría; no tomar el éxito de CI como prueba en Android físico.

## Límites / decisiones todavía abiertas (no inventar)

1. **Interfaz visual concreta** del editor independiente: disposición, iconos, tamaños, colores de controles y línea de tiempo requieren propuesta y aprobación; la arquitectura funcional aprobada no congela un diseño no presentado.
2. **Motor Android de exportación real**: investigar compatibilidad con Expo 54/nueva arquitectura, licencias, formatos, manejo de audio, desempeño, APK y riesgos antes de elegir librería, agregar dependencias o desarrollar plugin nativo.
3. **Representación del proyecto editado**: conservar original y rangos/metadatos para reanudar o guardar/exportar nuevo archivo. Definir validación, recuperación de borradores heredados, tamaño de almacenamiento y limpieza sin pérdida.
4. **Alcance de herramientas posteriores**: texto, música, filtros y unión de clips quedan previstas según maestro, pero **no implementadas** ni ordenadas por esta aprobación.
5. **Prueba física**: cámara, importación, recorte real, reconversión/audio, cancelar/deshacer, guardado tras reinicio, respuesta a comentario y publicación verificada en Android con evidencia.

## Siguiente bloque operativo

**E2a — propuesta visual + auditoría técnica del recorte verdadero.** Presentar/validar controles del editor y comparar motores de exportación viables sin introducir una dependencia ni modificar código protegido. Tras aprobar esos puntos, implementar la ruta/editor aislado y el recorte real, con pruebas de regresión y CI. Esta nota solo registra el alcance acordado, **no da por completado E2a ni E2**.

## Archivos afectados por este registro

Únicamente `docs/TOKVID_EDITOR_E2_SEPARATE_WORKSPACE.md`. No hay cambios de producción, pruebas, CI, workflows, migraciones, motor nativo ni APK en este commit documental.
