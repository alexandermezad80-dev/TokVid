# TOKVID — APK 261: "+" de historia montado sobre la esquina del marco del avatar

## Problema observado por el propietario
En las capturas físicas del perfil propio, el círculo `+` estaba desplazado hacia el exterior de la esquina inferior derecha del avatar. El usuario solicitó expresamente colocarlo **sobre la esquina**, integrado con el marco, sin rediseñar el avatar ni alterar el perfil aprobado.

## Diagnóstico exacto en código
- `BrandAvatar` mide **90×90 dp** y conserva un radio de 12 dp y marco degradado TOKVID.
- El `styles.avatarWrap` ocupa **104×104 dp** con `marginBottom:-14` y `marginRight:-14` para respetar la geometría existente del perfil.
- El `+` es un círculo de 20×20 dp dentro de ese wrapper, antes con `bottom:0,right:0`. Por ello su centro caía a **94,94 dp**, cuatro dp más allá de cada borde real del avatar, cuyo vértice es **90,90 dp**.
- Solución mínima: `bottom:4,right:4` en `styles.editBadge`. Su centro pasa exactamente a **90,90 dp**, solapándose con la esquina del marco. No se alteran `width`, `height`, radio, borde, icono, colores ni la función `router.push("/story-create")`.

## Otros acuerdos protegidos
- Grilla de tres columnas, tab bar inferior, six-slot/sticky, Feed, pantallas visitadas, marcos y gradientes de TOKVID, acceso a historias y herramientas superiores intactos.
- Corrección independiente de las esquinas oscuras de miniaturas en commit `03459f3bfa8a084ab0d7be8ca027297c11a6b29b`, sin tocar `PublicationThumbnail`.
- Ningún archivo hash-protegido (18), workflows de Codex, Supabase ni migraciones cambia en este bloque.
- Pruebas de geometría de badge, navegación y compilación de TSX. Este cambio **solo se verificará visualmente** tras instalar la APK conjunta final; las capturas iniciales prueban el defecto anterior, no la corrección.

## Proceso de entrega
Commit de preparación `[prepare only]`, CI/TypeScript/configuración Android, **sin generar APK** hasta terminar el conjunto de bloques.
