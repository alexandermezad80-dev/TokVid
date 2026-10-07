# TokVid — continuar desde aquí

Actualizado: **7 de octubre de 2026 (UTC)**.

## Regla del usuario

> «Lo que está hecho no se toca a no ser que necesite una actualización».

Conservar el comportamiento, diseño y decisiones aprobados. Para actualizar algo, identificar la necesidad concreta y modificar únicamente lo necesario, dentro del alcance autorizado por el usuario. No rehacer bloques terminados por preferencia del agente ni volver a pedir decisiones ya resueltas.

## Punto de continuación

- Repositorio: [alexandermezad80-dev/TokVid](https://github.com/alexandermezad80-dev/TokVid).
- Rama de trabajo vigente: **`feature/feed-mini-video-avatar`**.
- Último código compilado y entregado: **`a6e14783bbaede25f5f756f24250b7b62d9a85f0`**.
- [APK #204](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640/artifacts/11516477647): descargar el ZIP e instalar `app-release.apk`.
- [Compilación verificada](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640): 92 pruebas aprobadas, typecheck móvil aprobado y Android compilado correctamente.
- **Siguiente paso:** recoger la prueba del usuario en su teléfono de Google, video pequeño con comentarios/teclado, botón + y guardado del avatar. Estos cambios están implementados y entregados; la confirmación física de esta APK sigue pendiente.
- Los commits de documentación posteriores pueden avanzar la rama sin cambiar el código de la APK #204. No confundir el último commit documental con el commit del binario.

## Documentos que debe leer la siguiente sesión

1. [Estado completo y entrega entre sesiones](docs/continuity/TOKVID_SESSION_HANDOFF.md): decisiones vigentes, cambios terminados, evidencia, pendientes y archivos para retomar.
2. [Documento maestro de requisitos](docs/requirements/TOKVID_MASTER_REQUIREMENTS.md): visión completa y requisitos del proyecto. Incluye propuestas históricas y trabajo futuro; no todo está implementado.
3. [Reglas para agentes](AGENTS.md): conservación del trabajo aprobado y protocolo de continuidad.
4. [Verificación de la APK #204](docs/continuity/APK_204_VERIFICATION.json): identificadores, checksum y estado de las pruebas.

**Frase para iniciar otra sesión:**

> Continuemos TokVid desde la rama `feature/feed-mini-video-avatar`. Lee `CONTINUAR_AQUI.md` y `docs/continuity/TOKVID_SESSION_HANDOFF.md`. Conserva lo terminado salvo una actualización necesaria. La última APK entregada es la #204; retoma desde sus pruebas físicas pendientes y mis siguientes observaciones.
