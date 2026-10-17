# TokVid — vidrio azul acero en comentarios, etapas 2 y 3

Fecha: 17 octubre 2026. **Rama aislada, NO integrada en desarrollo, NO APK emitida, NO aprobada físicamente.**

## Fuente de diseño obligatoria

`Comentarios feed-medidas.zip` → `Comentarios-medidas/LEEME-medidas-y-aclaraciones.md`. Resolución de referencia 720×1604 px → **360×802 dp**. Se conserva el diseño propio de comentarios y la función del video reducido ya preparada a partir de la APK 227. **No se trasladan detalles de otra aplicación.**

| Elemento | ZIP | Presentación preparada |
|---|---|---|
| Miniatura (sin nuevos cambios en esta etapa) | 155 × 275; y=42; separación 8 | Se reutiliza el cálculo de la etapa 1, sin tocar `VideoCard` |
| Hoja teclado cerrado | y=325, h=477; radio superior24 | Anclaje al borde superior de la hoja; cuerpo de comentarios blanco |
| Cabecera | h48; tirador32×4 a y6.5; pill desde x10.5/y12.5, h34; X blanca | Cabecera translúcida azul acero; recuento del servidor y cerrar originales conservados |
| Barra teclado cerrado | y728–802, h74 | Franja azul acero translúcida, editor de38dp y avatar de28; respeta insets |
| Pieza teclado abierto | y325 hasta teclado real y471.5, h146.5 | Geometría ligada a `viewport.keyboardInset`, sin tocar altura ni apariencia del teclado nativo |
| Reacciones rápidas | y50–72, siete emojis de18 | Siete reacciones rápidas pulsables; insertan el mismo carácter Unicode que acepta el teclado Android en el campo original, sin abrir un teclado propio ni enviar el comentario |
| Campo abierto | y76–114, avatar28 y campo306×38 | Editor existente único, contador0/300, cursor celeste y placeholder14; conservado el foco en cambios de IME |
| Herramientas | y118–144: imagen, sticker, @ y micrófono de20 | Cuatro iconos visibles **deshabilitados explícitamente**, sin inventar acciones; sus funciones se definirán por separado |
| Enviar abierto | 44×26, margen derecho10, flecha20 | Conserva el mismo handler de publicar/editar, habilita solo con texto y no ocupado |
| Vidrio | azul acero `#4682B4` alpha38; borde `#C8E1F8` alpha50 | `BlurView` de Expo con intensidad90 + RGBA; **no equivale numéricamente a sigma24**: validar el efecto Android |
| Cuerpo de comentarios | blanco, scroll propio | `FlatList` y diseño de cada fila sin cambios; oculto visualmente solo al desplegar teclado |

## Regresiones que se deben prevenir

- Se mantiene el **mismo `TextInput`**, sin duplicarlo entre estados abierto/cerrado, para no perder el foco.
- **Emojis nativos del teclado Android/Gboard siempre activos:** al cambiar de letras a la pestaña de emojis, el teclado del sistema sigue insertando caracteres en el `TextInput` original, y el panel glass se adapta a su altura real. No se reemplaza ni personaliza Gboard.
- **Siete reacciones rápidas de la pieza de vidrio:** son una fila de UI por encima del teclado, distinta del panel de Gboard. El usuario autorizó expresamente mantenerlas activas: al tocarlas insertan su emoji Unicode en el mismo campo sin publicarlo ni alterar las funciones de comentarios.
- **Solo los cuatro iconos nuevos sin función definida** (imagen, sticker, @, micrófono) permanecen visibles y deshabilitados hasta que el usuario defina su comportamiento.
- No se modifican los handlers existentes `send`, `comments.publish`, `comments.edit`, `comments.remove`, `comments.like`, `comments.toggleThread` o la lectura/refresh de Supabase.
- Al responder o editar, la fila de emojis se sustituye temporalmente por el control **Cancelar respuesta/edición** mientras el teclado esté abierto, para conservar esas acciones sin alterar los 38dp del campo.
- No se toca el reproductor ni el video reducido. El mensaje del dispositivo «No se pudo reproducir el video» se debe auditar aparte antes de atribuirlo a esta modificación.
- Se preserva el modal de opciones (Responder/Editar/Eliminar/Ocultar/Cancelar), avatares y diseño de filas.
- Sin cambios en RLS, tablas, migraciones, autenticación, mensajería privada ni otros módulos.
- No se simula que imagen, sticker o micrófono ya puedan adjuntar/guardar/grabar: solo apariencia deshabilitada hasta recibir especificaciones de permisos, almacenamiento, límites y servicio. El icono `@` permanece deshabilitado. La fila de siete emojis sí admite toque para introducir texto; el selector nativo de emojis del teclado continúa funcionando por separado.

## Archivos previstos

- `artifacts/mobile/components/CommentsSheet.tsx`: presentación de la hoja y del editor.
- `artifacts/mobile/lib/commentsGlassGeometry.ts`: medida dependiente del teclado y safe area.
- `scripts/tests/comment-glass-presentation.test.cjs`: casos del ZIP y seguridad de handlers.
- `.github/workflows/verify-comments-glass.yml`: **solo tests + typecheck, no Gradle/APK** en rama aislada.

## Validación

- Inspección del diff frente a `1ccb9e7907a6bc72cf68c28e1bb6357cd1314237`, último HEAD al iniciar.
- Casos unitarios declarados: cerrado h74; abierto h146.5 con teclado h330.5; cambios de Gboard/emoji; bottom safe; ventanas pequeñas; comprobación de handlers y de que los siete emojis insertan en el campo sin desactivar el IME nativo.
- **Pendiente el resultado de CI completo y TypeScript; no asegurar éxito.**
- **Pendiente probar Android real** el teclado normal y el de emojis, contenido blanco, scroll, respuesta/edición, envío y repetición abierta/cerrada. Requerida aprobación explícita antes de merge.
- No ampliar a etapa4 ni cambios de backend sin validación específica.

## Próximo paso

Revisar CI de `verify-comments-glass.yml`, resolver cualquier error **en esta rama** y no integrarla hasta obtener resultados verdes y aprobación del usuario. Comparar captura del Motorola G05 con tres capturas del ZIP.
