# TokVid — indicador y swipe nativo de Actividad/Mensajes

28 octubre 2026. Implementación autorizada: «Implementar ahora con amor», después de la auditoría de Inbox. Base real APK313, commit `97ae3a3436477638a1c624f2eb5ce8b4fe984214`, árbol `08c87eff89758d60b7ba750d84a657e51ca2aa28`, rama `feature/feed-mini-video-avatar`. No cambiar de rama ni hacer merge a main.

## Problema y resultado

El indicador de Actividad/Mensajes seguía el swipe, pero podía quedarse en la pestaña anterior después de tocar el selector. En reposo ahora depende del índice seleccionado confirmado; mientras se mueve, comparte el progreso fraccional del contenido en el hilo de interfaz. Toques, cambios por ruta, redimensionado y refresco invalidan las notificaciones anteriores para que un evento atrasado no deshaga la selección.

El cuerpo usa un ScrollView horizontal nativo con dos páginas estables, inercia y ajuste al ancho de cada página. La cabecera y el selector permanecen fuera del movimiento. Se conserva la última representación de la página que sale, así como la interacción y accesibilidad limitadas a la seleccionada. No se incorporan consultas ni acciones de datos al gesto.

## Decisión física concreta

- Antes: PanResponder, seguimiento por JavaScript y tiempos finales de 170/240 ms; umbral de 16 dp, relación horizontal 1.6 y decisión por desplazamiento del 22 %.
- Ahora: desplazamiento Android nativo, `pagingEnabled`, intervalo igual al ancho real del cuerpo, `decelerationRate="normal"`, seguimiento Reanimated en interfaz, eventos cada 16 ms y sin rebote en los extremos. Android decide la intención y la trayectoria por velocidad; no se afirma conservar los umbrales numéricos del PanResponder.
- Se elige esta inercia nativa como la de la lista de emojis, pero con ajuste por página. **Sustituye la propuesta provisional de resorte 280/30/1 de la auditoría**, que no se implementó. No hay una animación adicional superpuesta al desplazamiento nativo.
- Al tocar una pestaña se coloca inmediatamente contenido e indicador en el destino. En React Native 0.81.5, `ReactHorizontalScrollViewManager.scrollTo` llama a `abortAnimation()` antes de desplazar; se inspeccionó ese código nativo para comprobar la interrupción de la inercia. Referencia: https://github.com/react/react-native/blob/v0.81.5/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/scroll/ReactHorizontalScrollViewManager.kt#L207
- Marcador intacto: 97×2 dp, turquesa `#25F4EE`. El de Perfil, 22×2 dp gris, es otro componente y no cambia.

## Aislamiento

Código de aplicación: solo `artifacts/mobile/app/(tabs)/inbox.tsx` y el nuevo `artifacts/mobile/components/InboxSwipePager.tsx`. Se conserva íntegra la hoja de estilos y el render de las filas, acciones y refresco de Inbox. No se editan Perfil, Feed, comentarios, navegación, datos, iconos, tipografía, áreas seguras, barra inferior, controladores compartidos, dependencias o workflows.

Pruebas: nuevo `scripts/tests/inbox-native-pager.test.cjs`; actualización de referencias de integración en seis pruebas existentes y una fixture de hash autorizada para Inbox. Los hashes de las demás áreas protegidas continúan vigentes.

## Validación y límites

37 pruebas dirigidas aprobadas. La ejecución local completa da 366 aprobadas y un fallo de carga de `feed-realtime.test.cjs` por faltar `@supabase/supabase-js` en este snapshot. La transpilación local utiliza un adaptador Babel, **no equivale al chequeo semántico TypeScript**. Las dependencias bloqueadas y TypeScript real se comprueban en CI antes de entregar.

Se cubren selección manual, arrastre fraccional, inversión, regreso al origen, interrupción con toque, callbacks atrasados, nueva ruta, nuevo ancho, refresco, desmontaje y layout antes de que JavaScript confirme. Estos tests modelan eventos nativos: no miden FPS ni reproducen un Motorola G05.

Pendiente en Motorola G05/Android15: lento y rápido en ambas direcciones, cambio de dirección sin soltar, toque durante inercia, listas vacías/con filas, scroll vertical y pull, apertura de chats y menús, gestos y tres botones Android. La fluidez física y el arbitraje diagonal no se declaran aprobados antes de esa comprobación.

## Pendientes independientes

- [Pull de ambos perfiles y Compartidos: auditoría, sin implementación](TOKVID_APK313_PULL_Y_COMPARTIDOS_20261028.md).
- [Favoritos y conteo en tiempo real: auditoría, sin implementación](TOKVID_APK313_FAVORITOS_TIEMPO_REAL_20261028.md).
- [Auditoría inicial de Inbox](TOKVID_APK313_INBOX_SWIPE_20261028.md). Su resorte propuesto queda sustituido por la decisión nativa descrita arriba. El pull más firme de Inbox sigue pendiente.
- Miniaturas: anotación previa, sin cambios. Feed automático y perfil visitado no forman parte de esta entrega.

## Reversión

Si la prueba física detecta una regresión, revertir exclusivamente el parche Inbox y sus referencias de pruebas a la base `97ae3a3`, conservando el Perfil aprobado y el resto del árbol. No restaurar una APK antigua completa ni cambiar dependencias o workflows para revertir este ajuste.

## Entrega

Código local implementado; publicación, CI y APK en curso. Completar aquí los enlaces reales, resultados y checksum al terminar. No afirmar una nueva APK entregada hasta existir el artefacto.
