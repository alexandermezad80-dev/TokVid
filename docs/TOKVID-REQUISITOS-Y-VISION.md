# TokVid — Requisitos funcionales y visión del producto

## 0. Referencia visual y UX: modelo HTML de TokVid

El archivo HTML de referencia **`tokvid-flujo.html`** forma parte de la definición visual/UX de TokVid, pero **no es la arquitectura de la aplicación ni debe importarse como código de producción**.

- Se utiliza como referencia para la identidad visual, presentación y experiencia de usuario que se desea conservar.
- La aplicación final mantiene su arquitectura nativa actual con Expo/React Native, Expo Router y Supabase.
- No se debe convertir el HTML en pantallas de producción ni copiar literalmente su código.
- La referencia visual incluye la dirección estética que se quiere preservar: tema oscuro, contraste cyan/magenta, presentación moderna, enfoque video-first y la experiencia de bienvenida.
- La interfaz final debe adaptar esa identidad a una aplicación nativa y a las funciones reales de TokVid.
- No trasladar al onboarding funciones que en el HTML aparezcan como demostración. En particular, cámara y micrófono pertenecen a los contextos reales de uso: Crear/grabación, Live y llamadas.
- Las pantallas, permisos, verificaciones o comportamientos simulados del HTML no se consideran implementación funcional de producción.
- La distribución de controles debe mantener una identidad propia de TokVid; el objetivo no es copiar literalmente la interfaz de TikTok ni la del HTML.

**Principio:** el HTML define una **referencia visual/UX**, no una dependencia técnica. TokVid debe conservar la idea visual que fue aprobada, pero implementarla de forma nativa, segura, mantenible y coherente con sus funciones reales.


> Documento maestro de requisitos acordados para planificación y auditoría.
>
> **Estado:** especificación de producto; no implica que todas las funciones estén implementadas.
> **Regla de trabajo:** primero auditar; no modificar código, Supabase, migraciones, políticas o configuración sin autorización explícita.

## 1. Identidad, perfil y relaciones
- Perfil con nombre, username, avatar, videos publicados y actividad.
- Seguidores, seguidos y amigos cuando exista seguimiento mutuo.
- Nichos/categorías del perfil.
- Secciones para videos publicados, favoritos/guardados y videos a los que el usuario dio Me gusta.
- Menciones de usuarios y controles de quién puede mencionar.
- Enlace externo en perfil: propuesta de desbloqueo tras 60 días, con cuenta en buen estado, verificación y controles de seguridad del enlace.

## 2. Feed y descubrimiento
- Feed vertical de scroll infinito.
- Reproducción del video visible.
- Precarga inteligente del siguiente video y ventana limitada de precarga para reducir datos, memoria y batería.
- Adaptación a conexiones lentas.
- Me gusta, comentarios, compartir y guardar/favoritos.
- Acceso al perfil y seguimiento del creador.
- Hashtags: creación, descubrimiento, página/feed y contenido asociado.
- Interfaz con identidad propia; no copiar literalmente la distribución de otras plataformas.

## 3. Videos, Stories y favoritos
### Videos
- Publicar, reproducir, comentar, dar Me gusta, compartir y guardar.
- Comentarios independientes de mensajes privados y del chat de Live.

### Stories
- Publicar y visualizar.
- Me gusta en Stories.
- Notificación cuando alguien da Me gusta a una Story.
- Acceso desde la notificación a la Story correspondiente.
- Privacidad y controles apropiados.

### Favoritos / guardados
- Guardar y quitar guardado.
- Área para consultar videos guardados.
- Posibles colecciones en el futuro.

## 4. Crear y producción de video
La sección Crear debe evolucionar a un conjunto de herramientas de producción:
- Grabación e importación de video.
- Recorte y unión de clips.
- Edición y vista previa.
- Texto, música/sonido, efectos y filtros.
- Ajustes visuales.
- Filtros de imagen y video.
- Efectos especiales.
- Subtítulos.
- Guardado de borradores y continuación posterior.
- Múltiples borradores y eliminación.
- Un borrador no es público hasta confirmación.

### Voz y sonido
- Cambios de voz y efectos de voz.
- Ajustes de audio.
- Aplausos, risas y otros efectos/reacciones sonoras.
- Previsualización antes de publicar.
- Imitación de voces reales debe tener reglas de seguridad y consentimiento.

### Subtítulos
- Generación automática desde voz/audio.
- Edición manual y sincronización.
- Estilos, tamaño y posición.
- Vista previa.
- Diferentes idiomas.
- Activar/desactivar durante reproducción.

### IA para creadores
- Ideas y guiones.
- Texto para publicaciones.
- Recursos visuales.
- Edición asistida.
- Transformación/generación de recursos audiovisuales cuando corresponda.
- El creador mantiene control sobre lo que publica.
- Política específica de IA, seguridad y propiedad intelectual.

## 5. Formatos y procesamiento de video
Definir y aplicar:
- Formatos, duración, resolución, tamaño y códecs aceptados.
- Validación de archivos.
- Conversión/transcodificación cuando sea posible.
- Optimización para móvil.
- Versiones adecuadas para distintas conexiones.
- Equilibrio entre calidad, velocidad, almacenamiento y consumo de datos.

## 6. Mensajes privados
- Conversaciones y envío/recepción de mensajes.
- Notificaciones de nuevos mensajes.
- Eliminar un mensaje individual.
- Seleccionar varios y eliminarlos.
- Eliminar todos los mensajes de una conversación de una vez.
- Eliminar/vaciar una conversación completa.
- Diferenciar eliminar para mí de eliminar para todos, si esta última opción se habilita.
- RLS y permisos para impedir borrado arbitrario de mensajes ajenos.

### Burbujas de chat
- Elegir estilos de burbuja.
- Vista previa.
- Cambiar estilo posteriormente.
- Diferenciar enviados/recibidos.
- Mantener legibilidad y accesibilidad.

### Llamadas dentro de mensajes
- Llamada de voz.
- Videollamada.
- Elegir solo voz o voz + video.
- Activar/desactivar micrófono y cámara.
- Aceptar/rechazar y finalizar.
- Notificación de llamada entrante y perdida.
- Cámara/micrófono se solicitan al usar la función, no durante onboarding.

## 7. Live
Sistema separado del feed, Stories y mensajería.

### Anfitrión
- Crear Live.
- Gestionar invitados y participantes.
- Autorizar participantes.
- Autorizar/restringir cámara y micrófono.
- Abrir/cerrar acceso y revocar permisos.
- Control de la sala.

### Invitados
- Entrar cuando sean autorizados.
- Usar su propia cámara y micrófono dentro de los permisos concedidos.
- Cada participante controla físicamente su dispositivo; el anfitrión controla la autorización de sala.

### Chat del Live
- Comentarios/chat en tiempo real.
- Independiente de comentarios de videos y mensajes privados.

### Elegibilidad propuesta para Live
- 18 años o más.
- Mínimo 1,000 seguidores.
- Cuenta de al menos 30 días.
- Cuenta en buen estado.
- Cumplimiento de políticas de Live y comunidad.
Estas condiciones son requisitos de producto propuestos y deben revisarse antes de publicación legal.

## 8. Cámara y micrófono
- Live: anfitrión/invitados autorizados.
- Videollamadas: comunicación privada.
- Crear: grabación de contenido.
- Permisos solicitados en el contexto de uso.
- No colocar cámara/micrófono en onboarding solo por existir estas funciones.

## 9. Notificaciones
Área propia de notificaciones de interacción:
- Me gusta en videos.
- Me gusta en Stories.
- Comentarios.
- Nuevos seguidores.
- Menciones.
- Mensajes privados.
- Llamadas/videollamadas.
- Actividad relevante de Live.
- Otras interacciones pertinentes.
Cada notificación debe llevar al destino correspondiente cuando sea posible: perfil, video, Story, conversación o Live.
No considerar terminada la función solo porque exista una tabla; comprobar generación, persistencia, lectura, navegación y permisos.

## 10. Seguridad de mensajes y ayuda
### Mensajes potencialmente peligrosos
- Detección de señales de riesgo.
- Ocultar/proteger el mensaje.
- El usuario decide si abrirlo.
- Reportar y bloquear cuando corresponda.
- Explicación clara del motivo.
- Minimizar falsos positivos.

### ¿Necesitas ayuda?
- Aviso de apoyo cuando corresponda.
- Opciones de ayuda, reporte y bloqueo.
- Recursos profesionales.
- Recursos de emergencia apropiados cuando exista riesgo inmediato.
- No diagnosticar ni asumir automáticamente una situación personal por una detección automática.

### Ayuda psicológica
- Enlace a entidad profesional y verificable.
- Nombre, enlace oficial y tipo de ayuda.
- Recursos verificados y actualizados.
- No publicar organizaciones o enlaces sin comprobarlos.

### Conducta repetida
- Si se detectan 3 mensajes relacionados con una misma conducta/intención de riesgo, mostrar advertencia.
- Posible advertencia de suspensión temporal de 24 horas según las políticas.
- Antes de automatizar una suspensión: definir categorías, criterios, umbrales, revisión, protección contra falsos positivos y apelación.

## 11. Protección de menores
- Live restringido a 18+ según la propuesta anterior.
- Detección de posible voz infantil solo como señal, nunca como prueba única de edad.
- Posible limitación temporal de funciones de adultos mientras se verifica cuando sea necesario.
- Proceso de verificación de edad apropiado.
- No bloquear automáticamente solo por una estimación de voz.
- Privacidad y protección especial de menores.
- Revisión/apelación.

## 12. Derechos de autor y propiedad intelectual
- El usuario debe tener derechos o permisos necesarios para publicar contenido.
- Sistema para reportar infracciones.
- Revisión de reclamaciones.
- Retirada/restricción cuando corresponda.
- Disputa/apelación.
- Reglas para música, imágenes, videos y material de terceros.
- Reglas para contenido generado o transformado con IA.
- TokVid no asume derechos sobre material de terceros.
- Política específica de propiedad intelectual.

## 13. Políticas de TokVid
Preparar y revisar jurídicamente antes de publicación:
1. Términos y condiciones.
2. Política de privacidad.
3. Reglas de la comunidad.
4. Política de contenido y moderación.
5. Política de mensajes privados.
6. Política de Live.
7. Derechos de autor y propiedad intelectual.
8. Política de IA.
9. Seguridad y protección de usuarios.
10. Enlaces externos.
11. Cuentas, sanciones y apelaciones.
12. Menores y requisitos de edad.
13. Datos, eliminación de cuenta y contenido.
14. Creadores y monetización.
15. Información de empresa y políticas para usuarios.

## 14. Monetización — función vital
La monetización debe formar parte de la arquitectura desde el principio.

### Para creadores
- Regalos/apoyos en Live.
- Suscripciones, si se implementan.
- Participación en ingresos por contenido elegible.
- Herramientas promocionales.
- Panel de ingresos.
- Historial de pagos.
- Retiros.

### Para TokVid
- Comisiones de determinadas transacciones.
- Publicidad.
- Herramientas premium.
- Servicios para creadores.
- Funciones empresariales.

### Sistema financiero
- Saldo/ganancias.
- Historial de transacciones.
- Umbral mínimo de retiro.
- Métodos de pago por país.
- Verificación de identidad cuando corresponda.
- Prevención de fraude.
- Reembolsos y disputas.
- Registros financieros.
- Fórmulas de reparto modificables sin reconstruir toda la plataforma.

## 15. Herramientas para usuarios con gran audiencia
Niveles progresivos para cuentas con muchos seguidores:
- Estadísticas y crecimiento.
- Visualizaciones y retención.
- Horarios de actividad.
- Moderación avanzada.
- Moderadores de Live.
- Gestión de audiencia.
- Protección de cuenta.
- Alertas de seguridad.
- Herramientas de comunidad, encuestas y preguntas.
- Soporte especializado.
- Monetización cuando sean elegibles.

## 16. Panel administrativo
Área segura para el propietario/equipo autorizado:
- Usuarios.
- Crecimiento.
- Videos.
- Stories.
- Live.
- Interacciones.
- Reportes.
- Moderación.
- Seguridad.
- Ingresos y comisiones.
- Pagos a creadores.
- Métricas de plataforma.
- Permisos administrativos estrictamente controlados.

## 17. Evolución segura y recuperación
TokVid debe poder agregar funciones y reglas sin romper lo existente.

Flujo:
Desarrollo aislado → CI → pruebas → revisión → staging → producción.

- La rama principal representa la línea estable/producción según la estrategia final.
- Nuevas funciones se desarrollan en ramas separadas.
- Releases versionadas.
- Mantener siempre una versión funcional recuperable.
- Si una versión nueva falla, poder volver a la última versión estable.
- Los cambios grandes no se integran directamente a producción.

## 18. Trabajo de varios desarrolladores
Separar áreas:
- Auth/usuarios.
- Perfil.
- Feed.
- Crear/editor.
- Interacciones.
- Comentarios.
- Mensajes.
- Llamadas.
- Live.
- Notificaciones.
- IA.
- Monetización.
- Seguridad/moderación.
- Administración.
- Supabase.

Cada desarrollador trabaja en su rama y entrega Pull Request:
rama → CI → pruebas → revisión → aprobación → merge.

Definir ownership/revisiones obligatorias para áreas sensibles como Auth, Supabase, seguridad y pagos. Un desarrollador no debe tener control total de producción solo por trabajar en una parte de la app.

## 19. Base de datos y Supabase
- Cambios de base de datos versionados.
- Migraciones identificables por cambio/fecha.
- Revisar dependencias antes de cambios.
- Evitar cambios destructivos sin plan de recuperación.
- RLS y permisos auditados.
- No hacer cambios manuales de producción sin control de versiones.

## 20. Regla de auditoría y protección del proyecto
Antes de implementar cualquier requisito:
1. Identificar qué ya existe.
2. Identificar qué funciona.
3. Identificar qué existe parcialmente.
4. Identificar qué falta.
5. Identificar duplicaciones/conflictos.
6. Identificar dependencias.
7. Documentar.
8. Planificar.
9. Autorizar.
10. Implementar.
11. Probar.
12. Integrar.

Para cada función:
Interfaz → lógica → base de datos → relaciones → RLS/permisos → notificaciones → navegación → rendimiento → experiencia real.

Durante la auditoría no modificar código, Supabase, migraciones, políticas o configuración sin autorización explícita.

## 21. Estados de auditoría
Cada requisito podrá clasificarse:
- Existe y funciona.
- Existe parcialmente.
- No existe.
- Existe pero necesita revisión.
- Depende de otra función.

## 22. Principio central
Una función nueva no debe destruir una función existente.

TokVid debe poder crecer por etapas, permitir trabajo paralelo, mantener una versión funcional recuperable y proteger las áreas sensibles mediante revisiones y controles.

---

Este documento registra los requisitos acordados hasta este punto. No afirma que estén implementados. Las propuestas de 60 días para enlace y 18+ / 1,000 seguidores / 30 días para Live quedan sujetas a confirmación final y revisión legal.
