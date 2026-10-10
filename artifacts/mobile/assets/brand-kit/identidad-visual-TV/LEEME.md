# Identidad visual · TV

Activos construidos a partir del SVG suministrado. No se ha añadido un nombre comercial.

## Archivos principales

| Uso | Archivo |
|---|---|
| App icon / App Store | `3d/app-icon-1024.png` · 1024 × 1024 px, RGB opaco |
| Google Play | `3d/app-icon-google-play-512.png` · 512 × 512 px, RGB opaco |
| Marketing y pantalla de carga | `3d/logo-3d-transparente-1024.png` · RGBA con fondo y triángulo de reproducción transparentes |
| Máster 3D | `3d/*master-1254.png` · 1254 × 1254 px |
| Documentos y marcas de agua | `vector/isotipo-negro.svg` y `vector/isotipo-blanco.svg` |
| Firmas de correo | `vector/isotipo-negro-1024.png` e `isotipo-blanco-1024.png` |
| Favicon moderno | `favicon/favicon.svg` · negro o blanco según el tema del dispositivo |
| Favicon convencional | `favicon/favicon.ico` · 16, 32 y 48 px; PNG adicionales |
| Manual de identidad y color | `manual/manual-identidad-TV.pdf` |
| Paleta | `manual/paleta.md`, `paleta.json`, `paleta.css` |
| Referencia original | `source/referencia-original.svg` y su render PNG |

## Color

Valores sRGB tomados de atributos `fill` del SVG original:

- Turquesa base del fondo: **#0C959F** · RGB **12, 149, 159**.
- Celeste menta de la T: **#66C7C6** · RGB **102, 199, 198**.
- Plata/lavanda de la V: **#828297** · RGB **130, 130, 151**.
- Reflejo celeste de la T: **#EFFCFC** · RGB **239, 252, 252**.
- Sombra menta de la T: **#60ABAF** · RGB **96, 171, 175**.
- Reflejo plata de la V: **#CBD3D9** · RGB **203, 211, 217**.
- Sombra lavanda de la V: **#8E7C95** · RGB **142, 124, 149**.

El manual también incluye el menta del botón y su turquesa interior. Cada código es un color declarado en el original, no un promedio ni una muestra de la recreación 3D. El SVG contiene varios tonos por letra; no existe un único HEX que reproduzca todo el relieve.

## Construcción y uso

- El 3D es una recreación refinada de la referencia, con volumen, acabado suave de plastilina satinada y reflejos controlados.
- El isotipo plano conserva la T redondeada, la V asimétrica y el botón superior. Usa tres trazados vectoriales en un solo color sólido. El triángulo es un hueco transparente con regla `evenodd`.
- El SVG negro y el blanco tienen la misma geometría. No contienen mapas de bits, filtros, texturas, degradados ni sombras.
- Los favicons incluyen ajustes ópticos de posición, escala y abertura del botón superior para mejorar la lectura en tamaños pequeños.
- Conserva las proporciones y deja un espacio libre de al menos la mitad del ancho del tallo de la T. Se recomienda un mínimo de 32 px para el isotipo completo.
- Para firmas de correo, utiliza los PNG planos en lugar del SVG, por compatibilidad entre clientes.
- El icono de tienda es cuadrado y opaco; la plataforma aplica su máscara. El recorte transparente es para composiciones de marca.

## Favicon web

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
```

`preview/` contiene imágenes del manual y `tools/` los scripts de las formas vectoriales y de la documentación.
