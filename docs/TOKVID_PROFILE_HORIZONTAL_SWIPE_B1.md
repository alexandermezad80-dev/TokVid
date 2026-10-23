# TOKVID — B1: deslizamiento horizontal solo en las seis secciones del perfil propio

Autorización previa: deslizar entre seis secciones sin tocar barra sticky, iconos ni comportamiento aprobado. El usuario confirmó que los workflows dejados por Codex son inmutables: TODOS los commits de preparación llevan `[prepare only]` para que no se genere ninguna nueva APK hasta finalizar todos los bloques.

## Auditoría
- La barra exploradora sigue midiendo 39 dp y usando seis celdas de `width/6`. El encabezado conserva `stickyHeaderIndices={[1]}`; tocar cualquier icono sigue usando `setTab`.
- `ProfilePullRefresh` detecta gestos verticales para actualizar; debe mantenerse separado del gesto horizontal. El Feed y el perfil visitado no comparten el cambio.
- En las grillas ya funcionan toques para abrir videos propios, Compartidos, Favoritos, Me gusta y Borradores. El gesto de deslizar no debe ejecutar esas acciones.

## B1 realizado
- Cálculo puro en `lib/features/profile/ownProfileSwipe.ts`: capturar solo tras movimiento horizontal dominante de 16 dp y cambiar de sección tras 54 dp al soltar; únicamente una sección adyacente por gesto, con límites.
- El responder se instala sobre el contenido bajo la barra sticky del **perfil propio**. No se modifica el encabezado, su ancho, altura, imagen, botones, sombra ni comportamiento vertical.
- Pulsaciones existentes y vertical scroll siguen disponiendo de sus gestos; swipes sin suficiente desplazamiento no cambian la pestaña.
- Añadidas pruebas de los seis cambios, límites, dirección, scroll vertical, protección sticky y acciones por pulsación.

## Fuera del alcance
Ningún cambio en workflows, .github, Feed, branding, Supabase, Auth, migraciones, pantallas visitadas, sección de Mensajes o Editor. No se genera APK en esta preparación. La prueba automática no equivale a una verificación de gesto con dedos en Android físico.
