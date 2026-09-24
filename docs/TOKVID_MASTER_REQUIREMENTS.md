# TOKVID

Documento maestro de requisitos y visión del proyecto

**Estado:** Especificación de trabajo  
**Propósito:** Servir como referencia para la auditoría, planificación y evolución de TokVid.  
**Regla principal:** Primero auditar. No modificar código, base de datos, migraciones ni configuración sin autorización explícita.

## 1. IDENTIDAD Y PERFIL

Cada usuario tendrá un perfil con:

- Nombre.
- Nombre de usuario.
- Foto/avatar.
- Videos publicados.
- Seguidores.
- Seguidos.
- Amigos, cuando exista seguimiento mutuo.
- Videos favoritos/guardados.
- Videos a los que dio Me gusta.
- Nichos o categorías de contenido.
- Actividad e interacciones correspondientes.

## 2. FEED DE VIDEOS

El feed debe proporcionar una experiencia de video vertical con:

- Scroll infinito.
- Reproducción automática del contenido visible.
- Precarga inteligente del siguiente video.
- Ventana limitada de precarga para no consumir excesivamente datos, memoria o batería.
- Adaptación a diferentes velocidades de conexión.
- Me gusta.
- Comentarios.
- Compartir.
- Guardar/favoritos.
- Acceso al perfil del creador.
- Seguir al creador.
- Hashtags.
- Menciones.

La interfaz debe tener identidad propia y no copiar literalmente la distribución de otras plataformas.

## 3. STORIES

Funciones previstas:

- Publicar Stories.
- Ver Stories.
- Me gusta.
- Notificaciones de interacción.
- Acceso a la Story desde la notificación.
- Controles de privacidad correspondientes.

## 4. SEGUIDORES, SEGUIDOS Y AMIGOS

TokVid debe permitir:

- Seguir usuarios.
- Dejar de seguir.
- Consultar seguidores.
- Consultar seguidos.
- Identificar relaciones de amistad cuando el seguimiento sea mutuo.
- Notificar nuevos seguidores.
- Acceder al perfil correspondiente.

## 5. MENSAJES PRIVADOS

Sistema de mensajería privada entre usuarios.

Funciones:

- Conversaciones.
- Envío y recepción de mensajes.
- Notificaciones.
- Eliminar un mensaje individual.
- Seleccionar varios mensajes y eliminarlos.
- Eliminar todos los mensajes de una conversación de una vez.
- Eliminar/vaciar una conversación.

Definir claramente la diferencia entre:

- Eliminar para mí.
- Eliminar para todos, si TokVid decide habilitarlo.

Las operaciones deben respetar privacidad, permisos y RLS.

## 6. LLAMADAS Y VIDEOLLAMADAS

Integradas directamente dentro de los mensajes privados.

Opciones:

- 📞 Llamada de voz.
- 📹 Videollamada.

El usuario podrá decidir si utiliza solamente voz o voz + video.

Durante la llamada:

- Activar/desactivar micrófono.
- Activar/desactivar cámara.
- Finalizar.
- Aceptar/rechazar llamadas.
- Notificaciones de llamadas entrantes.
- Notificaciones de llamadas perdidas.

Los permisos de cámara y micrófono se solicitan cuando se utiliza la función.

## 7. BURBUJAS DE MENSAJES

Los usuarios podrán elegir estilos de burbujas para sus conversaciones.

Funciones:

- Diferentes diseños.
- Vista previa.
- Selección.
- Cambio posterior.
- Diferenciación entre mensajes enviados y recibidos.
- Legibilidad y accesibilidad.

Familia visual cerrada: **8 variantes** de un mismo componente:

1. Classic.
2. Minimal.
3. Rounded.
4. Glass.
5. Gradient.
6. Neon.
7. Elegant.
8. Compact.

Reglas técnicas cerradas:

- Un único componente reutilizable `Bubble`, parametrizado por variante, dirección (enviado/recibido) y posición dentro del grupo (single/first/middle/last).
- La posición del grupo es un dato derivado en cliente; no se almacena en la base de datos.
- La preferencia de estilo se conserva en almacenamiento local del usuario.
- Los estilos no crean nuevos tipos de mensajes ni modifican el modelo de `messages`.
- La implementación usa los tokens visuales definidos en el catálogo Bubbles y los SVG entregados como referencia vectorial.
- La selección se realiza desde el selector de Bubbles dentro de Messages.
- No requiere migraciones ni cambios de esquema en Supabase.

**Estado de implementación:** 🟢 integrado en el chat de la rama de trabajo.

## 8. LIVE

Sistema Live independiente del feed.

### Anfitrión

Debe poder:

- Gestionar invitados.
- Autorizar participantes.
- Controlar permisos de cámara.
- Controlar permisos de micrófono.
- Abrir/cerrar acceso.
- Revocar permisos.
- Gestionar la sala.

El anfitrión controla la autorización, pero **no puede encender ni activar remotamente la cámara o el micrófono de ningún participante, incluido el propio anfitrión desde la perspectiva de otros usuarios**.

El invitado conserva el control físico de su propio dispositivo y decide si acepta o rechaza el uso de cámara y/o micrófono. **El Guest tampoco puede encender ni activar remotamente la cámara o el micrófono de ningún otro participante.** Cada usuario controla exclusivamente sus propios dispositivos. **Ningún participante puede activar remotamente la cámara o el micrófono de otra persona.**

Cuando el anfitrión autorice o invite a un invitado a abrir la cámara, TokVid podrá mostrar al invitado una notificación, por ejemplo: **“El anfitrión te invita a abrir la cámara”**.

El invitado puede aceptar o rechazar la invitación.

Si el invitado rechaza abrir la cámara, **no se activa su cámara** y su participación puede mostrarse mediante el audio autorizado y la imagen/avatar de su perfil, según los permisos concedidos.

### Invitados

Los invitados son los usuarios que participan en una **ventanilla** dentro del mismo Live.

Podrán participar cuando estén autorizados y decidir individualmente si utilizan:

- Cámara.
- Micrófono.

El anfitrión no puede activar estos dispositivos por ellos.

### Interacciones del Live

El Live debe contemplar una interacción de **Me gusta mediante Tap-Tap en pantalla**, independiente de los Me gusta del Feed.

- Tap-Tap sobre la pantalla.
- Animación visual inmediata de los taps/me gusta.
- Contador acumulado de Me gusta del Live.
- Actualización del contador en tiempo real.
- La interacción pertenece exclusivamente al Live activo.

Los Tap-Tap y su contador deben diseñarse de forma escalable, sin convertir cada tap en una escritura persistente individual innecesaria.

### Chat del Live

El Live tendrá comentarios/chat en tiempo real separado de:

- Comentarios de videos.
- Mensajes privados.


### Arquitectura de participación y ventanillas

El mismo usuario puede desempeñar distintos roles según el Live:

- Espectador.
- Guest.
- Anfitrión cuando crea su propio Live.

Un Live con invitados tendrá:

- 1 anfitrión.
- Hasta 11 Guests.
- Máximo de 12 participantes audiovisuales simultáneos contando al anfitrión.

Las ventanillas son dinámicas. Un Guest puede salir voluntariamente, solicitar que lo bajen o ser retirado conforme a las herramientas de moderación. Cuando exista una ventanilla disponible, el anfitrión puede gestionar la entrada de otro participante.

El Live podrá ofrecer distintos modelos de distribución visual de ventanillas, por ejemplo:

- Anfitrión principal + Guests en cuadrícula.
- Distribución equilibrada.
- Anfitrión principal + carrusel de Guests.
- Guest destacado temporalmente.
- Vista compacta.
- Distribución dinámica.

La presentación debe adaptarse al tamaño y proporción del dispositivo móvil sin saturar ni ocultar innecesariamente la transmisión.

### Modalidades de Live

El anfitrión podrá iniciar:

- **Live con Guests:** permite la gestión de hasta 11 ventanillas de Guests.
- **Live solo:** solamente participa el anfitrión y no se muestran invitaciones ni controles de entrada de Guests.

### Solicitudes e invitaciones

Dentro del Live:

- Un espectador puede solicitar participar.
- El anfitrión puede invitar a un usuario.
- Un Guest puede proponer/invitar a otro usuario.
- La aceptación final de una solicitud o invitación corresponde al anfitrión o a un moderador autorizado por el anfitrión.
- El usuario invitado puede aceptar o rechazar desde la propia interfaz del Live.
- Aceptar una invitación no activa remotamente cámara ni micrófono.
- La disponibilidad de las 11 ventanillas debe respetarse antes de incorporar un nuevo Guest.

Los controles de micrófono, cámara, solicitud e invitación deben estar diseñados para interacción rápida y clara en la pantalla móvil.

### Cámara, micrófono y efectos

Cada usuario controla físicamente sus propios dispositivos.

La moderación puede **silenciar/cortar el audio** de un participante, pero no encender remotamente su micrófono. Para volver a transmitir audio, el propio usuario debe activar su micrófono si conserva el permiso.

La cámara permanece bajo control del propio usuario.

Cada usuario podrá disponer de herramientas visuales y audiovisuales para su propia participación, incluyendo cuando corresponda:

- Filtros.
- Efectos visuales.
- Fondos virtuales.
- Pantalla verde/chroma key.
- Cambios de voz.
- Efectos de sonido.

El anfitrión podrá utilizar herramientas de ambientación/apoyo dirigidas a sus Guests, tales como:

- Aplausos.
- Risas.
- Celebraciones.
- Efectos de sonido.
- Cambios de voz.
- Efectos visuales de apoyo.

Estas herramientas no otorgan control remoto sobre la cámara o el micrófono del Guest.

### Moderación y roles

El anfitrión podrá designar moderadores para ayudar a gestionar el Live.

Las capacidades de moderación podrán incluir, según los permisos concedidos:

- Gestionar participantes.
- Aceptar solicitudes o invitaciones.
- Retirar Guests.
- Gestionar el chat.
- Eliminar comentarios.
- Bloquear usuarios del Live.
- Silenciar/cortar el micrófono de un participante.
- Gestionar otras herramientas de moderación.

El anfitrión mantiene la autoridad principal de la sala y puede conceder o retirar permisos de moderación.

### Live Chat

El Live Chat permite comentar en tiempo real a:

- Anfitrión.
- Guest.
- Espectador.

El chat es independiente de los comentarios del Feed y de los mensajes privados.

El anfitrión podrá fijar un comentario para destacarlo en el Live. El comentario fijado se actualizará en tiempo real para los participantes y espectadores.

Al tocar el avatar o comentario de un usuario podrá abrirse una mini ficha sin abandonar el Live, con información como:

- Avatar.
- Nombre.
- @usuario.
- Seguidores.
- Seguir/Siguiendo.
- Ver perfil.

La misma identidad de perfil debe reutilizarse para anfitrión, Guests y participantes del chat.

### Tap-Tap y Quiéreme

**Tap-Tap** es una interacción de apoyo exclusiva del Live y distinta de los Me gusta del Feed, del Follow y de Quiéreme.

Cada usuario, sea espectador, Guest o anfitrión, puede realizar Tap-Tap.

Cada usuario tendrá un **medidor individual de Tap-Tap**:

- Se llena progresivamente mientras realiza taps.
- Se vacía gradualmente cuando deja de hacer taps.
- Debe tener una presentación visual elegante, fluida, adaptable y no obstructiva.
- El usuario podrá elegir su reacción/figura de Tap-Tap desde un catálogo.
- La reacción puede mostrar temporalmente el nombre o @usuario y luego desaparecer.

El Live tendrá además:

- Contador global de Tap-Tap.
- Actualización en tiempo real.
- Animaciones inmediatas.
- Señales agregadas de actividad/apoyo.

Los Tap-Tap deben diseñarse de forma escalable, evitando una escritura persistente individual por cada tap. La fórmula exacta mediante la cual estas señales puedan influir en descubrimiento o distribución del Live deberá definirse posteriormente y no debe asumirse como una garantía de exposición.

**Contador de espectadores**

El Live deberá mostrar un contador de espectadores en tiempo real, independiente de Tap-Tap y de Gifts.

- Representa las personas que están viendo el Live en ese momento.
- Se gestionará mediante presencia/Realtime.
- Al entrar un espectador, el contador se actualiza.
- Al salir o desconectarse, el contador se actualiza.
- No representa usuarios históricos ni se conserva como contador del Live una vez finalizado.
- No debe confundirse con Guests: un Guest participa audiovisualmente; un espectador observa el Live.
- El contador debe permanecer separado de cualquier métrica de Tap-Tap o de apoyo económico.

**MVP del Live (Most Valuable Player)**

El Live tendrá un reconocimiento dinámico para el usuario que acumule mayor apoyo mediante Gifts durante ese Live.

- El MVP puede ser un espectador o un Guest.
- Existe un único MVP actual por Live.
- El MVP se determina por el apoyo acumulado mediante Gifts durante la sesión.
- Cuando otro usuario supera al MVP actual, el reconocimiento pasa al nuevo MVP.
- Al convertirse alguien en MVP, puede mostrarse una animación destacada durante unos segundos, con avatar, identidad e insignia MVP, como una celebración especial del Live.
- Después de la animación, queda una insignia MVP pequeña junto o debajo del avatar del usuario mientras conserve el primer lugar.
- Si cambia el MVP, la animación vuelve a mostrarse para el nuevo MVP y la insignia se traslada.
- El MVP es independiente del contador de espectadores y de Tap-Tap.
- El reconocimiento MVP pertenece exclusivamente al Live activo y desaparece al finalizar la sesión.
- La interfaz deberá mantener la celebración visible sin saturar permanentemente la pantalla.

**Quiéreme** es una interacción distinta de Tap-Tap y está integrada en el área de Seguir del anfitrión.

- Activar Quiéreme puede hacer que el usuario siga al anfitrión si todavía no lo sigue.
- No debe crear seguimientos duplicados.
- El anfitrión tendrá contador de Quiéremes.
- El anfitrión podrá conocer quién dio Quiéreme.
- El anfitrión podrá consultar actividad de apoyo correspondiente.

El anfitrión podrá disponer de un resumen de interacción con:

- Quiéremes totales.
- Usuarios que dieron Quiéreme.
- Tap-Tap totales.
- Usuarios con mayor actividad de Tap-Tap.

### Perfiles, seguimiento y regalos dentro del Live

Desde una ventanilla, avatar o comentario del Live podrá accederse a la mini ficha del usuario y a la acción de Seguir.

Esto aplica a:

- Anfitrión.
- Guests.
- Espectadores/participantes del chat.

Cada anfitrión y Guest podrá tener una **galería de regalos obtenidos**.

- La galería será visible para los espectadores.
- El espectador podrá consultarla libremente.
- El espectador no podrá administrarla ni modificarla.
- Los regalos podrán organizarse por niveles y precios.
- Los regalos podrán incluir categorías y elementos especiales.
- La presentación debe ser visualmente premium y propia de TOKVID.

### Compartir un Live

Los usuarios podrán compartir un Live con otros usuarios.

Cuando un usuario de TOKVID comparta un Live directamente con otro usuario, este podrá recibirlo en su **bandeja de Mensajes** como una tarjeta/enlace de Live que permita abrir la transmisión.

Compartir un Live no convierte automáticamente al receptor en Guest.

La recepción mediante Mensajes es un mecanismo de entrega; la lógica y participación del Live permanecen separadas del dominio de Mensajes privados.

### Separación de dominios

LIVE es un módulo independiente.

- Las llamadas de voz y videollamadas pertenecen a **Mensajes privados**.
- Bubbles pertenece a **Mensajes privados**.
- Live Chat pertenece exclusivamente al Live.
- Tap-Tap, Quiéreme, regalos, ventanillas, Guests, moderación y efectos específicos del Live pertenecen al dominio Live.

Puede reutilizarse infraestructura técnica común cuando corresponda, pero no debe mezclarse la lógica de negocio entre dominios.

## 9. REQUISITOS PARA LIVE

Propuesta actual:

- Edad: 18 años o más.
- Mínimo: 1,000 seguidores.
- Cuenta con al menos 30 días de antigüedad.
- Cuenta en buen estado.
- Cumplimiento de las políticas de Live y comunidad.

Estos requisitos quedan sujetos a revisión final.

## 10. ENLACE EN EL PERFIL

Propuesta actual:

- Desbloqueo después de 60 días de antigüedad.
- Cuenta en buen estado.
- Verificación correspondiente.
- Controles de seguridad para enlaces.

No se exige necesariamente un número mínimo de seguidores.

## 11. CREACIÓN Y PRODUCCIÓN DE VIDEO

La sección Crear debe evolucionar hacia herramientas de producción completas.

Funciones previstas:

- Grabar video.
- Importar video.
- Recortar.
- Unir clips.
- Editar.
- Texto.
- Música/sonido.
- Efectos.
- Filtros.
- Ajustes visuales.
- Vista previa.
- Publicación.
- Guardar borradores.

## 12. FILTROS Y EFECTOS

Herramientas previstas:

- Filtros de imagen.
- Filtros de video.
- Ajustes visuales.
- Efectos especiales.
- Efectos de audio.
- Vista previa antes de publicar.

## 13. VOZ Y SONIDO

Funciones previstas:

- Cambio de voz.
- Efectos de voz.
- Ajustes de audio.
- Aplausos.
- Risas.
- Reacciones sonoras.
- Otros efectos especiales.
- Previsualización antes de publicar.

Los efectos de imitación de voces reales deberán tener reglas específicas de seguridad y consentimiento.

## 14. SUBTÍTULOS

Herramientas de subtítulos:

- Generación automática desde audio/voz.
- Edición manual.
- Sincronización.
- Diferentes estilos.
- Tamaño configurable.
- Posición configurable.
- Vista previa.
- Diferentes idiomas.
- Activación/desactivación durante la reproducción.

## 15. IA PARA CREADORES

TokVid podrá incorporar IA como herramienta de creación.

Posibles funciones:

- Ideas.
- Guiones.
- Texto para publicaciones.
- Recursos visuales.
- Edición asistida.
- Transformación de contenido.
- Generación de elementos audiovisuales cuando corresponda.

La IA debe ayudar al creador manteniendo el control del usuario sobre lo que publica.

Debe existir una política específica para IA y propiedad intelectual.

## 16. HASHTAGS

Funciones:

- Crear hashtags.
- Reconocer formato #hashtag.
- Abrir el contenido asociado al seleccionar un hashtag.
- Página/feed del hashtag.
- Descubrimiento de contenido.
- Asociación de hashtags con videos y contenido compatible.

## 17. MENCIONES

Funciones:

- Mencionar mediante @usuario.
- Sugerencias al escribir.
- Abrir perfil desde la mención.
- Notificar al usuario mencionado.
- Controles de privacidad sobre quién puede mencionar.

## 18. BORRADORES

Crear debe permitir:

- Guardar borradores.
- Continuar posteriormente.
- Mantener los elementos necesarios de edición.
- Tener múltiples borradores.
- Eliminar borradores.
- Impedir publicación accidental.

Un borrador no se considera contenido publicado hasta que el usuario confirme.

## 19. FORMATOS Y PROCESAMIENTO DE VIDEO

TokVid debe definir:

- Formatos aceptados.
- Duración máxima.
- Resoluciones.
- Tamaños máximos.
- Códecs compatibles.
- Validación de archivos.
- Conversión/transcodificación cuando sea necesaria.
- Optimización para dispositivos móviles.
- Versiones apropiadas para diferentes conexiones.

El objetivo es equilibrar:

**calidad + velocidad + almacenamiento + consumo de datos.**

## 20. NOTIFICACIONES

Área propia de notificaciones.

Debe contemplar:

- ❤️ Me gusta en videos.
- ❤️ Me gusta en Stories.
- 💬 Comentarios.
- 👤 Nuevos seguidores.
- 📨 Mensajes.
- 📞 Llamadas.
- 📹 Videollamadas.
- 🔴 Actividad relevante de Live.
- Menciones.
- Otras interacciones relevantes.

Las notificaciones deben llevar al destino correspondiente cuando sea posible.

## 21. SEGURIDAD DE MENSAJERÍA

TokVid debe contemplar protección frente a mensajes potencialmente peligrosos.

Cuando corresponda:

- Ocultar/proteger el mensaje.
- Permitir decidir si abrirlo.
- Reportar.
- Bloquear al usuario.
- Mostrar explicación.

No se debe asumir automáticamente una situación personal únicamente por una detección automática.

## 22. “¿NECESITAS AYUDA?”

Cuando corresponda, mostrar un recurso de ayuda que pueda incluir:

- Información de apoyo.
- Opciones de reporte.
- Bloqueo.
- Recursos profesionales.
- Recursos de emergencia cuando exista riesgo inmediato.

## 23. AYUDA PSICOLÓGICA

El sistema podrá proporcionar un enlace a una entidad profesional y verificable de ayuda psicológica.

Debe incluir:

- Nombre de la entidad.
- Enlace oficial.
- Tipo de ayuda disponible.
- Información actualizada.

Los recursos deben verificarse antes de publicarse.

## 24. CONDUCTA REPETIDA Y ADVERTENCIAS

Propuesta:

Si se detectan tres mensajes relacionados con una misma conducta/intención de riesgo, puede aparecer una advertencia.

Una posible medida posterior sería una suspensión temporal de 24 horas, conforme a las políticas de TokVid.

Antes de automatizarla deberán definirse:

- Categorías.
- Criterios.
- Umbrales.
- Revisión.
- Protección contra falsos positivos.
- Apelación.

## 25. PROTECCIÓN DE MENORES

Como Live será 18+:

- La edad debe formar parte del sistema de seguridad.
- La detección de voz infantil solamente será una señal de posible riesgo, no una prueba definitiva.
- Una posible detección puede activar medidas de protección o verificación.
- No se debe bloquear automáticamente a alguien únicamente por la apariencia de su voz.
- Debe existir mecanismo de revisión/apelación.
- Protección especial de privacidad y datos de menores.

## 26. POLÍTICAS DE TOKVID

Se preparará un conjunto de políticas independientes:

- Términos y condiciones.
- Política de privacidad.
- Reglas de la comunidad.
- Política de contenido y moderación.
- Política de mensajes privados.
- Política de Live.
- Derechos de autor y propiedad intelectual.
- Política de IA.
- Seguridad y protección de usuarios.
- Política de enlaces externos.
- Cuentas, sanciones y apelaciones.
- Menores y requisitos de edad.
- Datos, eliminación de cuenta y contenido.
- Política para creadores y monetización.

Estas políticas deberán revisarse legalmente antes de convertirse en documentos jurídicos definitivos.

## 27. DERECHOS DE AUTOR ©️

TokVid debe contemplar:

- El usuario debe tener los derechos o permisos necesarios sobre el contenido que publique.
- Sistema para reportar infracciones.
- Revisión de reclamaciones.
- Retirada o restricción cuando corresponda.
- Mecanismo de disputa/apelación.
- Reglas para música, imágenes, videos y material de terceros.
- Reglas para contenido generado mediante IA.

TokVid no debe asumir automáticamente derechos sobre material de terceros.

## 28. MONETIZACIÓN — FUNCIÓN VITAL

La monetización debe formar parte de la arquitectura desde el principio.

### Para creadores

Posibles vías:

- Regalos/apoyos en Live.
- Suscripciones.
- Participación en ingresos.
- Herramientas promocionales.
- Panel de ingresos.
- Historial de pagos.
- Retiros.

### Para TokVid

Posibles vías:

- Comisiones de determinadas transacciones.
- Publicidad.
- Herramientas premium.
- Servicios para creadores.
- Funciones empresariales.

### Sistema financiero

Debe contemplar:

- Saldo.
- Ganancias.
- Historial.
- Umbral de retiro.
- Métodos de pago según país.
- Verificación de identidad cuando sea necesaria.
- Prevención de fraude.
- Reembolsos/disputas.
- Registros financieros.

Las fórmulas de reparto de ingresos deben poder evolucionar sin reconstruir toda la plataforma.

## 29. HERRAMIENTAS PARA GRANDES CREADORES

Usuarios con una audiencia importante podrán acceder progresivamente a:

- Estadísticas.
- Retención.
- Visualizaciones.
- Crecimiento.
- Horarios de actividad.
- Moderación avanzada.
- Moderadores para Live.
- Protección de cuenta.
- Alertas de seguridad.
- Herramientas de comunidad.
- Encuestas.
- Preguntas.
- Soporte especializado.
- Herramientas de monetización cuando sean elegibles.

El acceso puede organizarse mediante niveles progresivos.

## 30. PANEL ADMINISTRATIVO

TokVid debe contemplar un panel administrativo para el propietario/equipo autorizado.

Debe permitir supervisar, según los permisos correspondientes:

- Usuarios.
- Crecimiento.
- Videos.
- Stories.
- Live.
- Interacciones.
- Reportes.
- Moderación.
- Seguridad.
- Ingresos.
- Comisiones.
- Pagos a creadores.
- Métricas de plataforma.

El acceso administrativo debe estar fuertemente protegido.

## 31. ARQUITECTURA DE EVOLUCIÓN SEGURA

TokVid debe poder crecer sin romper funcionalidades existentes.

Principios:

**Producción estable → desarrollo aislado → pruebas → revisión → integración → nueva versión.**

No se deben realizar cambios directamente sobre la versión estable sin control.

## 32. RAMAS Y TRABAJO DE DESARROLLADORES

Cada función importante podrá desarrollarse en una rama independiente.

Ejemplos:

- feature/chat
- feature/video-editor
- feature/live
- feature/notifications
- feature/monetization

El desarrollador trabaja en su área y posteriormente presenta un Pull Request.

Flujo:

**Rama → CI → pruebas → revisión → aprobación → merge**

No se debe entregar automáticamente acceso total a producción.

## 33. PROPIEDAD DE CÓDIGO

Se podrán definir responsables por áreas:

- Auth.
- Perfil.
- Feed.
- Crear.
- Mensajes.
- Live.
- Notificaciones.
- IA.
- Monetización.
- Seguridad.
- Supabase.

Las áreas sensibles pueden requerir revisiones obligatorias antes de integrar cambios.

## 34. VERSIONES ESTABLES Y RECUPERACIÓN

Cada versión funcional debe identificarse.

Ejemplo:

- v1.0.0 = estable
- v1.1.0 = nueva función

Si una nueva versión presenta un problema:

**Nueva versión ❌ ↓ Última versión estable ✅**

La recuperación debe poder realizarse de forma controlada.

No se debe perder la versión funcional mientras se investiga el problema.

## 35. SUPABASE Y BASE DE DATOS

Los cambios de base de datos deben estar versionados y controlados.

Las migraciones deben permitir identificar:

- Qué cambio se realizó.
- Cuándo.
- Qué versión lo introdujo.
- Qué dependencias tiene.

Se debe tener especial cuidado con cambios destructivos.

## 36. AUDITORÍA ANTES DE CAMBIAR

Para cada función se debe revisar:

**Interfaz ↓ Lógica ↓ Base de datos ↓ Relaciones ↓ RLS/permisos ↓ Notificaciones ↓ Navegación ↓ Rendimiento ↓ Experiencia real**

No basta con que exista una pantalla, botón, tabla o migración.

## 37. REGLA DE PROTECCIÓN DEL PROYECTO

Durante la auditoría:

**NO modificar código. NO modificar Supabase. NO modificar migraciones. NO modificar políticas. NO modificar configuración.**

Primero:

- Auditar.
- Documentar.
- Identificar lo existente.
- Identificar lo incompleto.
- Identificar lo que falta.
- Identificar dependencias.
- Planificar.
- Solicitar autorización.
- Implementar.
- Probar.
- Integrar.

## 38. PRINCIPIO GENERAL DE TOKVID

TokVid debe construirse para que:

- Una función nueva no destruya una función existente.
- La plataforma pueda crecer progresivamente.
- Se pueda recuperar una versión estable cuando sea necesario.
- Diferentes desarrolladores puedan trabajar en partes específicas sin interferir innecesariamente con otras áreas.

## ESTADO ACTUAL DEL DOCUMENTO

Este documento representa la visión y lista de requisitos recopilados hasta este momento.

No significa que todas las funciones estén actualmente implementadas.

La siguiente etapa será comparar cada requisito con el TokVid real para determinar:

- ✅ Ya existe.
- 🟡 Existe parcialmente.
- 🔴 No existe.
- ⚠️ Existe pero necesita revisión.
- 🔗 Depende de otra función.

**No se debe implementar nada solamente por aparecer en este documento. Primero se audita el estado real del proyecto.**


---

# 39. ESTADO ACTUAL CONSOLIDADO — CONCILIACIÓN CON AUDITORÍA 30

**Fuente de conciliación:** `docs/TOKVID_AUDIT_30_RESULTS.md`  
**Fecha de referencia de la auditoría:** 20 de septiembre de 2026  
**Rama auditada:** `feature/onboarding-profile-interests`  
**Base protegida:** `main`

Esta sección integra en el Documento Maestro el estado técnico conocido de los 30 resultados de auditoría. **No reemplaza la arquitectura ni modifica los requisitos 1–38.** Los requisitos anteriores continúan siendo la referencia de producto y arquitectura; esta sección añade el estado real conocido para evitar mantener la información operativa en dos documentos.

## 39.1 Matriz consolidada de estado

| # | Área | Estado actual | Nota de conciliación |
|---|---|---|---|
| 1 | Identidad y perfil | 🟡 | Existe base funcional; quedan puntos de seguridad/hardening de perfiles. |
| 2 | Feed | 🟡 | Funcional con datos reales; permanece fallback mock que debe resolverse antes de producción. |
| 3 | Stories | 🔴 | No implementado. |
| 4 | Seguidores/seguidos/amigos | 🟡 | Follow/unfollow y RLS existen; quedan hardening e integridad estructural. |
| 5 | Mensajes privados | 🟡 | Base funcional existe; eliminación completa y flujo de notificaciones siguen pendientes. |
| 6 | Llamadas/videollamadas | 🔗 | La arquitectura las mantiene dentro de Mensajes privados; la implementación existente se trata como trabajo separado y no se redefine aquí. |
| 7 | Burbujas de mensajes | 🔴 | No implementado como personalización completa. |
| 8 | LIVE | 🔴 | Arquitectura y requisitos definidos en este documento; no existe aún módulo funcional Live en el código revisado. |
| 9 | Requisitos Live | 🔗 | Dependiente del sistema de Live; propuesta actual 18+, 1,000 seguidores, 30 días y cuenta en buen estado, sujeta a revisión final. |
| 10 | Enlace en perfil | 🔴 | No implementado. |
| 11 | Creación/producción de video | 🟡 | Publicación base existe; edición avanzada y drafts pendientes. |
| 12 | Filtros/efectos | 🔴 | Pendiente. |
| 13 | Voz/sonido | 🔴 | Pendiente. |
| 14 | Subtítulos | 🔴 | Pendiente. |
| 15 | IA para creadores | 🔴 | Pendiente. |
| 16 | Hashtags | 🟡 | Base de datos y relaciones existen; sincronización de `usage_count` pendiente. |
| 17 | Menciones | 🟡 | Extracción/persistencia base existe; falta cerrar notificación → push → navegación. |
| 18 | Borradores | 🔴 | Pendiente. |
| 19 | Formatos/procesamiento | 🔴 | Pendiente definición/implementación avanzada. |
| 20 | Notificaciones | 🟡 | Base existe; UPDATE del receptor y flujo completo requieren hardening/cierre. |
| 21 | Seguridad de mensajería | 🔴 | Pendiente. |
| 22 | Ayuda | 🔴 | Pendiente. |
| 23 | Ayuda psicológica | 🔴 | Pendiente. |
| 24 | Conducta repetida/advertencias | 🔴 | Pendiente de definición segura y política. |
| 25 | Protección de menores | 🔴 | Pendiente; Live previsto 18+. |
| 26 | Políticas TOKVID | 🔴 | Pendiente. |
| 27 | Copyright | 🔴 | Pendiente. |
| 28 | Monetización | 🔴 | Pendiente, pero preservada como parte de la arquitectura futura. |
| 29 | Herramientas grandes creadores | 🔴 | Pendiente. |
| 30 | Panel administrativo | 🔴 | Pendiente. |
| 31 | Arquitectura segura | 🟢 | Principios de aislamiento, ramas, revisión e integración definidos. |
| 32 | Ramas/workflow | 🟢 | Flujo de trabajo por ramas y PR establecido. |
| 33 | Propiedad de código | 🟡 | Áreas/responsables definidos conceptualmente; falta formalización completa. |
| 34 | Versiones/recuperación | 🟡 | Principio definido; falta completar mecanismo operativo. |
| 35 | Supabase/DB versionada | 🟢 | Migraciones versionadas; cambios DB deben seguir control y auditoría. |
| 36 | Auditoría antes de cambiar | 🟢 | Regla vigente y obligatoria. |
| 37 | Regla de protección | 🟢 | No modificar sin autorización explícita. |
| 38 | Principio general | 🟢 | Arquitectura modular y evolución segura preservadas. |

## 39.2 Hallazgos técnicos y de seguridad consolidados

Estos hallazgos son **estado/documentación**, no autorización para corregirlos automáticamente:

1. **Profiles:** el diagnóstico de auditoría identificó exposición pública de campos privados y permisos de actualización demasiado amplios. Cualquier corrección debe revisarse contra el esquema real vigente antes de ejecutarse.
2. **Storage:** avatars y videos requieren hardening de tamaño/MIME antes de producción.
3. **Videos:** existe una ruta de incremento seguro de compartidos, pero el flujo de la interfaz aún tiene una actualización directa de `shares_count` que debe unificarse.
4. **Saved videos:** falta verificar/cerrar la integridad referencial de `video_id`.
5. **Hashtags:** falta mecanismo de sincronización de `usage_count`.
6. **Notifications:** los permisos de UPDATE requieren restricción al campo autoritativo correspondiente.
7. **Security Advisor:** quedaron advertencias relacionadas con funciones security-definer de contadores; deben revisarse como hardening separado.
8. **Performance Advisor:** existen advertencias de `auth_rls_initplan` y 11 índices marcados como unused; no se deben eliminar índices basándose solamente en una base casi vacía.
9. **Leaked Password Protection:** la auditoría registró que la función requiere un plan compatible; no se deben cambiar otras configuraciones de contraseña como sustituto.
10. **Mock data:** el feed y el perfil público aún contienen elementos de fallback/mock que deben resolverse antes de declarar producción.

## 39.3 Dependencias consolidadas

- **CI:** lockfile → instalación → typecheck/build → pruebas → PR.
- **Onboarding:** Auth → callback → profiles → avatars → interests → `onboarding_completed` → app.
- **Publicación:** Storage de video → `video_url` → feed → likes/comments/shares → contadores → hashtags/mentions.
- **Social:** Auth → profiles → follows → contadores → perfil público → notifications.
- **Mensajería:** conversations → messages → RLS → notification → push → chat.
- **Producción:** seguridad de Auth → Storage/RLS → CI → pruebas → observabilidad → hardening → producción.

## 39.4 Arquitectura que NO debe perderse durante la implementación

La conciliación confirma y refuerza la arquitectura definida en este Documento Maestro:

```text
TOKVID
├── LIVE 🔴
│   ├── Live Rooms
│   ├── Host
│   ├── Guests
│   ├── Ventanillas
│   ├── Live Chat
│   ├── Tap-Tap
│   ├── Quiéreme
│   ├── Gifts
│   ├── Moderation
│   └── Effects
│
└── PRIVATE MESSAGES 💬
    ├── Chats
    ├── Voice Calls
    ├── Video Calls
    └── Bubbles
```

**Reglas de separación:**

- LIVE es un dominio independiente del Feed y de Mensajes privados.
- Calls y Video Calls permanecen dentro de Mensajes privados.
- Bubbles permanece dentro de Mensajes privados.
- Live Chat, Tap-Tap, Quiéreme, Gifts, Guests, ventanillas, moderación y efectos específicos pertenecen a LIVE.
- Compartir un Live puede utilizar Mensajes como mecanismo de entrega, pero no convierte Live en parte del dominio de Mensajes.
- La infraestructura técnica puede reutilizarse cuando corresponda; la lógica de negocio debe permanecer modular.
- Cada bloque debe poder desarrollarse, auditarse, probarse y revisarse de forma independiente para permitir trabajo futuro de distintos desarrolladores sin mezclar dominios.

## 39.5 Estado de protección y control de cambios

La auditoría y esta consolidación **no autorizan** por sí mismas cambios funcionales.

Reglas vigentes:

- `main` permanece protegida.
- No hacer merge sin autorización explícita.
- No modificar Supabase, migraciones, políticas o configuración solo porque exista un hallazgo pendiente.
- No implementar todos los 🔴 simultáneamente.
- Antes de cada función: interfaz → lógica → DB → relaciones → RLS/permisos → notificaciones → navegación → rendimiento → experiencia real.
- Toda nueva función importante debe aislarse en su rama correspondiente.
- Las correcciones deben ser quirúrgicas y verificables.

## 39.6 Historial documental

`TOKVID_AUDIT_30_RESULTS.md` queda como **registro histórico de la auditoría de 30 resultados**. El presente Documento Maestro pasa a concentrar:

**requisitos + arquitectura + estado conciliado + hallazgos + dependencias + reglas de protección.**

El archivo histórico no se elimina ni se altera como consecuencia de esta consolidación.

## 39.7 Nota sobre onboarding

El onboarding fue objeto de una reparación autorizada posteriormente a la fecha de la auditoría de 20 de septiembre de 2026. Por tanto, cualquier lectura del estado de onboarding debe considerar el código vigente de la rama `feature/onboarding-profile-interests`, no únicamente el snapshot histórico de la auditoría.

## 39.8 Regla de precedencia documental

Cuando exista una diferencia entre el **requisito/arquitectura** y el **estado actual**, no se debe borrar ni reinterpretar el requisito para hacerlo coincidir con la implementación.

- El Documento Maestro define **qué debe ser TOKVID**.
- La sección 39 documenta **qué estado se conoce actualmente**.
- El código y Supabase vigentes son la fuente de verificación técnica del estado real.
- La implementación nunca se considera completa solamente porque esté descrita en este documento.



---

# 40. CONTRATO TÉCNICO DE LIVE — PREIMPLEMENTACIÓN

**Estado:** Diseño técnico aprobado para implementación posterior.  
**Propósito:** convertir los requisitos de LIVE de las secciones 8 y 9 en límites técnicos claros antes de crear código, tablas o migraciones.  
**Regla:** este contrato no constituye una autorización para implementar. Cualquier implementación deberá hacerse posteriormente, por bloques, en una rama propia y con revisión.

## 40.1 Límite del dominio

LIVE es un dominio funcional independiente.

LIVE es responsable de:

- Salas Live.
- Estado de la sala.
- Host.
- Guests.
- Ventanillas.
- Solicitudes e invitaciones.
- Moderadores y permisos de moderación.
- Live Chat.
- Comentario fijado.
- Tap-Tap.
- Quiéreme.
- Gifts.
- Efectos específicos del Live.
- Estado audiovisual de los participantes.
- Compartir/referenciar un Live.

LIVE no es responsable de:

- Conversaciones privadas.
- Mensajes privados.
- Bubbles.
- Llamadas de voz.
- Videollamadas.
- Comentarios del Feed.
- Likes del Feed.

Messages puede transportar una tarjeta/enlace para compartir un Live, pero LIVE conserva la autoridad sobre la sala y su participación.

## 40.2 Módulos internos

La implementación deberá conservar módulos separables:

```text
LIVE
├── rooms
├── participants
├── invitations
├── moderation
├── chat
├── tap-tap
├── quiéreme
├── gifts
├── effects
├── layout/ventanillas
└── share
```

Cada módulo deberá tener responsabilidades propias y evitar dependencias circulares.

## 40.3 Entidades conceptuales

El diseño de datos deberá representar, como mínimo, estos conceptos:

- **Live Room:** sala creada por un usuario.
- **Live Participant:** relación de un usuario con una sala y su rol/estado.
- **Live Invitation:** invitación a participar.
- **Live Join Request:** solicitud de un espectador para participar.
- **Live Moderator:** autorización de moderación dentro de una sala.
- **Live Chat Message:** mensaje perteneciente exclusivamente a una sala Live.
- **Live Pinned Message:** referencia al mensaje fijado actualmente.
- **Live Reaction/Tap aggregate:** señales agregadas de Tap-Tap, sin una escritura persistente por cada tap.
- **Live Quiéreme:** apoyo de un usuario hacia el Host.
- **Live Gift:** registro de regalo enviado/recibido cuando el sistema de monetización esté habilitado.
- **Live Share:** referencia a una sala compartida mediante Messages.
- **Live Participant State:** estado de presencia/participación y permisos audiovisuales necesarios para la sala.

Los nombres físicos de tablas, columnas y RPC deberán definirse durante el diseño de base de datos y no deben inventarse desde la interfaz.

## 40.4 Roles y autoridad

Los roles funcionales son:

- **Spectator:** observa e interactúa con las funciones permitidas del Live.
- **Guest:** participa en una ventanilla después de autorización.
- **Host:** propietario y autoridad principal de su Live.
- **Moderator:** usuario autorizado por el Host para capacidades concretas de moderación.

Reglas:

1. Un Live tiene un único Host.
2. Un Live con Guests admite como máximo 11 Guests.
3. El máximo audiovisual simultáneo es 12: 1 Host + 11 Guests.
4. El Host conserva la autoridad final sobre su sala.
5. Un Moderator solo puede ejecutar acciones expresamente concedidas.
6. Un Guest no adquiere autoridad de Host.
7. Ningún rol puede activar remotamente la cámara o el micrófono físico de otro usuario.

## 40.5 Máquina de estados de la sala

El estado de una sala deberá permitir distinguir, como mínimo:

- Live activa.
- Live finalizada.

Las transiciones deberán estar controladas por el servidor y por permisos del Host.

No se debe confiar únicamente en el estado enviado por el cliente para determinar si una sala puede recibir participantes o interacciones.

## 40.6 Máquina de estados de participación

La relación de un usuario con una sala deberá distinguir estados como:

- espectador;
- solicitud pendiente;
- invitación pendiente;
- Guest activo;
- salida voluntaria;
- retirado;
- rechazado;
- finalizado.

Las transiciones deberán validar:

- existencia de la sala;
- estado de la sala;
- identidad del actor;
- rol del actor;
- disponibilidad de ventanilla;
- permisos correspondientes.

## 40.7 Cámara y micrófono

Principio obligatorio:

**el usuario controla exclusivamente sus propios dispositivos.**

El servidor podrá autorizar, revocar o silenciar capacidades dentro de la sala, pero no puede encender físicamente cámara o micrófono de otra persona.

Flujo de invitación audiovisual:

1. Host/moderador autorizado invita o autoriza.
2. Guest recibe la indicación.
3. Guest acepta o rechaza.
4. El propio Guest activa cámara y/o micrófono si lo desea.
5. El estado resultante se refleja en la sala.

Si moderación corta el audio:

- el audio deja de transmitirse;
- el sistema no vuelve a activar el micrófono remotamente;
- el usuario debe volver a activarlo si conserva autorización.

## 40.8 Ventanillas

La disponibilidad de ventanillas deberá ser una condición validada por servidor.

Regla base:

```text
1 Host + máximo 11 Guests = máximo 12 participantes audiovisuales
```

La interfaz podrá presentar distintos layouts, pero el layout visual no debe alterar la autoridad ni el límite real de participantes.

La implementación deberá separar:

- estado de participante;
- asignación de ventanilla;
- presentación visual.

Esto permitirá cambiar el diseño de la interfaz sin reconstruir la lógica de participación.

## 40.9 Solicitudes e invitaciones

Acciones permitidas:

- Spectator → solicitar entrada.
- Host → invitar usuario.
- Guest → proponer/invitar usuario.
- Host/Moderator autorizado → aceptar o rechazar según permisos.
- Invitado → aceptar o rechazar.
- Guest → salir.
- Host/Moderator autorizado → retirar Guest.

Toda acción deberá comprobar servidor-side:

- actor autenticado;
- pertenencia/rol;
- sala activa;
- capacidad disponible;
- objetivo válido;
- permiso específico.

## 40.10 Live Chat

El Live Chat es un dominio de datos separado de:

- comentarios del Feed;
- Messages privados.

Debe soportar:

- escritura en tiempo real;
- lectura según participación/acceso al Live;
- moderación;
- eliminación de mensajes cuando corresponda;
- bloqueo dentro del Live;
- comentario fijado por Host o Moderator autorizado.

El perfil mostrado desde avatar/comentario reutilizará la identidad de perfil existente, sin duplicar el sistema de perfiles.

## 40.11 Tap-Tap

Tap-Tap será tratado como evento de alta frecuencia.

Regla técnica:

**no persistir una fila ni ejecutar una escritura de base de datos por cada tap individual.**

La arquitectura deberá separar:

- evento/contador efímero de alta frecuencia;
- agregación;
- persistencia de métricas agregadas cuando corresponda.

Debe existir:

- contador global en tiempo real;
- señal individual de actividad;
- medidor individual visual;
- catálogo de reacción/figura;
- posibilidad de mostrar temporalmente identidad del usuario;
- resumen para el Host.

La fórmula de descubrimiento o distribución del Live no forma parte de este contrato y deberá definirse posteriormente.

## 40.12 Quiéreme

Quiéreme es una interacción independiente de Tap-Tap.

Debe mantener:

- relación usuario → Host;
- ausencia de duplicados;
- contador total;
- consulta de usuarios que dieron Quiéreme.

Si el usuario no sigue al Host, activar Quiéreme podrá crear el Follow correspondiente conforme a las reglas del sistema social.

La operación deberá ser idempotente.

## 40.13 Gifts

Los regalos pertenecen a LIVE, pero los movimientos monetarios deben integrarse posteriormente con el dominio de monetización.

El contrato de LIVE debe permitir:

- catálogo;
- niveles/categorías;
- envío;
- recepción;
- historial necesario;
- visualización de galería obtenida.

No se deben fijar todavía precios, porcentajes de reparto ni métodos de pago dentro del módulo Live.

Esos valores pertenecen al diseño financiero/monetización.

## 40.14 Moderación y seguridad

Las acciones de moderación deberán estar protegidas por permisos explícitos.

Como mínimo se deberán distinguir:

- gestionar participantes;
- aceptar solicitudes/invitaciones;
- retirar Guests;
- moderar chat;
- eliminar comentarios;
- bloquear usuarios;
- silenciar/cortar audio;
- gestionar otras capacidades autorizadas.

Las acciones sensibles deberán validar el actor en servidor.

No se debe confiar en que ocultar un botón en la interfaz sea una medida de seguridad.

## 40.15 Realtime y presencia

LIVE requiere comunicación en tiempo real para:

- estado de sala;
- participantes;
- entrada/salida;
- invitaciones y solicitudes;
- chat;
- comentario fijado;
- Tap-Tap agregado;
- Quiéreme cuando corresponda;
- estados audiovisuales;
- moderación relevante.

La presencia efímera no debe confundirse automáticamente con datos históricos persistentes.

La arquitectura deberá definir qué eventos:

- se transmiten únicamente;
- se agregan;
- se persisten;
- se eliminan al terminar el Live.

## 40.16 Seguridad de datos y RLS

Toda entidad persistente de LIVE deberá tener una política de acceso definida antes de declararse terminada.

Principios:

- El usuario autenticado solo puede actuar como sí mismo.
- El Host solo administra sus propias salas.
- Los Moderators solo ejercen permisos concedidos.
- Los Guests no obtienen privilegios de Host.
- Los espectadores no pueden modificar datos autoritativos de la sala.
- Las métricas sensibles no deben quedar expuestas mediante consultas públicas innecesarias.
- Las operaciones críticas deberán preferir funciones/RPC o rutas servidoras con validación de actor cuando corresponda.

## 40.17 Contrato de interfaz entre módulos

LIVE podrá exponer a otros dominios únicamente interfaces claras.

### LIVE → Messages

LIVE puede solicitar/crear una referencia compartible de una sala.

Messages se encarga de entregar la tarjeta/enlace.

Messages no decide:

- quién es Host;
- quién es Guest;
- quién entra;
- qué permisos tiene un participante;
- cuándo termina la sala.

### LIVE → Profile/Social

LIVE reutiliza:

- avatar;
- username;
- nombre;
- seguidores;
- estado de Follow.

LIVE no debe crear un segundo sistema de perfiles.

### LIVE → Notifications

LIVE podrá emitir eventos notificables como:

- invitación;
- solicitud;
- actividad relevante;
- Live compartido;
- otras notificaciones definidas posteriormente.

Notifications se encargará del mecanismo de entrega.

### LIVE → Monetization

LIVE podrá registrar eventos de Gifts elegibles.

El dominio financiero será responsable de:

- saldo;
- ledger;
- comisiones;
- reparto;
- retiros;
- fraude;
- reembolsos.

## 40.18 Observabilidad

Antes de producción deberá ser posible identificar, como mínimo:

- creación/finalización de sala;
- errores de entrada;
- errores de invitación;
- cambios de participación;
- errores de Realtime;
- fallos de moderación;
- anomalías de capacidad;
- fallos de Gifts cuando exista monetización.

No se deben registrar secretos ni datos sensibles innecesarios.

## 40.19 Orden de implementación

LIVE deberá implementarse progresivamente:

1. Contrato de dominio y tipos.
2. Room/Host.
3. Participantes/Guests y límite 1+11.
4. Solicitudes/invitaciones.
5. Realtime/presencia.
6. Ventanillas/layout.
7. Cámara/micrófono y permisos.
8. Moderación.
9. Live Chat.
10. Tap-Tap.
11. Quiéreme.
12. Share Live.
13. Effects.
14. Gifts cuando monetización esté preparada.
15. Hardening, pruebas y observabilidad.

Cada bloque deberá pasar por:

**interfaz → lógica → DB → relaciones → RLS/permisos → Realtime/notificaciones → navegación → rendimiento → UX real → pruebas.**

## 40.20 Criterios de cierre de LIVE

LIVE no se considerará terminado solamente porque exista una pantalla.

Para cerrar el módulo deberán verificarse:

- límites 1 Host + 11 Guests;
- estados de sala y participantes;
- autorización server-side;
- RLS;
- Realtime;
- presencia;
- cámara/micrófono bajo control del usuario;
- moderación;
- Live Chat separado;
- Tap-Tap escalable;
- Quiéreme sin duplicados;
- compartir Live sin mezclar dominios;
- layouts adaptativos;
- manejo de salida/retiro;
- errores y reconexión;
- pruebas;
- observabilidad;
- compatibilidad con los dominios existentes.

**Este contrato protege la arquitectura del Documento Maestro. No autoriza todavía la creación de tablas, migraciones, servicios, pantallas ni cambios en Supabase.**


---

# 41. DISEÑO DE BASE DE DATOS DE LIVE — PREIMPLEMENTACIÓN

**Estado:** Diseño conceptual/técnico; no ejecutado.  
**Regla:** no crea tablas ni modifica Supabase. Los nombres físicos, tipos exactos, índices, constraints, RPC y migraciones se definirán después de revisar el esquema vigente de Supabase.

## 41.1 Principio de diseño

La base de datos de LIVE debe representar el estado autoritativo de la sala y sus relaciones, mientras que los eventos efímeros de alta frecuencia se manejan mediante Realtime/infraestructura adecuada.

No se debe usar la base de datos como canal de señalización por cada evento audiovisual o Tap-Tap.

## 41.2 Entidades y relaciones

Modelo conceptual:

```text
profiles
   │
   ├──< live_rooms
   │       │
   │       ├──< live_participants >── profiles
   │       │
   │       ├──< live_invitations >── profiles
   │       │
   │       ├──< live_join_requests >── profiles
   │       │
   │       ├──< live_moderators >── profiles
   │       │
   │       ├──< live_chat_messages >── profiles
   │       │
   │       ├── live_pinned_message
   │       │
   │       ├──< live_quiéreme >── profiles
   │       │
   │       ├──< live_gifts >── profiles
   │       │
   │       └──< live_shares >
   │
   └── relaciones sociales existentes
```

La relación con `profiles` reutiliza el usuario existente y no crea un perfil paralelo.

## 41.3 Live Rooms

La entidad Room deberá conservar como mínimo conceptualmente:

- identificador único;
- Host/propietario;
- modalidad: solo o con Guests;
- estado de la sala;
- título/metadatos públicos necesarios;
- timestamps de creación, inicio y finalización;
- configuración necesaria para acceso/moderación.

Reglas:

- una sala tiene un único Host;
- el Host debe corresponder a un usuario válido;
- solo una transición autorizada puede finalizar la sala;
- la capacidad de Guests no se debe confiar al cliente.

## 41.4 Participantes

`live_participants` representa la relación de un usuario con una sala.

Debe poder distinguir:

- usuario;
- sala;
- rol;
- estado de participación;
- ventanilla asignada;
- autorización audiovisual;
- estado de cámara;
- estado de micrófono;
- timestamps relevantes.

Los estados físicos de cámara/micrófono deben distinguirse de los permisos concedidos.

**Permiso ≠ dispositivo encendido.**

Nunca se debe almacenar un campo que implique que el servidor puede encender remotamente el dispositivo.

## 41.5 Invitaciones y solicitudes

Las invitaciones y solicitudes deben permanecer como entidades separadas porque representan intenciones diferentes:

- invitación iniciada por Host/Guest autorizado;
- solicitud iniciada por Spectator.

Cada registro deberá poder identificar:

- sala;
- actor;
- usuario objetivo;
- estado;
- timestamps;
- quién tomó la decisión cuando corresponda.

Las transiciones deberán ser idempotentes y validar capacidad antes de activar un Guest.

## 41.6 Moderadores

La autorización de moderación debe ser independiente de ser participante.

Conceptualmente:

```text
Host
 └── concede permisos → Moderator
```

El modelo debe permitir permisos específicos, por ejemplo:

- gestionar participantes;
- gestionar solicitudes;
- gestionar chat;
- bloquear;
- retirar;
- silenciar.

No se debe convertir automáticamente a un moderador en Guest ni a un Guest en moderador.

## 41.7 Live Chat

Los mensajes de Live deben tener identidad propia como contenido perteneciente a una sala.

Relaciones mínimas conceptuales:

```text
live_room → live_chat_message → author/profile
```

Debe poder determinarse:

- quién escribió;
- en qué Live;
- cuándo;
- estado de moderación;
- si está fijado.

El sistema de chat del Live no debe reutilizar la tabla de mensajes privados para almacenar estos mensajes.

## 41.8 Tap-Tap

No se diseñará una fila persistente por cada tap.

Separación:

```text
Tap físico
   ↓
evento efímero / agregación
   ↓
contador realtime
   ↓
persistencia agregada cuando corresponda
```

Si posteriormente se requiere historial, se almacenarán agregados por ventanas de tiempo o por sesión, no eventos individuales indiscriminados.

El diseño deberá poder identificar actividad por usuario para el resumen del Host sin convertir cada tap en una escritura de DB.

## 41.9 Quiéreme

Quiéreme debe poder representarse como relación única:

```text
usuario → Host/LIVE
```

Debe existir una restricción lógica/física que impida duplicados.

El contador deberá derivarse de una fuente consistente, no de incrementos directos desde clientes no confiables.

La eventual creación de Follow deberá respetar las reglas del sistema social existente y mantener idempotencia.

## 41.10 Gifts

Los registros de Gifts deberán separar:

- identidad del Live;
- remitente;
- receptor;
- elemento/regalo;
- cantidad;
- referencia financiera cuando exista.

Los saldos y movimientos financieros no deben residir dentro de la lógica básica de LIVE.

La integridad monetaria deberá pertenecer a un ledger financiero posterior.

## 41.11 Share Live

Compartir un Live debe guardar, cuando sea necesario, una referencia al Live y al contexto de entrega.

No debe copiar la lógica de participación a Messages.

Conceptualmente:

```text
LIVE → referencia de Share → Messages → receptor
```

La apertura de la tarjeta devuelve al usuario al dominio LIVE.

## 41.12 Integridad y constraints

Antes de implementar deberán definirse explícitamente:

- claves primarias;
- referencias a usuarios;
- referencias a salas;
- unicidad;
- estados permitidos;
- reglas de capacidad;
- timestamps;
- comportamiento ante eliminación de usuario/sala;
- protección contra relaciones huérfanas.

La regla 1 Host + máximo 11 Guests debe quedar protegida por lógica server-side y, donde sea viable, por constraints/transacciones, no solamente por la UI.

## 41.13 RLS y operaciones críticas

Cada entidad persistente deberá tener RLS definida antes de considerarse terminada.

Las operaciones críticas —crear/finalizar sala, aceptar Guest, retirar Guest, asignar moderador, moderar chat, registrar apoyo y otras operaciones autoritativas— deberán validar actor y estado en servidor.

Los clientes no deben poder:

- cambiar su rol a Host;
- elevarse a Moderator;
- superar el límite de Guests;
- modificar contadores autoritativos arbitrariamente;
- modificar registros de otros usuarios sin permiso.

## 41.14 Realtime frente a persistencia

Se distinguirán tres clases:

**A. Efímero:** presencia, estado de conexión, eventos audiovisuales inmediatos.

**B. Realtime + agregado:** Tap-Tap y señales de actividad de alta frecuencia.

**C. Persistente:** salas, participantes, invitaciones, solicitudes, moderación, chat, Quiéreme, Gifts y datos históricos necesarios.

Esta separación evita convertir Supabase/Postgres en el cuello de botella del Live.

## 41.15 Transacciones y concurrencia

Las operaciones que consumen una de las 11 ventanillas deberán ser atómicas.

Ejemplo conceptual:

```text
solicitud/invitación
      ↓
validar sala activa
      ↓
validar actor/permisos
      ↓
contar/capturar capacidad
      ↓
asignar Guest
      ↓
confirmar
```

Dos usuarios intentando ocupar la última ventanilla simultáneamente no deben poder obtener ambas.

La estrategia concreta —constraint, transacción, lock o función/RPC— se elegirá al diseñar la implementación sobre el esquema real.

## 41.16 Índices y rendimiento

Los índices se definirán a partir de las consultas reales, especialmente para:

- salas activas;
- Host;
- participantes por sala;
- solicitudes pendientes;
- invitaciones pendientes;
- chat por sala/tiempo;
- moderadores por sala;
- Quiéreme por Host;
- Gifts por Live/usuario.

No se crearán índices indiscriminadamente. Cada índice deberá justificar su consulta y coste de escritura.

## 41.17 Retención y limpieza

Antes de producción deberá definirse qué datos:

- permanecen históricamente;
- se agregan;
- se archivan;
- se eliminan al finalizar el Live;
- requieren retención por seguridad, moderación o finanzas.

Presencia y señalización efímera no deben permanecer indefinidamente como datos históricos.

## 41.18 Migraciones

Cuando el diseño sea aprobado para implementación:

1. revisar esquema Supabase vigente;
2. verificar nombres y dependencias;
3. diseñar migración incremental;
4. revisar RLS/constraints;
5. probar en entorno controlado;
6. ejecutar CI;
7. revisar resultado;
8. integrar mediante PR autorizado.

**No se debe crear una migración de LIVE todavía solamente porque este diseño exista.**

## 41.19 Resultado del diseño

La arquitectura de datos queda preparada para implementar LIVE sin mezclar:

- Feed;
- Messages;
- Calls;
- Bubbles;
- Profile/Social;
- Monetization.

La siguiente fase, antes de escribir migraciones, será **auditar el esquema Supabase vigente y contrastarlo entidad por entidad con este diseño**.
