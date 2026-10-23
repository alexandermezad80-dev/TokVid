# TOKVID — APK261: auditoría y corrección aislada del perfil ajeno

## Evidencia observada en las dos capturas físicas
- Dos perfiles ajenos muestran contenido y cabecera correctos, con pie blanco de cinco posiciones y botón Crear.
- Comparación con captura física del perfil propio (mismo tamaño 689×1536): Crear aparece aproximadamente 10 píxeles más abajo en el perfil ajeno, equivalentes a cerca de 5 dp en ese dispositivo. No cambiar tamaño, gradiente ni ruta.
- El único icono visible del riel del perfil ajeno era el cuadrícula genérico de Feather, centrado por ocupar `width/shownTabs.length` cuando la privacidad solo deja visible `videos`.
- Los otros iconos de acciones del perfil ajeno no aparecen porque `profile_visibility` protege el historial de Me gusta y Compartidos. No inventar visibilidad del propietario ni datos inexistentes.

## Auditoría de código
- `app/(tabs)/_layout.tsx` contiene el botón Crear de referencia, protegido por hash; no se modifica.
- `components/ProfileTabBar.tsx` es un pie propio del perfil visitado. Conserva los mismos 49×30 dp y gradientes, pero estaba 5 dp más abajo en la fotografía.
- `app/user-profile.tsx` utiliza tres pestañas condicionales y dibuja `Feather grid`, `heart`, `share-2` genéricos. La barra del propio perfil usa iconos originales TOKVID y dimensiones fijas. La privacidad puede limitar a una sola pestaña.

## Correcciones aprobadas de alcance estrecho
1. Trasladar visualmente SOLO el Crear del pie de perfil ajeno `translateY(-5)` sin alterar medidas, fondos, íconos ajenos, rutas ni acciones.
2. En la barra sticky del perfil ajeno, usar iconos aprobados `TokvidProfileIcon videos/shared`; mantener Feather corazón para Me gusta. Reservar celdas de `width/3` a cada pestaña visible para no recentrar una única cuadrícula gigante.
3. Mantener la ocultación de `liked` y `shared` según `visibility.show_likes` y `visibility.show_shares`. Si otro usuario las habilita, sus iconos aparecen por la regla actual. Nunca mostrar Borradores ajenos.
4. Mantener grilla/miniaturas actuales del perfil ajeno, avatar, nombre, Amigos, contadores, Mensajes, Suscripción, cabecera, sticky, refresco, tab bar de cinco rutas y navegación.

## Excepción de aislamiento documentada
El archivo `ProfileTabBar.tsx` estaba entre los 18 hash protegidos. Su hash cambia solo mediante la autorización de corregir Crear en el pie ajeno. Se actualiza únicamente ese hash en `tokvid-apk261-isolation.test.cjs`, preservando los otros 17. El test de contratos y nuevas pruebas detectan modificaciones adicionales.

## Control de entrega
Solo código del pie y rail de perfil ajeno, pruebas y documentos. CI/TypeScript/prebuild, verificación de diff y push `[prepare only]`. No tocar workflows de Codex, Feed, propio perfil aprobado, datos, políticas ni Supabase; no generar APK hasta completar demás bloques. **La nueva posición/iconos requieren prueba física en la futura APK conjunta.**
