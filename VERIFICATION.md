# Validación vigente — APK #217

Código: `306c29db53ccadcaf025f5cf574033cf5a3e250e`. Rama: `feature/feed-mini-video-avatar`.
[Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390): **success**, 127 pruebas, cero fallos, TypeScript y prebuild aprobados. `BUILD SUCCESSFUL in 17m 33s`.
[Descargar APK](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859633718). Extraer el ZIP e instalar `app-release.apk`.
SHA256 del APK sin comprimir: `f41fefeaa196444d06d895052733585b2a76647c512bd0c11955002ec9929388`.
[Mapa de fuentes del mismo binario](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38485133390/artifacts/11859303878).
[Manifiesto completo](docs/continuity/APK_217_VERIFICATION.json). [Implementación, decisiones y límites](docs/TOKVID_REFERENCE_DESIGNS_PHASE_3.md).

La migración `20261013102948_comment_removal_author_only` está aplicada y registrada. Prueba de permisos/cascada/conservación de respuestas aprobada con rollback. No se borraron publicaciones existentes al aplicar el cambio.

Pendiente comprobación física: teclado normal/emojis, comentarios sin segundo desplazamiento del video, navegación con botones/gestos y fuentes grandes, Detalles/Buscar/fondos, fotos/perfil y relaciones. Las pruebas automáticas no acreditan todos los modelos de teléfono. Branding y mensajería inmediata previamente aprobados se conservaron.

Este repositorio local es un snapshot parcial. Publicar sobre padres/árboles reales de GitHub, nunca sobre el historial artificial local. Esta entrega sustituye #210 y el antiguo manifiesto raíz de #204.
