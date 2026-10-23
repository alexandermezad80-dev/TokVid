# TOKVID — B2: gesto horizontal entre Actividad y Mensajes

## Regla de conservación (APK 261)
El usuario autoriza continuar el siguiente bloque; **Registro/Login no está pendiente ni se toca**. El Feed, perfil propio y visitado, colores, marcas, tab bar inferior, menú de chat y workflows originales de Codex quedan cerrados y protegidos. Cada commit es `[prepare only]`; no se genera APK hasta cerrar el conjunto.

## Auditoría previa
La pantalla `app/(tabs)/inbox.tsx` ya ofrece dos pestañas tocables, notificaciones reales y conversaciones privadas/grupales, contadores, lista con desplazamiento vertical y `RefreshControl`, menú de acciones y diálogos de confirmación. Su apariencia está aprobada: no cambiar medidas, fuentes, botones, indicador ni separación de filas para añadir un gesto.

## Implementación aislada
- `lib/features/messages/inboxSwipe.ts`: detector puro de desplazamiento horizontal dominante (captura 16 dp, cambio al soltar 54 dp). Izquierda abre **Mensajes**; derecha abre **Actividad**. Sin cambios si el gesto es corto o vertical.
- Un `PanResponder` únicamente alrededor de la zona de contenido, **debajo** de la barra de dos botones y **fuera** de los menús flotantes. `View flex:1` preserva el espacio original de lista/vacíos/loading.
- Actualiza el **mismo estado** `tab` de los botones; no reordena filas ni toca estado remoto. Un dedo y movimiento horizontal dominante para evitar capturar el refresh vertical o tocar notificaciones.
- Se conserva lectura/entrada de parámetros de navegación `params.tab`, ambos `RefreshControl`, abrir chats y actividad, borrado individual/masivo y contadores originales.
- Aislamiento automatizado APK 261 sigue en pie; no se modifica su prueba ni los hashes protegidos.

## Validación y límites
Pruebas puras del gesto, límites de dos pestañas, alcance del responder, acciones existentes y TypeScript. CI Android config completo; no APK. Interacción con dedo, pull-to-refresh y chat se comprueban **después**, en la única APK final conjunta. No describir pruebas unitarias como prueba física. La compactación entre notificaciones permanece sin autorización específica para modificar el diseño.
