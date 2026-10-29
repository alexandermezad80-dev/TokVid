# TokVid — Pull to Refresh del perfil visitado

29 octubre 2026. Base APK314: `abefa3d476c85b81cb55348effa9b5aeefd986e7`, rama `feature/feed-mini-video-avatar`, árbol `d84998f535303c6eb68963f5b71b5e2057ad8f83`.

## Confirmación y alcance

El propietario probó APK314: «Ya la probe esta bien perfil pero perfil ajeno no hace el pull refresh, activades y msj si indicadores correctos». Se conserva la aprobación del perfil propio y de los indicadores de Actividad/Mensajes en lo observado; no equivale a una matriz exhaustiva de dispositivos o estados. La corrección siguiente se limita al pull del perfil visitado. No recalibrar la física aprobada del perfil propio ni retomar favoritos/Compartidos por esta petición.

## Diagnóstico y cambio

`user-profile.tsx` seguía envolviendo su ScrollView con el antiguo `ProfilePullRefresh`, que captura el gesto mediante PanResponder en JavaScript. El perfil propio usa `OwnProfileMagneticRefresh`, con arbitraje nativo entre pan y scroll en Android. Esta diferencia está comprobada en el código; el fallo físico del perfil visitado lo reporta el usuario. No se afirma haberlo reproducido en un emulador.

Se añade `VisitedProfileRefresh`, un adaptador exclusivo de la pantalla visitada. En Android reutiliza **sin editar** el motor nativo aprobado; los hijos y propiedades del ScrollView pasan directamente a ese motor, evitando anidar dos scrolls verticales. En iOS/web conserva el antiguo envoltorio y ScrollView. Se mantiene la función `onRefresh` existente, incluidas sus consultas de perfil, publicaciones, visibilidad y actividad, control de duplicados y manejo de errores.

El adaptador se monta con clave `userId`; su offset nativo arranca en cero por visita y comunica los eventos al perfil. Un offset anterior no puede impedir el pull de la siguiente visita. La cabecera fija, los hijos y su orden, `stickyHeaderIndices={[1]}`, alturas, estilos, miniaturas, rutas y barra inferior no se alteran. No se activa un nuevo snap de cabecera en visitas: la altura opcional del motor queda en su valor predeterminado cero.

## Física reutilizada, sin nuevos ajustes

Activación mayor de 12 dp y predominio vertical 1.45; permite empezar en offset hasta 1 dp. Ganancia 0.60 y límite suave dependiente de la altura útil medida. Disparo a 140 dp efectivos tras activarse, posición de espera hasta 72 dp, resorte 420/38/0.8 con bloqueo de sobrepaso. Uno o dos dedos, liberación sin duplicados y retorno al concluir o fallar la recarga. Las propuestas de ganancia 0.45, disparo 200 y rigidez 520 de la auditoría anterior **no se aplican**.

## Archivos y conservación

- `artifacts/mobile/app/user-profile.tsx`: conexión al adaptador; el contenido y la hoja de estilos se conservan.
- Nuevo `artifacts/mobile/components/VisitedProfileRefresh.tsx`: selección de motor por plataforma y puente de offset/eventos.
- Nuevo test `scripts/tests/visited-profile-native-refresh.test.cjs` y fixture de hashes de áreas aprobadas; dos pruebas existentes actualizan únicamente la referencia al contenedor visitado.
- Documentación de continuidad: aprobación del usuario, cierre pendiente de APK314 y esta corrección aislada.

No se editan `OwnProfileMagneticRefresh`, su matemática, `ProfilePullRefresh` antiguo, Inbox, Feed, componentes horizontales, datos, dependencias, workflows ni configuración Android. No se hace merge a main.

## Verificación

42 pruebas dirigidas aprobadas: enlace nativo, callback real, una sola superficie de scroll, propagación de eventos, reinicio por visita, fallback en otras plataformas, geometría/pestañas y fuentes del perfil. Se ejecutan también los casos ya existentes del motor reutilizado: pull corto, largo, cancelado, dos dedos, recarga única, espera, error y retorno. Se fijan hashes de los archivos aprobados para detectar modificaciones accidentales.

TypeScript real, regresión completa en CI y nueva APK pendientes al registrar la implementación. La transpilación local usa el adaptador Babel del entorno y no sustituye TypeScript semántico. Motorola G05/Android15: pendiente confirmar pull en visita vacía/con publicaciones, retorno, segundo dedo, scroll normal, pestañas adhesivas y navegación, tanto con gestos como con tres botones Android.

## Reversión

Restaurar solo la integración visitada de `user-profile.tsx` a APK314 y retirar el adaptador/referencias nuevas si la prueba física encuentra una regresión. Preservar el perfil propio y los indicadores de Inbox aprobados; no volver toda la aplicación a una APK anterior.
