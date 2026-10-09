# Mensajes privados y coherencia del perfil — 9 de octubre de 2026

## Autorización y alcance

Después de sus pruebas en dos teléfonos con la APK #206, el usuario autorizó auditar e implementar este bloque y producir una sola APK para probarlo. La espera mientras enumeraba observaciones terminó con «hagamos esta implementación» y los posteriores «Continúa». Confirmó **Eliminar para mí / Eliminar para todos** para mensajes propios y pidió que fondo y bordes fueran todavía más discretos que la propuesta visual. No hace falta volver a pedir esas decisiones.

Conservar Auth/OTP, publicación real, comentarios públicos, sus permisos y el video pequeño al comentar. El borrado privado descrito aquí no sustituye la cascada de comentarios públicos.

## Hallazgos comprobados

- La consulta anterior de Inbox usaba relaciones `profiles!conversations_user1_id_fkey`, pero esas claves apuntan a `auth.users`. El error se ocultaba como una lista vacía.
- `messages` y `conversations` no estaban en la publicación `supabase_realtime`. Recibir una notificación y abrir el chat recuperaba el historial; no demostraba entrega en vivo.
- El compositor usaba `KeyboardAvoidingView` sin comportamiento Android. Reutiliza ahora la geometría medida del teclado, incluyendo cambios de altura al abrir emojis y evitando descontar dos veces el teclado cuando Android ya redimensionó la ventana.
- La consulta autenticada del propietario ve **1 publicación real existente**. No hubo que volver a subir ni alterar su contenido. Las tarjetas con hijos absolutamente posicionados reciben ahora ancho/alto numéricos derivados de la anchura disponible. La corrección visual de la grilla requiere confirmación física.
- El avatar propio del feed dirigía a la pantalla pública; el botón inferior Follow no comprobaba propiedad, aunque el + lateral sí lo hacía.

## Comportamiento implementado

- Inbox obtiene interlocutor, último mensaje visible y no leídos desde una vista con RLS. Los errores ofrecen reintento, no «Sin mensajes» falso.
- El chat recibe inserciones, eliminaciones y cambios de lectura; Inbox se actualiza por cambios de conversación. Cada efecto crea su propio canal, descarta respuestas antiguas y limpia su suscripción. Reconsulta al reconectar, volver al primer plano y cada 15 s estando activo para recuperar eventos perdidos; no se promete entrega de red instantánea bajo desconexión.
- Envío confirmado con UUID estable y notificación atómica: un reintento de la misma petición no duplica ninguno. El texto se conserva si falla el envío. Los clientes antiguos mantienen su mecanismo de aviso sin sumar un trigger duplicado.
- Popover flotante al tocar un mensaje y desde el encabezado; ancho máximo 320 dp, margen 16 dp y opciones con altura mínima 50 dp. Se adapta al espacio encima/debajo y permite scroll. Atrás o tocar fuera lo cierra. Fondo y bordes cian/magenta muy tenues.
- «Burbujas» abre un submenú desplazable con vista previa de los ocho estilos ya existentes y conserva la preferencia.
- Selección manual de varios mensajes o «Seleccionar todos» con corte temporal del servidor, incluyendo historial aún no cargado. Los mensajes posteriores no entran en esa operación. La selección total se cancela para volver a selección manual.
- **Para mí:** oculta solo en la cuenta que lo solicita. **Para todos:** solo mensajes propios; una selección mixta se rechaza completa. La confirmación precede al borrado; no se anuncia éxito si el servidor falla. El contenido eliminado para todos se vacía y se excluye del historial. Una conversación sin mensajes visibles sale de esa bandeja; un mensaje nuevo vuelve a mostrarla.
- Avatar propio desde el feed y rutas públicas del propio usuario abren el perfil completo de la tab bar. No aparece Seguir en publicaciones propias. Las ajenas conservan Seguir/Siguiendo y bloqueo de pulsaciones durante la petición.
- Siguiendo, Seguidores y Amigos del perfil abren las pestañas correspondientes de la pantalla existente, con listas desplazables y perfiles navegables. Amigos son seguimientos mutuos, no un contador independiente. Los cambios propios se reflejan al finalizar la operación; se recuperan cambios externos al recibir eventos/reenfocar o por la comprobación periódica.
- Grillas de perfil propio, público y búsqueda con tres columnas medidas, 6 dp de separación, esquinas de 10 dp y el borde/marca de agua aprobados.

## Base de datos aplicada

Proyecto `kvbppgofblldwnkkoscb`. Migraciones registradas con su versión real:

1. `20261009042214_private_chat_delivery_visibility_and_removal`.
2. `20261009043643_atomic_private_message_sending`.

Vistas `security_invoker`, funciones `SECURITY INVOKER`, RLS por participantes y ocultaciones por cuenta. El servidor valida autoría al enviar/eliminar, impide modificar el texto ajeno o trasladar mensajes a otra conversación y limita lectura a los participantes. El cliente no recibe una clave de servicio. No reaplicar ni editar migraciones ya registradas; usar una nueva si hace falta corregirlas.

La primera migración incluía un trigger de notificación, reemplazado en la segunda por `send_private_message` para mantener compatibilidad con APK anteriores. Las dos forman el estado final; no desplegar solo la primera.

## Evidencia y límites

- **124 pruebas locales aprobadas, 0 fallidas.** Incluyen las 106 anteriores, modelos/servicios de mensajería, recepción en chat abierto, actualización de Inbox sin notificaciones, reconexión, eventos/consultas obsoletos, reintento sin duplicados, borrado, geometría del popover, grilla, relaciones y botón de seguimiento propio.
- Transpilación local: 68 archivos TS/TSX, 0 errores de sintaxis; `git diff --check` correcto. El adaptador local de TypeScript no equivale a un typecheck: el workflow #207 completó además el typecheck con las dependencias reales.
- `scripts/tests/private-messages.rollback.sql` pasó después de aplicar las dos migraciones: envío/aviso atómicos, bandeja de ambos, no leídos, lectura, borrado privado/para todos, lote mixto rechazado y acceso de un tercero denegado. Transacción revertida; no conserva chats ni notificaciones de prueba ni elimina conversaciones existentes.
- Advisor de seguridad: ningún aviso nuevo sobre los objetos añadidos. Persisten 25 advertencias previas de funciones `SECURITY DEFINER` de LIVE/contadores y protección de contraseñas filtradas desactivada. Son otro alcance; [referencia de funciones](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [referencia de Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se cambiaron Auth ni funciones LIVE para este bloque.
- **[APK #207](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37886244472/artifacts/11597441070) entregada**, código `5485c9961f7bd1869468c92d7b5ec25c81262425`. CI confirmó las **124 pruebas**, typecheck móvil completo, `BUILD SUCCESSFUL in 27m 29s`, marcador/SHA dentro del bundle y mapa de fuentes correspondiente. [Manifiesto](continuity/APK_207_VERIFICATION.json). Ninguna prueba automática sustituye probar teclado, emojis, scroll, menú y llegada en dos teléfonos con la APK final.

## Prueba física de aceptación

1. Instalar la misma APK nueva en ambas cuentas. Enviar A → B desde un perfil: B ve la conversación en Mensajes sin tocar Actividad. Con ambos chats abiertos, intercambiar mensajes sin salir y comprobar el último texto/no leídos al volver a la bandeja.
2. Abrir letras, emojis, cerrar teclado y reabrirlo: el compositor y el texto deben seguir visibles. Probar nombre largo y pantalla pequeña.
3. Tocar burbuja y opciones superiores; abrir Burbujas, desplazar todos los estilos, elegir uno y volver. Comprobar el fondo discreto y que las letras mantienen contraste.
4. Mensaje propio → Eliminar para mí: desaparece solo en ese teléfono. Otro propio → Eliminar para todos: desaparece en ambos. Recibido: no ofrece para todos. Probar selección manual mixta, seleccionar todos y un mensaje que llegue después de esa selección.
5. Revisar el video ya publicado en la grilla propia y abrirlo; ambos avatares del feed deben abrir ese mismo perfil completo. El video propio no ofrece seguirse a sí mismo.
6. Tocar Siguiendo, Seguidores y Amigos, abrir un perfil y seguir/dejar de seguir. Comprobar listas y contadores, y que Amigos requiera seguimiento mutuo.
7. Conservar como regresión: OTP de ocho dígitos, regreso de Google, publicación real y menú/compositor de comentarios aprobado. Registrar los resultados concretos antes de marcar «confirmado en teléfono».
