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

Compilación, artefacto y verificación automática definitiva: pendientes en este commit. Prueba física de diseño: pendiente. No marcar APK224 aceptada ni afirmar corregido su branding.
