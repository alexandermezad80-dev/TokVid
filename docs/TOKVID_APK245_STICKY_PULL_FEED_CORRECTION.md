# TOKVID — revisión correctiva tras APK #245

**Base:** `5ffb306c80e1acaa6c7cb6308eee7da8a683de8f`, rama `feature/feed-mini-video-avatar`.

## Alcance autorizado
La distribución horizontal de la **captura de APK #241** es la referencia exclusiva de los seis iconos del perfil propio; **no** se recuperan las rayas negras ni la cabecera azul. La APK #245 es la base funcional protegida: Sticky Header, cabecera blanca, perfil y scroll, navegación, funciones, privacidad y Tab Bar inferior. Un contenedor sticky de 39 dp separado de su fila interna asegura distribución horizontal. En perfil ajeno se mantiene únicamente la exploración permitida por privacidad, sin copiar pestañas del propietario.

El gesto Pull to Refresh debe arrastrar el perfil completo, mostrar un indicador azul bajo la cabecera fija, y replegarse al soltar. Las consultas de recarga existentes permanecen iguales. El gesto vertical normal del scroll no se captura si se está fuera del inicio.

La referencia aprobada del Feed es la captura 689×1536 `1000180741.png`. Correcciones **solo visuales** al componente `VideoActions.tsx`: altura relativa del avatar, separación entre avatar y corazón, marcador activo más ancho e idéntico al inactivo con contorno blanco y relleno azul brillante, flecha blanca curvada y sólida, signo (+) redondo. Los callbacks y estados activos siguen intactos. No se toca reproductor `VideoCard`, Supabase, Auth, TabBar, comentarios, contadores, RPC, migraciones ni `main`.

**Pendiente de aclaración funcional, no se cambia:** el tercer icono de perfil está programado como Galería; el usuario lo identificó como Compartidos. Verificar requisito antes de redefinir su acción.

Requiere CI y prueba física posterior; no afirmar validación de Android nativo por tests de JS.
