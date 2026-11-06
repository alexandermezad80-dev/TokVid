# Pull: mayor tensión tras la prueba de APK317 — 6 noviembre2026

## Solicitud y alcance

El propietario informa «El pull refresh sigue igual no veo cambios» y confirma
«En todas las pantallas con pull». Continúa la autorización de mayor resistencia
progresiva y retorno firme en todos los refrescos por gesto Android. La sensación
de APK317 no está aprobada. Su compilación correcta no equivale a aprobación física.

Base remota: `00f30c9ee86d516eb3f0b3857b8b3ec8b66c41f4`, rama
`feature/feed-mini-video-avatar`; código APK317 `cc287937ff56b327e00bf1b17f4e0f60e84a21d2`.
Snapshot local parcial sin `.git`; publicación contra padre y árbol reales.

## Diagnóstico

Perfil propio y visitado importan la física de `ownProfilePull.ts`. Inbox,
chats privado/grupal, búsqueda y comentarios la utilizan mediante
`ResistantRefresh.tsx`. La configuración de317 sí está conectada en código;
no se dispone de una traza del gesto del dispositivo para demostrar su ejecución.
La curva de317 todavía permite84.5dp de desplazamiento de contenido con200dp de
arrastre en una zona de700dp. El usuario confirma que sigue sintiéndose floja.

## Cambio aislado

Único archivo de aplicación modificado: `artifacts/mobile/lib/features/profile/ownProfilePull.ts`.

| Parámetro | APK317 | Ajuste nuevo |
|---|---:|---:|
| Ganancia inicial dedo/contenido | 0.45 | 0.28 |
| Arrastre efectivo para activar | 200dp | 360dp |
| Resorte: rigidez | 520 | 620 |
| Resorte: amortiguación | 38 | 42 |
| Masa | 0.8 | 0.8 |

La curva pasa de exponencial a raíz inversa con tensión que aumenta antes.
Ambas conservan el alto real de la zona como límite suave; no hay tope brusco.
La función inversa se actualiza conjuntamente para retomar un retorno sin saltos.
Con700dp disponibles: arrastre200→contenido50.1dp; arrastre360→83.2dp;
arrastre600→124.6dp (antes84.5,144.6 y224.0dp respectivamente).

Se mantienen activación12dp, arbitraje vertical1.45, uno/dos dedos, continuidad
al añadir/quitar un dedo, indicador40dp/gap8dp, espera72dp del perfil y las
esperas existentes de cada pantalla. Se mantiene overshootClamping; el retorno
no añade oscilaciones. No se cambian contenedores, estilos, cabeceras, pestañas,
iconos, posiciones, scroll, swipe, navegación ni callbacks de datos.
Feed sigue automático sin pull. No hay cambios de Supabase, workflows ni dependencias.
Fuera de Android permanece el comportamiento previo.

## Conservación de Compartidos y pendientes anteriores

El propietario acaba de confirmar «Mantener solo videos ajenos»; no se amplía
Compartidos a videos propios. Su diagnóstico está en
`docs/continuity/TOKVID_SHARED_OWN_FILTER_AUDIT_20261106.md`.
Las sugerencias de trazos de iconos y vistas de miniaturas siguen pendientes.
No hay merge a main.

## Verificación

35 pruebas dirigidas aprobadas: tensión comparada con317, activación más larga,
continuidad/inversa, uno/dos dedos, cancelación, error de red, finalización tardía,
cabecera adhesiva y paginador Inbox. La respuesta del contenido es al menos35%
menor para el mismo arrastre en las alturas probadas360/500/700/1000dp.
Comparación de archivos: solo cambia el archivo de física dentro de la aplicación.
La suite completa local conserva la limitación de instalación de Supabase;
el resultado de CI real/TypeScript/Android se registra al entregar.
Se incorporan también las dos pruebas locales de contador/Feed del cierre317
que quedaron pendientes de integrar, sin nuevos cambios de aplicación para ellas.

Prueba física pendiente: especialmente Motorola G05/Android15. Confirmar tensión
perceptible y accesibilidad del recorrido360dp en las pantallas con gesto, además
de convivencia con swipe y navegación de Android. No afirmar aprobación física
por pasar pruebas automáticas.
