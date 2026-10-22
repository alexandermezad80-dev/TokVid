# TOKVID — aprobación visual y funcional posterior a APK #243

**Base recuperable:** APK #243, `1e137897bd57607711f8bba58af111ad5a6c0f62`; rama `feature/feed-mini-video-avatar`.

## Bloques aislados

**Perfiles, propio y visitado:** preservar cabecera blanca, avatar, estadísticas, biografía, permisos de privacidad, botones, navegación, cuadrícula y Sticky Header (`stickyHeaderIndices={[1]}`). La barra de exploración conserva 39 dp e iconos de 22 dp. Distribución horizontal de seis columnas iguales para el perfil propio y las columnas permitidas para el perfil ajeno según ancho de pantalla, como APK #241 pero sin restaurar líneas negras. Sombra neutra opacidad 0.05 solo al quedar fija; desaparece en reposo. Pull to Refresh nativo azul acero `#4B7194` solo después de tirar desde el inicio; carga perfil, publicaciones, conexiones y categorías pertinentes sin borrar datos ni crear cuentas.

**Feed:** conservar reproductor/overlay, comentarios, favoritos, navegación, haptics, contadores, ancho de columna, tab bar inferior y branding. Retocar únicamente posición vertical de la columna (`gap` 10→6, offset inferior +36 dp sobre altura real tab bar); corazón activo sólido magenta `#FE0979`; favorito activo redondeado y degradado **exclusivamente azul** `#3F6486`→`#6F9CC4`; Compartir alternativa 2 `corner-up-right`; Favoritos encima de Compartir; + del avatar más pequeño, azul y un poco más bajo; etiquetas superiores Para ti/Siguiendo 17→14. Sin usar iconos de otra app ni alterar el botón Crear inferior.

**Medición:** capturas reales 689×1536 px usadas solo como referencia visual. No se convierten directamente a dp; requiere validación física en Android (gestos/tres botones, pantalla pequeña, perfil vacío y con publicaciones).

**Conservación y Git:** no tocar Auth, RPC, SQL, migraciones, LIVE, servicios, configuración, `main` ni los contratos de acciones. Preparar commits separados de perfil y Feed más un commit de verificaciones, publicar todo junto en un solo push para reducir compilaciones. Verificar pruebas/TypeScript/Android antes de declarar éxito; `physical_device_verified=false`.
