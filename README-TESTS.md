# Guía de pruebas de TokVid

## 1. ¿Para qué sirven las pruebas?

Las pruebas automatizadas permiten comprobar que una parte del código sigue funcionando correctamente después de realizar cambios.

En este proyecto usamos **Vitest** para las pruebas unitarias. La infraestructura inicial ya fue verificada mediante GitHub Actions.

## 2. Antes de ejecutar las pruebas

Necesitas tener instalado en tu computadora:

- Node.js 20 o una versión compatible con el proyecto.
- pnpm.
- Git.

Luego abre una consola y entra en la carpeta del proyecto.

```bash
cd TokVid
```

Si acabas de clonar el repositorio, instala las dependencias:

```bash
pnpm install
```

## 3. Ejecutar todas las pruebas

Desde la raíz del proyecto ejecuta:

```bash
pnpm test
```

Este comando ejecuta Vitest en modo de ejecución automática y termina cuando finalizan las pruebas.

## 4. ¿Cómo saber si una prueba salió bien?

### 🟢 Verde / SUCCESS

Si Vitest termina indicando que las pruebas pasaron, significa que las comprobaciones realizadas fueron exitosas.

Ejemplo:

```text
Tests passed
```

Esto permite continuar con la siguiente etapa del desarrollo.

### 🔴 Rojo / FAILURE

Si una prueba falla, **no debemos ignorarla**.

El resultado mostrará qué prueba falló y normalmente indicará el archivo y la línea relacionada. Primero se debe investigar la causa antes de modificar código.

Regla del proyecto:

> Entender → revisar → probar → modificar → volver a probar.

## 5. Ejecutar una prueba específica

Para ejecutar solamente un archivo de prueba:

```bash
pnpm test tests/smoke.test.ts
```

La prueba inicial comprueba que la infraestructura funciona verificando que `1 + 1` sea igual a `2`.

## 6. Cuando agreguemos nuevas pruebas

Las pruebas unitarias se colocarán dentro de la carpeta:

```text
tests/
```

Los archivos de prueba deben terminar normalmente en:

```text
.test.ts
```

Después de agregar o modificar una prueba, ejecuta:

```bash
pnpm test
```

## 7. Flujo recomendado antes de integrar cambios

1. Realiza el cambio en una rama de trabajo, no directamente en `main`.
2. Ejecuta las pruebas relacionadas con el cambio.
3. Ejecuta todas las pruebas:

```bash
pnpm test
```

4. Si todas pasan, revisa también los demás chequeos del proyecto cuando correspondan.
5. Si alguna falla, identifica la causa antes de continuar.
6. Vuelve a ejecutar las pruebas después de corregir el problema.
7. Solo después de verificar todo se debe considerar la integración del cambio.

## 8. Pruebas en GitHub Actions

La rama de configuración de pruebas también ejecuta automáticamente Vitest mediante GitHub Actions.

Esto permite comprobar las pruebas en GitHub incluso cuando no se dispone de una computadora local.

Una ejecución exitosa de GitHub Actions significa que el entorno automatizado pudo instalar las dependencias y ejecutar `pnpm test` correctamente.

## 9. Importante sobre credenciales

Nunca escribas contraseñas, claves privadas, tokens ni otras credenciales dentro de los archivos de pruebas o del código fuente.

Las credenciales necesarias para servicios externos deben utilizar variables de entorno y los mecanismos seguros correspondientes.

## 10. Regla principal del proyecto

Las pruebas son una protección para el código existente. No se debe cambiar código simplemente para conseguir que una prueba pase.

Cuando aparezca un fallo:

**Primero entender → después revisar → probar → modificar lo necesario → volver a probar.**
