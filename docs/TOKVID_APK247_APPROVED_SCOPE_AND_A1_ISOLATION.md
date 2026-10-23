# TOKVID — acuerdo visual y funcional posterior a APK #247

## Fuente y aislamiento

- Rama de trabajo: `feature/feed-mini-video-avatar`; punto de partida auditado: `40116f7945c5398e997bb6b03ef081db976407a1`.
- Requisitos rectores: [TOKVID_MASTER_REQUIREMENTS.md](requirements/TOKVID_MASTER_REQUIREMENTS.md), en especial sección 18 Borradores. No modificar branding ni el Feed aprobado.
- La rama `feature/onboarding-profile-interests` tiene historia divergente; no se fusionará ni se sobreescribirá desde ella.
- Validación: pruebas, TypeScript, comparación de diff, GitHub Actions y verificación posterior en teléfono Android. El CI no equivale a prueba física.
- Un commit `[prepare only]` omite expresamente el build Android, pero el workflow Check chat phase sí comprueba tests, tipos y prebuild. Se usará para evitar APK repetidas.

## Contrato: lo aprobado y que debe sobrevivir

1. Cabecera fija blanca y animación sticky del perfil probada en Android, `stickyHeaderIndices={[1]}`, barra de 39 dp, seis posiciones horizontales e interacciones intactas.
2. Avatar, marco de Historias, navegación a story-viewer al tocarlo; + abre `/story-create`. Saldo, Suscripción, biografía, conexiones y estadísticas intactos.
3. Tres puntos SUPERIORES siguen abriendo `/edit-profile`; hamburguesa superior sigue abriendo `/user-tools`. Son distintos del sexto espacio de exploración.
4. Tab bar inferior conserva sus cinco rutas, dimensiones, cuatro iconos, colores y acciones. El botón Crear aprobado es referencia. Solo se estudiará igualar la posición de Crear entre pantallas, sin mover otros iconos.
5. Feed (UI, avatares, iconos verticales, counters, reproductor, comentarios, botones) intocable. La animación del corazón está aprobada.
6. Perfiles visitados, sus limitaciones de privacidad, entradas a chat y pie de cinco acciones siguen separados del perfil propio.
7. No crear migraciones ni alterar Supabase, Auth, Storage, LIVE ni estilos globales sin auditoría y autorización adicional.

## Bloque A1 — Cambios visuales discretos implementados en esta preparación

- Añadir sombra/línea muy tenue superior e inferior únicamente mientras la barra exploradora propia está fijada. Al volver a la posición inicial desaparecen ambas. No cambiar el cálculo de pinning ni el scroll.
- Conservando las rutas existentes, separar el botón + de la foto: moverlo visualmente fuera de su borde inferior derecho; reemplazar el rosa por degradado azul TOKVID, pequeño, sin bloquear la foto ni Saldo.
- Corregir el ancho de las miniaturas de publicaciones/likes/guardados del perfil propio para caber tres por fila, no dos, conservando acciones y datos.
- Dibujar vectores propios Mosaico (Videos), Momento (Historias), Relevo (Compartidos), sin imágenes pesadas. Activar visualmente Mosaico y Momento en la barra propia, manteniendo color activo oscuro e inactivo gris. **Relevo solo queda creado, no se presenta como Compartidos en el espacio Galería hasta revisar la semántica y el acceso a Galería.**
- En la pantalla Crear historia, mostrar Momento en el estado vacío; al seleccionar archivo conservar la indicación anterior de foto/video. No tocar elegir, publicar ni permisos.
- Estados vacíos: iconos sutiles representativos y texto de publicaciones en dos líneas compactas con + cercano y conservando la pulsación que lleva a Crear. Otros estados vacíos conservan su texto/acción.

## Pendiente — bloques separados, NO implementados en A1

- A2: resolver Galería versus Compartidos sin perder acceso a Galería; añadir Relevo a la barra cuando su contenido/acción corresponda; Borradores con icono file-pen-line y acceso privado. El botón superior de tres puntos nunca se recicla.
- B: deslizar horizontalmente solo el contenido bajo la barra exploradora del perfil (manteniendo scroll vertical, sticky y tap); mismo estado activo para pulsación y gesto. Habilitar deslizar entre Actividad y Mensajes preservando sus toques, refresh y acciones; compactar moderadamente espacio entre notificaciones.
- C: Borradores reales, sección PRIVADA separada de Herramientas/Detalles; grilla de varios proyectos, guardar, retomar edición, eliminar y prevenir publicación accidental, conforme al maestro. No crear pantallas funcionales falsas.
- D: auditoría/corrección de pull-to-refresh propio/visitado sin alterar sticky; analizar por qué se revierte favorito de placeholder, verificar counters de videos reales, dejar animación Like intacta. No atribuir egress de placeholder a Supabase sin medirlo.
- E: alinear solo posición del botón Crear entre pantallas después de medir ambos tab bars. No modificar el botón de referencia ni otros cuatro.

## Pruebas de aceptación de A1

- En estado normal, cero líneas de pinning; al hacer scroll para fijar la barra, dos sombras; al regresar, ambas desaparecen. Sticky y ancho de seis celdas siguen idénticos.
- Tocar foto va a `/story-viewer` y tocar + va a `/story-create`, incluso al quedar fuera del marco; sin desplazamiento indeseado de datos, Saldo o Suscripción.
- Tres tiles por fila en Android físico, con cuatro elementos distribuidos 3+1; los videos siguen abriendo sus rutas existentes.
- Mensaje vacío en dos líneas, con icono, + y pulsación de creación.
- Historias conserva sus botones de galería/publicación; estado vacío con Momento.
- CI en verde y verificación física posterior. Si algo falla: no declarar el bloque cerrado.
