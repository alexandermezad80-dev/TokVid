# TOKVID — aislamiento del estado funcional aprobado (APK 261)

**Referencia aportada por el usuario:** dos capturas reales de APK **261** muestran el perfil completo y el perfil desplazado con la barra de seis secciones fija, incluyendo el estado vacío de Borradores. Esto demuestra el aspecto observado en esas capturas, **no demuestra pruebas físicas de guardado/recuperación, nuevo gesto B1 o Inbox B2**.

## Protocolo acordado
- **No alterar** el Feed aprobado, el branding TOKVID, sus medidas, iconos, navegación o reproducción.
- Perfil: conservar avatar, datos, biografía, Saldo, Suscripción, hamburguesa superior → Herramientas, puntos superiores → Información, barra sticky de **39 dp**, seis celdas de **width/6**, grilla de **tres columnas**, imágenes e iconos aprobados.
- Navegación inferior: cinco rutas, dimensiones, acciones, botón Crear y colores intactos.
- `ProfilePullRefresh`: gesto vertical y protección del sticky intactos.
- Inbox: conservar sus dos botones de pestaña, filas, datos reales, refresco vertical, navegación, opciones de conversación y limpieza con confirmación. B2 puede **añadir solo la navegación horizontal**, sin cambiar esas piezas.
- Perfiles visitados: conservar navegación y pie separado.
- Ninguna modificación de workflows de Codex; cada commit preparatorio incluirá **`[prepare only]`**, con pruebas CI y **sin generar APK** hasta terminar todos los bloques y la auditoría final.
- Base de GitHub verificada al establecer el aislamiento: `680e137c9ea934e2485b96ad5f1d61f230b48ce0` en `feature/feed-mini-video-avatar`. No asumir que ese HEAD es el SHA original de la APK 261: B1 se agregó después.
- La APK de C4 generada antes del acuerdo de un único APK final es histórica, **no constituye la entrega final**.

## Dos mecanismos de aislamiento
1. **Archivos exactos cerrados**: `scripts/tests/tokvid-apk261-isolation.test.cjs` verifica el Git blob SHA-1 de **18 archivos** de Feed, tab bar, elementos visuales del perfil, TOKVID branding y los dos workflows relevantes. Si uno cambia, el CI falla hasta que el cambio sea explícitamente revisado/autorizado. La comprobación es de integridad del archivo, no de validación visual en teléfono.
2. **Contratos de funcionamiento**: para `profile.tsx` e `inbox.tsx` no se congela el archivo entero, porque quedan gestos que añadir. Se fijan rutas, medidas, accesos, pestañas, estados, refresco y acciones preexistentes mediante pruebas. Las nuevas funciones se desarrollan en lógica/áreas acotadas; los tests existentes siguen activos.

**Cualquier excepción:** auditar motivo, explicar las diferencias, pedir autorización sobre el elemento cerrado, actualizar contrato/pruebas solo con dicha autorización y revisar CI. No mover el criterio de aceptación silenciosamente.

## Aún pendiente
- B1 swipe del perfil pasó CI en rama, pero no prueba física de ese nuevo gesto en APK 261.
- B2: swipe entre Actividad y Mensajes, sin mover controles existentes.
- Editor avanzado, otras correcciones pendientes y auditoría conjunta del alcance con el documento maestro.
- **Única APK final**, tras cierre de todos los bloques y aprobación del conjunto, seguida de pruebas físicas.

## Archivos modificados en esta preparación
Únicamente este documento y `scripts/tests/tokvid-apk261-isolation.test.cjs`. Ningún archivo de interfaz, comportamiento, workflow, Feed o base de datos se modifica en este commit.

## Excepción autorizada por el propietario — visita en APK 261 (22 oct 2026)
El propietario aportó dos capturas de perfiles ajenos y autorizó auditar/corregir **solo** la posición del botón Crear del pie independiente y los iconos visibles en la barra de perfil ajeno. Se permite reemplazar el hash únicamente de `ProfileTabBar.tsx` por `97a1a49c5d542a034f8566effb6f7dd965ea9c6a`: el botón Crear, de idénticos 49×30 dp, se desplaza **5 dp hacia arriba** sin alterar el pie de 50 dp, colores ni rutas. `user-profile.tsx` no es archivo de hash cerrado y solamente cambia la presentación de los iconos: Videos y Compartidos usan vectores TOKVID, mientras Me gusta conserva corazón, ancho fijo `width/3` (el icono Publicaciones ya no ocupa todo el ancho al ser el único visible). Los controles `show_likes` y `show_shares` siguen ocultando las pestañas privadas: no se crean controles sin permiso. Las grillas, encabezado, identidad, chat, estadísticas y Feed se conservan. Esto es una modificación pendiente de validación física; no atribuir resultado de APK 261 a código aún no instalado.
