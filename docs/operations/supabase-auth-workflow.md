# Permisos del workflow de Supabase Auth

El workflow `Supabase migrations` publica migraciones y después configura y verifica las plantillas OTP. Un `Auth configuration GET failed (403)` indica que la Management API denegó el acceso a la configuración de Auth. No indica que las migraciones anteriores hayan fallado: `supabase db push` puede utilizar la contraseña de base de datos y funcionar con un token sin permisos de Auth.

## Resolver el acceso

1. En [Supabase → Access tokens](https://supabase.com/dashboard/account/tokens), crear un personal access token limitado al proyecto TokVid (`kvbppgofblldwnkkoscb`). La cuenta que lo crea debe tener un rol que permita modificar Auth y la configuración del proyecto; un token no amplía los permisos de su titular.
2. Otorgar **Auth Config: Read-write** y **Project Settings: Read-write**. La consulta GET necesita `auth_config_read`; PATCH necesita `auth_config_write` y `project_admin_write`.
3. En [TokVid → Settings → Secrets and variables → Actions](https://github.com/alexandermezad80-dev/TokVid/settings/secrets/actions), añadir el **repository secret** `SUPABASE_AUTH_ACCESS_TOKEN` con ese token. El job `migrate` no está asociado al environment `production`, por lo que un secret disponible únicamente en ese environment no llega a este job.
4. Volver a ejecutar `Supabase migrations` en `feature/onboarding-profile-interests`. Comprobar que el paso `Configure and verify Seamless Auth` termine con `otpDigits: 8`, `mobileRedirectAllowed: true` y `otpTemplatesVerified: true`.

Auth usa `SUPABASE_AUTH_ACCESS_TOKEN` cuando existe y, en caso contrario, conserva el uso de `SUPABASE_ACCESS_TOKEN`. Los pasos de migraciones continúan usando el segundo token y `SUPABASE_DB_PASSWORD`. También se puede ampliar/reemplazar el token existente, conservando los permisos que necesita `supabase link`; la opción dedicada permite mantener la credencial de migraciones que ya funciona.

Este token es para la Management API: las claves `anon`, `publishable`, `service_role` o `secret` del proyecto no lo sustituyen. No se incorpora al código móvil ni a sus variables públicas. El script no imprime tokens, configuración ni cuerpos de errores; solo permite los tres identificadores de permisos anteriores en el diagnóstico. Un 401/403 conserva el fallo del job. Si GET falla, no se envía PATCH.

La configuración modifica únicamente el redirect móvil, la longitud OTP y las dos plantillas/asuntos de correo revisados. Conserva los redirects anteriores y no modifica Google, SMTP, SMS ni secretos de proveedores. El éxito se informa únicamente tras volver a leer y verificar la configuración aplicada.

Fuentes oficiales consultadas: [Personal Access Tokens](https://supabase.com/docs/guides/platform/personal-access-tokens), [GET Auth config](https://supabase.com/docs/reference/api/v1-get-auth-service-config), [PATCH Auth config](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
