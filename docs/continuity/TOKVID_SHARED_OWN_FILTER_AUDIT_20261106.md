# Compartidos: diagnóstico de la captura del 6 noviembre 2026

## Petición y decisión confirmada

El propietario muestra Compartidos vacío y un video de @Alexander con contador 8.
Tras explicar el filtro y preguntar si desea incluir videos propios, responde:
**«Mantener solo videos ajenos»**. Se conserva esa regla; las historias mantienen
el alcance anterior (propias/ajenas activas). No ampliar ni quitar filtros de autor
por estas capturas.

## Evidencia comprobada

- Rama remota: `feature/feed-mini-video-avatar`; código APK317:
  `cc287937ff56b327e00bf1b17f4e0f60e84a21d2`.
- Consulta agregada de solo lectura: un perfil Alexander coincidente,
  **8 eventos de compartir**, **1 publicación distinta**, **8 eventos sobre
  contenido propio**, **0 eventos de videos ajenos**, **0 historias compartidas**.
  No se exportaron destinatarios, mensajes, credenciales ni identificadores de usuarios.
- La función desplegada `private.profile_shared_content` excluye
  `v.user_id = p_user`. La app también excluye `item.creatorId === userId`
  en `useMySharedVideos.ts`.
- El contador representa envíos registrados del video; la pestaña muestra una
  referencia por video ajeno compartido. No son el mismo conteo.
- La exclusión de publicaciones propias explica exactamente este caso. No
  demuestra un fallo de guardado de videos ajenos: no hay eventos de esos videos
  en esta cuenta al realizar la consulta.

## Alcance y estado

Solo auditoría y documentación. Sin cambios de código, datos, esquema, refresco,
interfaz, iconografía, compilación ni merge a main. No se genera otra APK.

Siguiente paso si aparece un caso nuevo: revisar un envío real de un video de
otro creador desde Compartir, contrastando el registro con su referencia.
No añadir publicaciones propias para hacer desaparecer el estado vacío.

APK317: https://github.com/alexandermezad80-dev/TokVid/actions/runs/42056157887/artifacts/13431026905

El cierre anterior de APK317 existe en el commit documental
`95d1196f457eff91c69b37265c420f52a256e6a8`, pero su actualización de rama no se
confirmó. Este diagnóstico no altera ni sustituye ese trabajo pendiente.
