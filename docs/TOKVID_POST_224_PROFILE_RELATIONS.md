# Ajustes de perfiles y relaciones después de APK 224

## Autorización y estado

El usuario autorizó «aplica implementa esto que te acabo de decir» después de describir los ajustes de perfiles A/B y las listas de relaciones. Se conserva el código de APK224 como base técnica, sin revertir funciones aprobadas.

**APK224 queda desaprobada por el usuario por el branding de inicio.** La captura 1000176113.jpg muestra fondo celeste claro, logo deslavado y carga magenta antes del feed. El usuario prefiere el branding de la APK anterior. Su número exacto y la causa técnica no están confirmados. Esta observación queda registrada como pendiente: este cambio NO corrige ni da por aprobado el arranque y NO revierte la aplicación completa.

## Alcance implementado

- Perfiles A (propio) y B (visitado): biografía contraída sin «Ver más»; tocar texto la expande; únicamente expandida muestra «Ver menos», que vuelve a contraerla. Texto completo conservado.
- Barra exploradora de contenido de ambos perfiles: padding vertical pasa de12 a8dp, reduciendo8dp de altura total; iconos conservan22dp y flex/ancho/distribución horizontal. Se centran verticalmente. Margen inferior del bloque del perfil8dp, como el espacio avatar–Mensajes de referencia; no añadir las líneas dibujadas en las capturas. Biografía expandida puede aumentar la altura para mostrar el texto.
- Solo perfil B: botón de seguimiento junto al nombre, estilo pastilla discreta, alto mínimo26dp, icono14dp, texto12sp, borde fino. «Seguir» pasa a «Amigos» conforme al estado de seguimiento existente. No colocar botón en perfil A. «Amigos» aquí es la etiqueta solicitada para seguir; la lista Amigos sigue significando seguimiento mutuo.
- Listas propias y ajenas: tres pestañas **Amigos / Seguidores / Siguiendo**, cada una con su icono, texto y acciones conservadas, sin contenedores con fondo de botón. Texto/icono oscuro en la seleccionada, gris en las otras sobre blanco.
- El acceso superior de relaciones de B abre Amigos; los contadores siguen abriendo su sección correspondiente.
- Botón a la derecha de cada contacto: texto según la lista activa («Amigos», «Seguidores», «Siguiendo»). Misma llamada `toggleFollow`, bloqueo mientras carga y lógica previa. Accesibilidad describe la acción real Seguir/Dejar de seguir. Sin botón de seguirse a sí mismo.
- Las listas de B son de B, nunca del visitante. Amigos se obtiene aplicando la definición existente de seguimiento mutuo a todas las páginas públicas de seguidores/seguidos del perfil. Se reutiliza RPC autenticada existente; no se modifican base de datos, Auth, RLS ni permisos. No se usa la intersección de solo la primera página.
- La lista propia conserva su recarga existente después de dejar de seguir. La ajena se vuelve a consultar tras cambios de seguimiento; dejar de seguir a un tercero no borra las relaciones de ese tercero con el dueño del perfil B.

## Archivos

- `artifacts/mobile/app/(tabs)/profile.tsx`
- `artifacts/mobile/app/user-profile.tsx`
- `artifacts/mobile/app/(tabs)/friends.tsx`
- `artifacts/mobile/app/profile-connections.tsx`
- `artifacts/mobile/lib/features/profile/connections.ts`
- `scripts/tests/visited-profile-friends.test.cjs`

`FollowContext.tsx`, `useMyConnections.ts`, la definición `connectionIds`, branding y flujos de mensajes se conservan sin cambios.

## Verificación previa a compilación

Pruebas locales nuevas de paginación de amigos, errores sin presentar datos parciales y cancelación al salir aprobadas; regresiones existentes de amigos mutuos/dejar de seguir aprobadas. Ejecución local amplia:124 pruebas aprobadas; un archivo no pudo ejecutarse porque el entorno local no tiene `@supabase/supabase-js`. El adaptador TypeScript local no es un typecheck real; CI ejecutará el TypeScript y todas las pruebas con dependencias reales.

Consulta de solo lectura de la RPC actual para el perfil de referencia:2 seguidores,2 seguidos,2 amigos mutuos; transacción revertida, sin mutaciones persistentes. La documentación actual de RPC se consultó mediante MCP; el índice de changelog no pudo descargarse por proxy local no disponible. No se incorporan APIs/dependencias nuevas.

## Verificación automática y entrega

Código: `835493d04515a6be43d0e2b840a3490a02ba56ed`; árbol `e036fb469c8a9dad406f90adcccf2519ab3a4fd0`; rama `feature/feed-mini-video-avatar`.

[CI de comprobación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328303): **135 pruebas aprobadas, cero fallos**, TypeScript móvil real y prebuild Android aprobados. Esta ejecución completa resuelve la limitación local de dependencia faltante.

[Compilación APK225](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262): **correcta**, `BUILD SUCCESSFUL in 26m 6s`. Terminó el15 de octubre de2026 a las23:51 UTC. Cierre documental16 de octubre.

- [Descargar APK225](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262/artifacts/12015177799): extraer ZIP e instalar `app-release.apk`.
- SHA256 del APK: `b1003255476fae95c4ffb985840e28d0c65dee03438fd0ebe3b0e24b29779cda`.
- [Mapa de fuentes correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/38823328262/artifacts/12014139940). El workflow verificó el commit y el marcador de diagnóstico dentro del bundle.
- [Manifiesto completo](continuity/APK_225_VERIFICATION.json), incluidos tamaños y digests ZIP (distintos del checksum APK).

**Prueba física de diseño pendiente.** APK224 sigue desaprobada por branding; APK225 conserva ese arranque porque se pidió registrarlo como nota. No afirmar que se haya corregido. La entrega de225 no implica aceptación del usuario.

## Próxima revisión

En A y B: tocar biografía, expandir/contraer y comprobar ausencia de «Ver más» contraída; revisar margen8dp y barra ligeramente más baja con iconos del mismo tamaño/ancho. Solo B: pastilla junto al nombre Seguir→Amigos. En ambas listas: tres pestañas con iconos sin fondos y etiqueta correspondiente en cada contacto; dejar de seguir en Amigos propios conserva retirada de esa lista. Visitar B debe mostrar relaciones de B. Conservar el branding como incidencia separada hasta diagnóstico/corrección autorizados.
