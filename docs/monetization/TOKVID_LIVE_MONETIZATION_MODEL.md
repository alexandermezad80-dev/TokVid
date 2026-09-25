# TOKVID — Modelo de Monetización LIVE

**Estado:** Especificación de trabajo para integración futura.
**Rama de trabajo:** `feature/onboarding-profile-interests`
**Regla:** No hacer merge a `main` hasta finalizar la aplicación, las pruebas y la revisión integral.

## 1. Modelo económico

TOKVID utilizará un reparto interno de **70% para el creador / 30% para la plataforma**.

### Valor base de la moneda

- Valor base interno: **1 Moneda = $0.0130 USD**.
- Pago interno al creador: **$0.0091 USD por moneda (70%)**.
- Retención operativa de TOKVID: **$0.0039 USD por moneda (30%)**.

Estos valores representan la conversión económica interna del sistema de regalos y no deben calcularse desde el cliente.

## 2. Web y App

### Web

- Precio de referencia por moneda: **$0.0130 USD**.
- El canal web utiliza procesadores de pago externos.
- Las comisiones del procesador deben contemplarse en el diseño financiero.
- La web podrá ofrecer packs, promociones y monedas adicionales conforme a las reglas comerciales aprobadas.

### App móvil

- Precio de referencia por moneda: **$0.0169 USD**.
- La diferencia frente al precio web contempla el coste del canal de compra móvil definido en el modelo.
- El reparto interno del ecosistema continúa calculándose sobre el valor base de $0.0130 por moneda.

Los precios finales deberán manejarse mediante configuración financiera versionada y no mediante constantes confiadas al cliente.

## 3. Catálogo de regalos

TOKVID tendrá **445 regalos digitales**, IDs 1–445.

El catálogo se divide en cuatro ventanas lógicas:

### Ventana A — Interacción rápida

**IDs 1–175**.

Características:

- Regalos de bajo coste.
- Diseñados para envíos rápidos y repetidos.
- Iconos pequeños.
- Alertas visuales flotantes sobre el Live Chat.

Ejemplo del modelo: regalos de 1 moneda.

### Ventana B — Especiales

**IDs 176–295**.

Características:

- Regalos de valor intermedio.
- Animación 2D + efectos de sonido.
- Interacción más destacada que la Ventana A.

El modelo contempla, entre otros niveles, regalos de 100 y 499 monedas.

### Ventana C — Épicos / VIP

**IDs 296–425**.

Características:

- Regalos de alto impacto.
- Banner superior + sonido VIP.
- Requieren una ventana de confirmación para evitar envíos accidentales en los regalos de mayor valor.

El catálogo contempla niveles como 500, 1,000, 5,000 y 9,999 monedas.

### Ventana D — Legendarios / Showstoppers

**IDs 426–445**.

Características:

- Máxima categoría.
- Animaciones 3D inmersivas.
- Efectos de pantalla completa.
- Pueden generar una celebración global dentro de la experiencia Live conforme a la implementación final.

El catálogo contempla niveles de 10,000 y 15,000 monedas.

## 4. Regla de compra y envío

Flujo conceptual:

```text
Usuario
  ↓
Compra monedas
  ↓
Wallet de monedas
  ↓
Entra a LIVE
  ↓
Selecciona Gift
  ↓
Confirmación cuando corresponda
  ↓
Servidor valida saldo y permisos
  ↓
Transacción atómica
  ↓
Descuento de monedas
  ↓
Registro del Gift
  ↓
70% → ganancias del creador
30% → plataforma
  ↓
Evento Realtime → experiencia visual del LIVE
```

El cliente nunca debe ser la autoridad final para:

- saldo;
- precio;
- reparto;
- ganancias;
- identidad del remitente;
- identidad del receptor;
- confirmación financiera.

## 5. Separación de dominios

### LIVE

LIVE es responsable de:

- selector de regalos;
- experiencia visual;
- envío del regalo dentro del Live;
- recepción;
- animaciones;
- galería de regalos obtenidos;
- eventos Realtime relacionados con la experiencia.

### Monetización

Monetización es responsable de:

- wallet/saldo;
- ledger financiero;
- compras de monedas;
- precios;
- reparto 70/30;
- ganancias del creador;
- retiros;
- reembolsos/disputas;
- antifraude;
- conciliación;
- referencias de pago externas.

LIVE no debe implementar su propio saldo financiero.

## 6. Ledger y seguridad financiera

Toda operación financiera deberá ser auditable.

El diseño deberá contemplar como mínimo:

- identificador único de transacción;
- usuario remitente;
- usuario receptor/creador;
- Live asociado;
- Gift asociado;
- monedas consumidas;
- valor económico interno;
- reparto al creador;
- comisión/retención de plataforma;
- estado de la operación;
- timestamps;
- referencia externa cuando exista.

Las operaciones críticas deberán ser atómicas e idempotentes.

Nunca se debe confiar en incrementos/decrementos enviados directamente por el cliente.

## 7. MVP del Live

El MVP del Live se determina por el apoyo acumulado mediante Gifts durante la sesión.

- Puede ser espectador o Guest.
- Existe un único MVP actual.
- Si otro usuario supera el apoyo acumulado, el reconocimiento cambia.
- La celebración visual del MVP pertenece exclusivamente al Live activo.
- El MVP no se mezcla con Tap-Tap ni con el contador de espectadores.

## 8. Galería de regalos

Los anfitriones y Guests podrán mostrar regalos obtenidos.

- La galería es visible para espectadores.
- Los espectadores no pueden administrarla.
- Los regalos pueden organizarse por niveles/categorías.
- La galería utiliza identidad visual propia de TOKVID.

## 9. Web/App y arquitectura

La diferencia de precio entre Web y App no debe duplicar el modelo financiero.

Debe existir una única lógica interna de valor y reparto:

```text
Precio de compra del canal
        ↓
Monedas adquiridas
        ↓
Valor base interno
        ↓
Gift
        ↓
Ledger
   ↙          ↘
70% creador   30% TOKVID
```

## 10. Reglas de implementación

Antes de implementar monetización:

1. Auditar la arquitectura Live existente.
2. Auditar Supabase y las migraciones existentes.
3. Identificar wallets, balances, tablas, RPC, Edge Functions y Realtime ya existentes.
4. Evitar duplicar entidades existentes.
5. Diseñar migraciones incrementales únicamente después de la auditoría.
6. Proteger RLS y operaciones autoritativas.
7. Probar concurrencia, doble envío, saldo insuficiente, reconexión y reintentos.
8. Probar Web y App por separado.
9. Probar reembolsos/disputas y conciliación antes de producción.
10. Integrar mediante PR y CI.

**No se debe implementar el catálogo de 445 regalos simplemente por estar especificado aquí. Primero se contrasta con el código y la arquitectura real de TOKVID.**
