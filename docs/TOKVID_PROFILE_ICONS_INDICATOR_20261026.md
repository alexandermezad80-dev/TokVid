# TOKVID — iconos del Perfil e indicador sincronizado

## Entrega APK311 — 26 octubre 2026

Código `90ca07cc03b682e45239211fd6d23b8ed850f3a8`, misma rama `feature/feed-mini-video-avatar`. [Descargar APK311](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40409170065/artifacts/12692853462): extraer el ZIP e instalar `app-release.apk`. [Compilación](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40409170065); [mapa de fuentes correspondiente](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40409170065/artifacts/12693168168). SHA256 APK: `0998c11c42e02d58cf53609909fd092f8cb88ceef9597c49654ee182683bdbf5`. **359 pruebas CI aprobadas, 0 fallos; TypeScript real, configuración nativa y Android correctos.** `BUILD SUCCESSFUL in 18m 35s`. El swipe, los toques y el refresco aprobados conservan su código. 18 archivos protegidos intactos. Sin merge a main. La nueva rayita/iconos/nombres requieren comprobación física; no confundir la aprobación de APK310 con la de esta corrección.

## Autorización y base — 26 octubre 2026

El usuario confirma que APK310 funciona bien, salvo la rayita del Perfil: al seleccionar manualmente un icono, el contenido cambia pero el indicador se queda debajo de Videos. Video `swipe screen-20261026-145608.mp4`, segundos 13–19. Aclara: «el swipe si trabaja lo de tocar los iconos también pero el indicador queda botado» y autoriza aplicar los iconos pendientes y la rayita. Conservar el swipe y los toques aprobados. Esta confirmación sustituye la aprobación pendiente de esos comportamientos en el registro310; no equivale a una prueba completa de toda la app.

Rama existente `feature/feed-mini-video-avatar`, padre real `7d785ac29cd3cae441b95cd3d3b22d7b04f63728`, árbol `77e4f4e0dfba39e03a8d6d3af7ae62c6769dc4e4`. APK310 sigue siendo la referencia: [descarga](https://github.com/alexandermezad80-dev/TokVid/actions/runs/40366879684/artifacts/12673095843), SHA256 `5f81b66241b3081da622a85213bbb450fca4c957a9071141bcab3734805f8a77`. Las carpetas locales son snapshots parciales, no checkouts; comparar contra el árbol real antes de publicar y usar lease. No crear otra rama, reescribir historia ni mezclar a main.

## Cambio aislado

`SwipePositionUnderline.tsx` creaba un nuevo nodo `Animated.multiply` en cada render. Se conserva mediante `useMemo` con dependencias `position` y `tabWidth`: una selección o carga de datos no sustituye la conexión animada del indicador. La corrección apunta al defecto visto en Android; aún requiere comprobarlo en teléfono. La prueba de estabilidad falla antes y pasa después. No se cambian el controlador, umbrales, duración, snapping, paginador ni callbacks de selección aprobados. Indicador 22 dp de ancho ×2 dp de alto, gris #5B6670 y centrado; Inbox conserva 97×2 dp/turquesa y recibe únicamente la misma estabilidad del componente compartido.

Se integran los seis dibujos de `6iconos-tokvid-completos.zip`, SHA256 `62471012e0a3799b069d99fae4b1ef015caf92fd2282d12caed4928c284c96c1`, en un componente exclusivo `ProfileSectionIcon.tsx`. Videos/Historias/Compartidos/Borradores reutilizan los vectores originales idénticos; Me gusta y Guardados incorporan las geometrías exactas suministradas. El componente compartido anterior no cambia. Se conservan iconos 22 dp, barra 39 dp, seis posiciones W/6, seleccionado #0E1216 e inactivos claros #9AA5AE, según la aclaración del usuario posterior al ZIP. No adoptar el gris más oscuro del ejemplo ni retirar el indicador.

`ProfileTabHint.tsx` añade los nombres sutiles ya solicitados: Inter Regular 11 sp, texto #6B7580 y fondo #F2F4F6; capa temporal medida, con 6 dp de margen lateral, sin ocupar espacio ni capturar toques. Entrada 200 ms, espera 1500 ms y salida 250 ms. Se cancelan temporizadores/animaciones al repetir o abandonar. Perfil llama al mismo `selectTab` y muestra el nombre, sin sustituir navegación o datos. No se copian las barras/estilos del ejemplo del ZIP.

Aplicación: únicamente `app/(tabs)/profile.tsx`, `components/SwipePositionUnderline.tsx` y los dos componentes nuevos. Estilos completos del Perfil, sección de contenido, refresco y archivos del swipe310 idénticos a la base; 18 archivos protegidos intactos. Feed, barra inferior, perfil visitado, avatar/cabeceras, comentarios, fuentes globales, backend/Auth, dependencias y workflows no cambian. El pull propio aprobado de APK308 sigue intacto.

## Validación

Pruebas: geometrías SVG exactas en ambos colores; nombres medidos/transitorios, repetición y desmontaje; misma conexión animada tras swipe y selecciones manuales, cambios de ancho y posición, estilo Inbox; hashes del controlador/paginador/Inbox 310 y 18 archivos protegidos. Se adaptan únicamente contratos de texto que esperaban el callback anterior sin etiqueta; se mantienen escenarios funcionales. **348 pruebas locales aprobadas, 0 fallos**; La suite completa de CI y TypeScript real pasaron; APK311 compilada, véase el cierre superior. Once pruebas de FeedRealtime requieren dependencias completas de CI; no se omiten allí. AdaptadorBabel externo local, no confundir con TypeScript semántico. No hay teléfono/emulador conectado.

Prueba física pendiente: volver a Videos tras varios swipes, tocar Compartidos/Me gusta/Guardados/Borradores/Historias y comprobar la rayita bajo cada icono; alternar swipe/toque, repetir y tocar durante el snap. Confirmar nombres al fijarse la barra y que miniaturas/scroll/refresco conservan su funcionamiento, tanto con gestos como con tres botones Android.

## Conservación y pendientes

No mezclar aquí Feed automático ni extensión del pull a perfiles visitados. APK310 es la base aprobada para swipe/toques con la excepción del indicador; APK308 conserva la aprobación de su refresco. Reversión limitada: restaurar solo la integración visual del Perfil y el indicador; retirar los dos componentes nuevos. No revertir la rama, el controlador ni el paginador aprobados.
