# TokVid — auditoría de APK 313: Pull to Refresh y Compartidos

Fecha: 28 de octubre de 2026. Estado: **solo auditoría y propuesta; implementación pendiente de autorización**.

Referencia: [Actions 313](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40520733561), rama `feature/feed-mini-video-avatar`, commit `97ae3a3436477638a1c624f2eb5ce8b4fe984214`, árbol `08c87eff89758d60b7ba750d84a657e51ca2aa28`. La rama remota sigue en ese commit al terminar la revisión. El job Android consta como completado correctamente.

Se leyeron AGENTS.md, CONTINUAR_AQUI.md, el handoff y los requisitos maestros. La carpeta local es un snapshot parcial sin `.git`: no permite afirmar un `git status` limpio. Los archivos fuente auditados se contrastaron mediante hashes de blob con el árbol real de la APK 313. Existen diferencias locales anteriores ajenas a esta auditoría, incluida documentación de cierre aún no publicada; no se sobrescribieron. Este informe se guarda fuera del código del proyecto. No se modificaron fuentes, configuración, base de datos ni historial Git; no se generó APK ni se hizo push.

La aprobación física del usuario de lo probado en APK 313 queda reconocida. Su petición posterior autoriza esta auditoría de mayor tensión, no una implementación. El indicador manual de Actividad/Mensajes y su refresco siguen pendientes por separado. Las miniaturas siguen como anotación pendiente. No se retoman esos trabajos aquí.

## 1. Conexión real de los dos perfiles

- Perfil propio: `artifacts/mobile/app/(tabs)/profile.tsx:3` importa `OwnProfileMagneticRefresh` bajo el nombre local `ProfilePullRefresh`. Su integración está en las líneas 306–316. Android usa Gesture Handler + Reanimated; el fallback de otras plataformas es distinto y queda fuera de la propuesta.
- Perfil de visita: `artifacts/mobile/app/user-profile.tsx:4` importa el antiguo `components/ProfilePullRefresh.tsx`. Lo envuelve alrededor del ScrollView en las líneas 183–213. No utiliza el motor del perfil propio.
- La búsqueda en las fuentes móviles identifica únicamente esos consumidores de ambos componentes. `ownProfilePull.ts` solo se utiliza actualmente desde el componente propio. No es necesario alterar un refresco global ni el de Inbox/Feed.
- Ambos perfiles conservan `stickyHeaderIndices={[1]}`. El ajuste automático de cabecera del perfil propio está separado en `profileHeaderSnap.ts`; no se propone cambiarlo. El perfil visitado conserva sus pestañas adhesivas y su comportamiento actual; no se propone añadirle nuevas acciones horizontales.

## 2. Valores actuales y recomendación inicial para Android

Las distancias son unidades lógicas de React Native, equivalentes a dp en Android. No son píxeles de una captura. `H` es la altura útil medida del contenedor del perfil, sin inventar una altura para los botones o gestos del sistema.

| Parámetro | Perfil propio APK 313 | Perfil visitado APK 313 | Propuesta para ambos |
|---|---|---|---|
| Distancia para reconocer intención vertical | Más de 12 dp | Más de 9 dp | Mantener/unificar en más de 12 dp |
| Predominio vertical | `dy > abs(dx) × 1.45` | `dy > abs(dx) × 1.35` | 1.45 |
| Posición de scroll permitida | `scrollY <= 1` | `scrollY <= 0` | Tolerancia de 1 dp al inicio |
| Ganancia inicial dedo/contenido | 0.60 | 0.58 | 0.45 |
| Curva de resistencia | Cuártica; casi lineal al principio | Lineal hasta un corte brusco | Exponencial, resistencia creciente desde el comienzo |
| Disparo al soltar | 140 dp después de reconocer/activar el gesto | 95 dp de `gesture.dy` | 200 dp después de la activación, solo al soltar |
| Límite de recorrido | Límite suave igual a H | Corte fijo de 90 dp | Conservar el límite suave H en ambos, sin corte brusco |
| Retorno | Resorte: rigidez 420, amortiguación 38, masa 0.8 | Animación por tiempo de 190 ms; no hay resorte | Resorte: rigidez 520, amortiguación 38, masa 0.8 |
| Sobrepasar el destino | `overshootClamping: true` | No aplica | `true`; regreso firme sin rebotes repetidos |
| Mientras refresca | Mantiene hasta `min(72,H)` dp y retorna al finalizar | Retorna de inmediato mientras la recarga sigue | Conservar 72 dp en propio; misma fase física de espera en visita, sin alterar el callback de datos |
| Dedos | Hasta 2; mantiene continuidad de `translationY` | Sin manejo explícito equivalente de continuidad/cambio de dedo | Conservar y aplicar continuidad con hasta 2 dedos |

**Por qué se siente flojo:** en el propio, la fórmula actual es `x / (1 + (x/H)^4)^(1/4)`, con `x = 0.6 × d`. Si el desplazamiento es pequeño frente a H, el término elevado a cuatro es diminuto y casi todo el arrastre mantiene la misma ganancia 0.6. Cambiar solo la distancia de disparo no arreglaría esa sensación: haría más difícil activar el refresco, pero conservaría la flojedad inicial. En visita no existe tensión progresiva ni retorno por resorte.

**Curva recomendada:** `y = H × (1 − exp(−0.45 × d/H))`, con `d` igual al avance efectivo desde la activación. Su pendiente comienza en 0.45 y disminuye continuamente; mantiene el recorrido amplio sin topar de golpe. Para reanudar un retorno agarrando de nuevo el contenido, su inversa debe cambiar conjuntamente: `d = −H/0.45 × ln(1 − y/H)`, con las validaciones y protección del límite numérico correspondientes. No cambiar solo la función directa: produciría un salto al retomar el gesto.

Ejemplo calculado con H = 600 dp, **no una medición del Motorola**:

| Avance efectivo del dedo | Propio actual | Propuesta |
|---|---:|---:|
| 100 dp | 60.0 dp | 43.4 dp |
| 200 dp | 120.0 dp | 83.6 dp |
| 400 dp | 238.5 dp | 155.5 dp |
| 600 dp | 349.2 dp | 217.4 dp |

La rigidez propuesta aumenta aproximadamente un 24 %. La relación de amortiguación pasa de aproximadamente 1.04 a 0.93 manteniendo el bloqueo de sobrepaso. Se busca recuperar con firmeza, no añadir vibración. Son parámetros de partida para comparar físicamente, no valores ya aprobados en teléfono.

## 3. Alcance mínimo si se autoriza

1. `artifacts/mobile/lib/features/profile/ownProfilePull.ts`: valores, curva e inversa. Compartir únicamente esta matemática entre los dos perfiles; ningún consumidor externo actual se vería afectado.
2. `artifacts/mobile/components/OwnProfileMagneticRefresh.tsx`: conservar su arbitraje de dirección, continuidad de dos dedos, bloqueo de duplicados, ciclo de recarga, clipping y snap. Ajustar solo lo imprescindible para utilizar la física propuesta; no reescribir lo aprobado.
3. `artifacts/mobile/components/ProfilePullRefresh.tsx`: adaptar su motor Android aislado para utilizar la misma física y arbitraje, manteniendo su interfaz, indicador, estilos y contenido. Solo cambiar sus números dejando PanResponder en JavaScript no ofrece la misma garantía de continuidad y coordinación con el scroll nativo que el motor propio.

El objetivo es no requerir cambios en las pantallas consumidoras. Si una integración nativa exigiera tocar el ScrollView de `user-profile.tsx`, se debe identificar esa necesidad antes de ampliar el alcance. No sustituir indiscriminadamente componentes ni introducir nuevos envoltorios que alteren el cálculo de sticky headers. Conservar el tamaño, color y posición de cada indicador y todos los márgenes/alturas en reposo; la modificación solicitada es el desplazamiento transitorio del gesto.

No cambiar `PullRefreshUnderHeader`, componentes horizontales compartidos, Feed, Inbox, cabeceras, tab bar inferior, datos, seguidores, mensajes, rutas, workflows, dependencias ni configuración Android. La nueva fase de espera de visita es una propuesta explícita, no un cambio ya aplicado.

## 4. Verificación necesaria en Motorola G05 / Android 15

El proyecto usa React Native 0.81.5, Gesture Handler 2.28.x y Reanimated 4.1.x; tiene nueva arquitectura y edge-to-edge activados. No se propone cambiar versiones ni flags.

Comprobar en el teléfono, tanto con tres botones como con gestos del sistema: arrastre corto sin recarga, arrastre largo con una única recarga al soltar, aumento progresivo de tensión, retorno firme, añadir/retirar segundo dedo sin salto, interrupción y continuación del retorno, fallo de red sin quedar bloqueado, y perfiles vacíos/con videos. Verificar además scroll vertical normal, toque de miniatura, gesto horizontal y pestañas adhesivas sin desplazamientos inesperados. El perfil propio debe continuar cediendo el gesto horizontal y bloqueando el snap mientras se refresca.

El límite depende de H medido, no de alturas fijas de navegación Android. Los insets y estilos existentes se conservan. En vistas pequeñas se debe comprobar que la posición de espera no obligue a bajar más el contenido al soltar.

En esta auditoría no se tuvo acceso físico al Motorola ni se ejecutó una nueva APK. Se verificaron fuentes, ecuaciones y estado de compilación existente. Una prueba matemática o de callbacks no acredita la sensación real ni el arbitraje nativo de Android.

## 5. Compartidos: hallazgos de código y base actual

Consultas exclusivamente SELECT al proyecto Supabase TokVid. Se inspeccionaron funciones, permisos y agregados; no se insertó, borró ni modificó ningún dato ni se simuló un envío real.

1. **Sí hay registros guardados:** la cuenta cuyo nombre es Alexander tiene 5 eventos de compartir, relativos a una única publicación propia de tipo imagen. Hay 0 videos ajenos elegibles. La tabla contiene esos 5 eventos; no es correcto decir que nunca registra nada.
2. **El filtro explica esa cuadrícula vacía:** `useMySharedVideos.ts:9–10` exige `mediaType === "video"` y `creatorId !== userId`. Excluye fotos y publicaciones propias. Los tests existentes verifican expresamente esa decisión. Añadir música no cambia por sí solo el tipo persistido de una foto. Cambiar ese criterio es una decisión funcional distinta de arreglar la física.
3. **Hay una ruta de compartir incompleta:** `artifacts/mobile/app/publication.tsx:62`, usada al abrir una miniatura, ejecuta `Share.share(...)` pero no llama a `record_video_share`. Por esa ruta, abrir/usar la hoja de compartir no añade el evento al historial de TokVid. Esto es un defecto de conexión confirmado por el código, independiente del filtro anterior.
4. **Las otras rutas sí intentan registrar:** el Feed en `app/(tabs)/index.tsx:156–197` y `VideoShareSheet.tsx:27–30` llaman a la RPC. Se revisaron solo como trazabilidad; no se propone editar el Feed. Envíos a destinatarios, apps externas y menú genérico tienen caminos distintos. Copiar enlace no registra un compartido actualmente.
5. **Demos:** los videos de ejemplo con ID `1`–`6` no son filas reales. La RPC de compartir requiere UUID de una publicación existente; la consulta del perfil también filtra IDs UUID. No pueden aparecer como publicaciones reales compartidas por esta ruta. No se propone cambiar esa regla ni fabricar registros.
6. **No hay acción de retirar un compartido:** no existe botón ni operación de retirada en la cuadrícula/reproductor auditados. La tabla `video_share_events` concede SELECT/INSERT a authenticated, no DELETE; no se encontró RPC para descompartir/ocultar un compartido. No funciona como el toggle de Me gusta.
7. **Historial agrupado:** `profile_activity_ids` agrupa por video y toma la fecha del último envío. Eliminar un solo evento de varios no garantizaría retirar la miniatura. La lectura vuelve a aplicar los permisos actuales de la publicación y, en visitas, las preferencias de visibilidad.
8. **Borrado del original es otra operación:** el vínculo de eventos al video tiene `ON DELETE CASCADE`. Si el creador borra el original, sus referencias dejan de estar disponibles y la grilla se recompone al volver a consultar. Esto no proporciona una acción de quitar solo de Compartidos.

## 6. Propuesta separada para Compartidos, sin implementar

- Conectar el compartir del reproductor `/publication` con el registro existente cuando corresponda y verificar respuesta/errores; no editar el Feed. En Android, abrir una app/hoja de compartir no prueba que el destinatario recibió el contenido: no prometer una confirmación de entrega que el sistema no proporciona.
- Mantener por ahora el criterio vigente «videos ajenos». Si se desean también fotos y publicaciones propias, aprobar ese cambio de producto expresamente, porque los tests actuales lo excluyen de forma deliberada.
- Recomiendo una acción **«Quitar de Compartidos»** que retire la referencia de la cuadrícula y persista por cuenta/video, actualizando la lista inmediatamente y al volver al perfil. No borraría el original ni desharía mensajes o envíos externos ya realizados. Para conservar el historial y los contadores de envíos, conviene separar esa retirada del borrado de eventos históricos, con autorización y comprobación de acceso del propietario. Un envío posterior puede volver a mostrar el video según la regla que se apruebe.
- Esa funcionalidad exige trabajo adicional de interfaz y persistencia con alcance propio; no debe introducirse como parte del ajuste del resorte ni dando permisos DELETE generales a la tabla. Probar que una cuenta no pueda retirar referencias ajenas, que varios eventos no hagan reaparecer indebidamente la miniatura, que la lista y el perfil público respeten la preferencia y que los errores no se presenten como éxito.

**Cierre:** auditoría terminada. No se implementó ninguna propuesta. Pendiente autorización del usuario sobre la física; Compartidos requiere una corrección funcional separada. La petición anterior de Actividad/Mensajes permanece pendiente sin tocarse.
