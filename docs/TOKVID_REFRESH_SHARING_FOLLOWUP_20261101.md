# Seguimiento autorizado — 1 noviembre 2026

Base: APK315 aprobada, `7d5e5d0a353b223f52b5a388364a08c23f19e71c`, rama
`feature/feed-mini-video-avatar`. Sin rama nueva ni merge a main.

El propietario autoriza mayor resistencia progresiva y retorno firme **en todos
los lugares donde ya existe refresco por gesto**, conservando dos punteros,
recargas, swipe, pestañas adhesivas y presentación aprobada. Inventario: perfil
propio/visitado, Actividad/Mensajes (vacíos y con contenido), chats privados y
grupales, búsqueda y comentarios. Feed conserva la decisión independiente de
refresco automático sin duplicación de solicitudes.

Compartidos debe guardar una referencia por vídeo ajeno compartido aunque se
envíe a varias personas. La miniatura no muestra destinatarios. Compartir dentro
de TokVid genera actividad al destinatario que abre el contenido exacto; también
se solicita para historias propias/ajenas, conservando caducidad y acceso. No
equivale a poder identificar destinatarios o confirmar entregas en otras apps.
Quitar de Compartidos elimina la referencia personal, no el original ni mensajes.

Pendientes autorizados relacionados: favoritos inmediatos con reconciliación y
reversión ante error; miniaturas del perfil con play/vistas arriba a la derecha y
estados abajo; Feed automático sin refrescos duplicados. No modificar estilos,
dimensiones, iconos, funciones o rutas fuera de la necesidad descrita.

Estado al 3 noviembre: implementación preparada para CI. Sin nueva APK ni
prueba física. Backend aplicado y verificado según el cierre inferior. Los snapshots anteriores y sus cierres documentales se conservan.
El snapshot local no es un checkout Git; publicación contra padre/árbol reales
con comprobación del HEAD remoto y lista explícita de archivos.


## Aclaraciones posteriores

- Compartir y Me gusta son independientes. Compartir **desde** la lista Me gusta
  registra el envío; dar/quitar un corazón nunca añade ni elimina referencias.
- 3 noviembre: captura1000186184.jpg. El propietario observa un trazo más grueso
  en corazón y comentarios que en Favoritos, **como sugerencia**. Recomendada
  únicamente igualación de grosor; todavía no implementada ni autorizada como
  nueva edición. Tamaño, altura y separación aprobados; conservarlos.
- No existe campo de vistas/reproducciones en `public.videos`. Se preguntó si se
  inicia un conteo real nuevo o se aplaza ese punto. Sin respuesta, se deja
  pendiente; no se inventan números ni se cambia `PublicationThumbnail`.

## Verificación local del trabajo en curso

18 pruebas de física/gestos pasaron, incluidos dos punteros, fallo de red,
finalización tardía y cabecera. 4 pruebas de favoritos pasaron: propagación entre
pantallas, retorno al estado anterior ante fallo, consultas limitadas al elemento
seleccionado y bloqueo de doble toque. Aún falta TypeScript real/CI/Android y
validación física. El TypeScript local es una adaptación para transpilar, no el
compilador semántico real. El backend fue aplicado y verificado posteriormente; ver el cierre inferior.


## Backend aplicado — 3 noviembre 2026

Migración real `20261103164341_shared_content_references_and_delivery` aplicada
al proyecto TokVid. Archivo conservado con la versión devuelta por el servidor;
no había CLI Supabase instalada, se utilizó el MCP oficial para DDL.
Prueba SQL con rol `authenticated` y rollback completo: envío atómico, reintento
sin duplicado, video/historia exactos, historia propia, rechazo de caducada,
quitar referencia sin eliminar original/mensajes, nuevo envío que restaura una
sola referencia y aislamiento entre usuarios: **aprobada**. No quedan mensajes,
notificaciones ni publicaciones de prueba. Se preservan los avisos al creador.
`videos` se incorpora a Realtime para sus contadores ya públicos; relaciones
privadas de favoritos permanecen privadas. Sin cambios a funciones anteriores.
Los trazos del corazón/comentarios siguen sin modificar.
