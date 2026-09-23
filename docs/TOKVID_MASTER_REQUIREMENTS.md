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

La personalización no debe alterar la lógica de almacenamiento de mensajes.

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
