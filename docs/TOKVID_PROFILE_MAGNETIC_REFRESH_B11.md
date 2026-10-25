# B11 — refresco magnético aislado del Perfil propio

Fecha: 25 de octubre de 2026. Rama: `feature/feed-mini-video-avatar`.
Base real: `526d56499051a26a97ed8529aa03ad808376ada3`, árbol `b54240dd78601a248f6c53a646f56c12a385739f`.
Encargo: https://github.com/alexandermezad80-dev/TokVid/issues/11.

## Autorización y estado

La auditoría inicial se entregó antes de implementar. El propietario autorizó «Puedes arreglar todo eso» y «Continúa». Esta autorización permite sustituir exclusivamente el refresco del Perfil propio. No autoriza cambios al swipe horizontal ni a las demás pantallas. No se fusiona con main.

Implementación candidata escrita y comprobada localmente; TypeScript real, CI y APK pendientes al crear este registro. No hay verificación nativa en emulador ni física del propietario. Los parámetros son provisionales, no medidas aprobadas. Esta entrega sustituye para el Perfil propio el disparador RefreshControl B9/B10; Inbox conserva B10 sin cambios. La condición histórica de probar primero B10 no se presenta como cumplida: APK305 fue cancelada, sin artefacto. El propietario autorizó continuar la reconstrucción B11 después de la auditoría.

## Referencias y límites de observación

Se observó en el chat la captura `1000181785.jpg`: cabecera fija y contenido del perfil desplazado cerca del extremo inferior. El usuario aclara «refresh baja más y retorna». La captura orienta el recorrido largo, pero no permite medir tiempos, resistencia ni velocidad.

Se recibió la referencia de nombre `212screen-20261024-072119.mp4`, pero el archivo no existe en la ruta anunciada del entorno y no se pudo reproducir. Tampoco se encontraron `303.mp4` ni `1000181784.mp4` en disco. No se afirma haber visto esos videos; deben compararse cuando estén accesibles. No se copia la interfaz ni el indicador de la aplicación de referencia.

APK303 corresponde a B9, commit `e1ae8c91106fb9c9b66cf1b71ce9b61435f4b87e`, run40066347110: 328 tests/TypeScript/prebuild/Android correctos; no contiene B10/B11. APK305 fue cancelada; APK306 omitió compilación por `[prepare only]`. Ninguna constituye validación física de B11.

## Auditoría y sustitución

Antes del cambio, `profile.tsx` importaba el componente compartido `PullRefreshUnderHeader` con el alias `ProfilePullRefresh`. En Android `nativeRefreshFallback` desactivaba la captura vertical del PanResponder compartido: el disparador efectivo era RefreshControl, y el wrapper solo desplazaba contenido al cambiar refreshing. No eran dos detectores verticales activos simultáneamente. El indicador azul estaba fijo en su contenedor superior y usaba opacidad; no acompañaba al perfil. B10 desplazó el progreso nativo a -1000, sin demostrar el gesto magnético.

Ahora `OwnProfileMagneticRefresh.tsx` recibe los mismos hijos y propiedades del ScrollView. Solo en Android sustituye el wrapper antiguo y RefreshControl por un gesto Pan nativo de activación manual, compuesto simultáneamente con el scroll nativo para arbitrar la dirección. No hay un RefreshControl escondido ni un PanResponder vertical adicional en el Perfil propio. El PanResponder horizontal existente queda idéntico.

El círculo azul original ActivityIndicator small/#4B7194 y el ScrollView comparten una única traslación vertical. Su separación es constante y positiva. Una región recortada situada debajo de la cabecera fija los revela y oculta físicamente; no se simula la oclusión con opacidad. El círculo queda fuera de los hijos del ScrollView, manteniendo stickyHeaderIndices=[1]. No se añaden alturas a cabecera, filtros ni contenido.

La curva continua tiene límite suave según la altura real disponible; elimina el tope abrupto de 156dp. La vuelta usa resorte amortiguado con overshootClamping. Tirón corto/cancelación no recargan; tirón suficiente llama una sola vez al onRefresh existente y sostiene el estado hasta que su promesa finaliza. Error o desmontaje liberan el ciclo. Los gestos horizontales, ascendentes, multitáctiles o lejos del inicio se ceden. En plataformas distintas de Android se mantiene el componente y el scroll anteriores.

## Archivos de aplicación y parámetros provisionales

- `artifacts/mobile/app/(tabs)/profile.tsx`: conexión y eliminación del antiguo wrapper/RefreshControl de esta pantalla.
- `artifacts/mobile/components/OwnProfileMagneticRefresh.tsx`: controlador Android exclusivo y continuidad en otras plataformas.
- `artifacts/mobile/lib/features/profile/ownProfilePull.ts`: curva, dirección y parámetros expuestos.

Conservados del mecanismo previo: umbral95dp y espera72dp. Provisionales: slop12dp, proporción vertical1.45, caja del indicador40dp con separación8dp, resorte stiffness320/damping32/mass0.8. Curva `d/(1+(d/H)^4)^(1/4)`, evaluada de forma estable para extremos, H=altura disponible real. Estos valores requieren calibración física, especialmente recorrido máximo, firmeza y retorno.

## Conservación y pruebas

Los 18 hashes de `tokvid-apk261-isolation.test.cjs` permanecen intactos. `PullRefreshUnderHeader.tsx`, Perfil ajeno, Feed, Inbox, chats, barra inferior, cabeceras, seis iconos, sticky39dp, miniaturas, rutas, Auth, backend, dependencias y workflows no cambian. La función onRefresh y el PanResponder horizontal del Perfil se compararon byte por byte con la base: idénticos.

SHA256 del bloque onRefresh: `916188d5f5df374b5a3f902370ee26bfce42a885d1019719a2446c4b3a0e08f1`.
SHA256 del bloque horizontal: `dd5d0bbdd6d0195cd9cdaca46beeb8fdf232a6d46af1bc766a59875f9f17ccf5`.

325 pruebas locales aprobadas (317 existentes ejecutables +8 nuevas), 0 fallos. Se actualizaron solo las expectativas antiguas sobre la conexión del refresco propio en B7/B8/B9, aislamiento y fixture de navegación. Se conservaron los tests de mecanismos compartidos/Inbox y todos los hashes. La suite local omite los 11 tests de feed-realtime por dependencia ausente; CI debe ejecutarlos con la dependencia real. El entorno local utiliza un adaptador Babel aislado fuera del repositorio para ejecutar mocks y sintaxis: NO equivale a comprobación semántica TypeScript. No publicar ese adaptador.

Las nuevas pruebas cubren crecimiento y resistencia progresiva, distancia extrema, inversa para retomar, dirección, capa compartida/recorte/separación, props sticky, cancelación, no duplicación, carga lenta, error, refresco externo, scroll, desmontaje y continuidad iOS. Los mocks no demuestran arbitraje nativo ni fluidez real. `git diff --no-index --check` entre snapshots no reporta errores de espacios. Los snapshots no son un checkout Git: publicación con padre/árbol remoto reales y actualización condicionada al HEAD esperado, sin force-push.

## Validación pendiente y reversión

No hay adb, SDK, emulador ni /dev/kvm en este entorno; la conexión npm del ejecutor falla. No se instalan SDKs ni se modifican workflows. El workflow existente comprobará tests completos, TypeScript, configuración Android y APK. Es necesario probar en teléfono Android: tirón corto/largo, soltar/cancelar, repetir durante carga, error de red, scroll normal, toques, seis pestañas y swipe, filtros sticky, navegación por gestos y tres botones. Confirmar indicador viajando con el perfil, oclusión y regreso; calibrar contra el video accesible.

Reversión aislada: restaurar solo la conexión de `profile.tsx` a la base indicada, retirar los dos archivos nuevos y revertir únicamente las expectativas de prueba B11. No revertir la rama entera ni los componentes compartidos. Preservar cambios posteriores ajenos. La prueba física y ci_verified se registran por separado en `docs/continuity/B11_VERIFICATION.json`.
