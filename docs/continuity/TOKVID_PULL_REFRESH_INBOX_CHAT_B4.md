# TOKVID — B4: indicador bajo cabecera en Inbox y chat privado (preparación)

**Rama:** `feature/feed-mini-video-avatar`. **Base auditada:** `72096401f40eda9056da2ce1e0e7edfed721ed03`.
**Autorización:** el propietario pide continuar exclusivamente con pull-to-refresh y swipes, protegiendo todo lo bueno. Editor de video/fotos pausado, sin nuevo diseño. Commit **[prepare only]**, sin APK hasta revisar el conjunto.

## Evidencia que motivó el cambio
- Capturas Android del propietario: en Inbox, el indicador nativo rosa aparece sobre el avatar/texto del primer registro, no en un espacio separado bajo la cabecera. En un chat privado, no aparece indicador al jalar.
- `inbox.tsx` tenía `RefreshControl` nativo Android en dos listas; Android lo dibuja sobre el primer contenido en estas condiciones, sin arrastrar necesariamente la lista.
- `chat.tsx` tenía `chat.refresh()`, pero `FlatList` no tenía gesto pull.
- Los swipes horizontales B1/B2 ya existen y se conservan; no se editan sus umbrales ni iconos.

## Aislamiento y parche
- Nuevo `components/PullRefreshUnderHeader.tsx`: únicamente responde a un dedo, arrastre **vertical dominante**, en desplazamiento superior cero. Desplaza el contenido temporalmente para revelar un indicador bajo la cabecera fija; rebote de 220 ms y no bloquea swipes horizontales ni scroll si la lista no está arriba.
- `inbox.tsx`: una sola superficie de refresco en contenido, detrás de la cabecera y las pestañas fijas. Conservar dos `ScrollView` cargados y todos sus botones, filas y acciones. Retirar exclusivamente sus dos `RefreshControl` nativos porque se superponían a las filas. Reiniciar referencia de offset cuando cambia la pestaña.
- `RefreshableInboxEmpty.tsx`: conserva la presentación de estados vacíos/carga/error, ahora sin segundo refresco nativo (lo gestiona el padre).
- `chat.tsx`: gesto vertical acotado a la lista existente; usa `chat.refresh()` y `refreshTools()`. No se altera el envío, multimedia, menú contextual, scroll al último mensaje, teclado ni burbujas. Deshabilita el gesto al usar teclado/grabación/operaciones ocupadas.
- **Excepción deliberada a dos aserciones históricas B2/B3:** las pruebas anteriores exigían exactamente dos `RefreshControl` nativos; ese requisito se reemplaza explícitamente por una única superficie de refresco que no cubre filas. No se cambia ningún hash de protección APK261.
- `Feed`, `VideoCard`, `ProfilePullRefresh`, tab bar, perfiles ajenos, colores, iconos, editor, Auth, Supabase, migraciones y workflows **sin cambios**.

## Verificaciones y límites
- Añadir `scripts/tests/pull-refresh-inbox-chat-b4.test.cjs` y preservar aislamiento previo. CI/TypeScript/prebuild deben pasar **antes de declarar éxito**.
- Solo prueba estática/automática hasta ejecutar APK futura. Se requiere prueba física: revelar indicador bajo cabecera sin tapar filas, rebote, no interferir con swipe horizontal ni scroll vertical de conversaciones.
- Pendientes en el mismo objetivo global: chat grupal, indicador Perfil (archivo hash protegido) y refresco exclusivo del primer video en Feed (archivo hash protegido). No confundir círculo del `VideoCard` con refresco de Feed.
