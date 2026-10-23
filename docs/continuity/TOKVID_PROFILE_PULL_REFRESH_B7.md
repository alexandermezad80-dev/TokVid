# TOKVID — B7: pull-to-refresh de Perfil propio mediante componente aislado

**Fecha:** 23 octubre de 2026. **Rama:** `feature/feed-mini-video-avatar`. **Base:** `1f811e5170d9c25fe83c2c6721f9af950975921d`.

Autorización: continuar exclusivamente con pull-to-refresh y swipes, preservando absolutamente iconos, posiciones, tamaños, acciones de pestañas, barras, branding, Feed aprobado, perfiles visitados y editor en pausa. **Sin cambiar otros comportamientos.**

## Hallazgo y cambio mínimo
- `profile.tsx` usa una cabecera `ReferenceHeader` fija **fuera** del componente de pull, un `ScrollView` con `stickyHeaderIndices={[1]}` para barra de seis pestañas de 39 dp y un `scrollOffsetRef`. Su `ProfilePullRefresh.tsx` implementaba otro PanResponder/animación propio, informado como no visible en las pruebas físicas anteriores.
- B4–B6 introdujeron y verificaron en CI el componente unificado `PullRefreshUnderHeader.tsx`: gestos verticales dominantes solo arriba; desplaza el contenido y muestra el indicador en el espacio bajo la cabecera fija, luego lo retrae. Usa por defecto el mismo color azul acero `#4B7194` ya aprobado para el Perfil.
- B7 cambia **una importación** en `app/(tabs)/profile.tsx` para usar el componente unificado con alias local `ProfilePullRefresh`. Mantiene JSX/props existentes, `onRefresh` original (datos del perfil, conexiones y secciones pertinentes), encabezado, seis iconos/acciones, barra sticky, distribución, grilla, biografía y rutas sin cambiar.
- `components/ProfilePullRefresh.tsx` protegido con hash `74b47601c2762a1ee0591f54506d05bd8a326fbd` **permanece intacto**, aunque la pantalla Perfil ya utiliza el componente unificado. La antigua prueba unitaria de ese archivo sigue siendo histórica: **solo la nueva B7** prueba dinámicamente la ruta activa. Sin cambio de hashes APK261.
- `scripts/tests/profile-under-header-refresh-b7.test.cjs` valida integración, desplazamiento vertical, respeto al swipe horizontal, condición al inicio, indicador, retorno, refresh único y TypeScript.
- Ningún cambio a Feed, Inicio, perfiles ajenos, Inbox, chat, editor, Supabase, migraciones, iconos, workflow ni tab bar.

## Estado
CI aún pendiente cuando se prepara el commit. **No confundir test automático con prueba real en Android.** Tras CI, auditar integridad de los cambios B4–B7 y solo entonces generar la APK conjunta de validación indicada por el propietario mediante workflow GitHub, sin tocar código de editor. Si el comportamiento falla físicamente, pedir captura/diagnóstico y corregir solamente el mecanismo.
