# APK para diagnosticar el regreso de Google

Esta compilación permite capturar la excepción real detrás de «Something went wrong». No cambia el intercambio de sesión, el destino de navegación, el registro por correo ni los ocho dígitos del código.

## Capturar en el teléfono

1. Instalar la APK del artefacto `tokvid-android-auth-diagnostic` de la rama `diagnostics/google-return`.
2. Repetir «Continuar con Google».
3. Si aparece el error, tocar **Ver diagnóstico** antes de **Try Again**.
4. Copiar el texto manteniéndolo presionado o usar **Compartir informe** y enviarlo para revisión.
5. Después de guardar el informe, usar **Try Again** para entrar.

El informe incluye la excepción, la pila JavaScript, los componentes de React, la versión de Android, el commit de compilación y hasta 40 pasos de autenticación. Las URLs, correos y credenciales reconocidas se ocultan. No se envía nada automáticamente: el informe y los valores temporales usados para ocultar credenciales permanecen en memoria. Se pierden al cerrar/reiniciar la app; al comenzar otro intento de Google se reinicia la secuencia.

## Compilación e interpretación

El workflow Android de esta rama activa exclusivamente `EXPO_PUBLIC_AUTH_DIAGNOSTICS=1` y fija `EXPO_PUBLIC_AUTH_DIAGNOSTIC_BUILD` al commit. Ejecuta las pruebas y el typecheck antes del build autónomo de release. No ejecuta migraciones ni modifica la configuración Auth.

El paso de verificación exige el marcador `TOKVID_AUTH_DIAGNOSTICS_V1` y el SHA del commit dentro del bundle de la APK. El artefacto `tokvid-auth-diagnostic-sourcemap` conserva el mapa compuesto de Hermes y un manifiesto con SHA del commit y SHA256 de la APK. Para interpretar los offsets se debe usar el mapa de **esa misma compilación**, nunca el de otra APK.

La instrumentación queda desactivada sin el flag. Esta APK sirve para identificar la causa; el fallo observado todavía requiere reproducción física e interpretación del informe.
