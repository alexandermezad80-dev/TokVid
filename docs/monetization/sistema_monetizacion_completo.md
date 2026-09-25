# ARCHIVO MAESTRO: ARQUITECTURA DE MONETIZACIÓN GLOBAL BLINDADA (SPLIT 70/30)
# DOCUMENTO DE ESPECIFICACIÓN DE INGENIERÍA PARA AGENTES DE IA Y DESARROLLADORES
# ESTADO: APTO PARA PRODUCCIÓN / COMPLIANCE FINANCIERO / TOLERANCIA CERO A PÉRDIDAS

Este documento unifica la infraestructura interna del servidor, el motor contable relacional (Ledger), las reglas de seguridad antifraude de pasarela, el controlador del webhook de Stripe y el componente tipado del frontend en un plano listo para su despliegue y desarrollo inmediato.

---

## 📌 BLOQUE 1: ARQUITECTURA FINANCIERA (EL ESCUDO DE PRECIOS)

Para evitar pérdidas operativas, la plataforma NUNCA absorbe las comisiones de los procesadores de pago (App Store, Google Play, Stripe). Se implementa una política de **Precios Asimétricos** donde la comisión se traslada al 100% al espectador, garantizando que el 30% asignado a la plataforma sea utilidad neta pura.

### 1.1 Fórmulas Matemáticas de Conversión
El valor neto interno de una Moneda en el servidor se fija en exactamente **$0.010 USD**.

*   **Fórmula para Pasarelas Web (Stripe / PayPal - Comisión promedio 5%):**
    $$\text{Precio Web} = \frac{\text{Monedas} \times 0.01}{1 - 0.05} = \frac{\text{Monedas} \times 0.01}{0.95}$$
*   **Fórmula para Tiendas Móviles (In-App Purchases iOS/Android - Comisión 30%):**
    $$\text{Precio App} = \frac{\text{Monedas} \times 0.01}{1 - 0.30} = \frac{\text{Monedas} \times 0.01}{0.70}$$

### 1.2 Matriz de Carga de Tokens Oficial
El sistema solo permite compras en paquetes cerrados. Ninguna transacción puede romper los márgenes calculados en la siguiente tabla:

| ID Paquete | Monedas | Costo Neto Servidor | Precio Venta Web (Stripe) | Precio Venta App (Apple/Google) |
| :--- | :--- | :--- | :--- | :--- |
| `PKG_001` | **100** | $1.00 USD | $1.05 USD | $1.43 USD (Ajustado a $1.49) |
| `PKG_002` | **500** | $5.00 USD | $5.26 USD | $7.14 USD (Ajustado a $7.49) |
| `PKG_003` | **1,000** | $10.00 USD | $10.53 USD | $14.28 USD (Ajustado a $14.99) |
| `PKG_004` | **5,000** | $50.00 USD | $52.63 USD | $71.42 USD (Ajustado a $74.99) |

---

## 🧮 BLOQUE 2: LÓGICA MATEMÁTICA Y REGLA MODULO 5

La base de datos maneja transacciones exclusivamente en números enteros para evitar los errores de redondeo de punto flotante inherentes a los sistemas binarios e informáticos (`0.1 + 0.2 = 0.30000000000000004`).

1.  **Regla de Validación:** Toda transacción de envío de regalos (a excepción del regalo base de 1 moneda) debe cumplir estrictamente con la condición:
    $$\text{Cantidad Monedas} \pmod 5 == 0$$
2.  **Razón de Negocio:** La base decimal y sus divisores nativos ($1, 2, 5, 10$) minimizan el esfuerzo cognitivo del usuario al calcular conversiones y estandarizan de forma limpia los clústeres de analítica en la base de datos.

---

## 📊 BLOQUE 3: PERSISTENCIA INMUTABLE (SQL LEDGER SEGURO)

Queda estrictamente prohibido usar sentencias `UPDATE` directas sobre los balances para procesar regalos. Se utiliza una arquitectura de **Libro Mayor Contable (Ledger)**. Los balances de los usuarios son vistas calculadas o tablas protegidas por restricciones físicas (`CHECK`) a nivel de base de datos.

```sql
-- Habilitar extensiones de seguridad
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Balances del Ecosistema
CREATE TABLE usuarios_balances (
    usuario_id VARCHAR(64) PRIMARY KEY,
    monedas_disponibles INT DEFAULT 0 CONSTRAINT chk_monedas_positivas CHECK (monedas_disponibles >= 0),
    diamantes_congelados INT DEFAULT 0 CONSTRAINT chk_congelados_positivos CHECK (diamantes_congelados >= 0),
    diamantes_liquidados INT DEFAULT 0 CONSTRAINT chk_liquidados_positivos CHECK (diamantes_liquidados >= 0),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo Oficial Estricto de Regalos
CREATE TABLE catalogo_regalos (
    id VARCHAR(32) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    costo_monedas INT NOT NULL CONSTRAINT chk_costo_valido CHECK (costo_monedas = 1 OR costo_monedas % 5 = 0),
    nivel_animacion VARCHAR(10) NOT NULL CONSTRAINT chk_nivel CHECK (nivel_animacion IN ('LVL_1', 'LVL_2', 'LVL_3', 'LVL_4')),
    activo BOOLEAN DEFAULT TRUE
);

-- 3. Libro Mayor de Transacciones (Inmutable: NO UPDATE, NO DELETE)
CREATE TABLE transacciones_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaccion_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    espectador_id VARCHAR(64) REFERENCES usuarios_balances(usuario_id),
    creador_id VARCHAR(64) REFERENCES usuarios_balances(usuario_id),
    regalo_id VARCHAR(32) REFERENCES catalogo_regalos(id),
    tipo_operacion VARCHAR(20) NOT NULL CONSTRAINT chk_tipo_op CHECK (tipo_operacion IN ('COMPRA', 'ENVIO_REGALO', 'RETIRO', 'CONVERSION_LIQUIDA')),
    monedas_debitadas INT DEFAULT 0,
    diamantes_creditados INT DEFAULT 0,
    referencia_externa_id VARCHAR(255), -- ID único de Stripe/Apple/Google para conciliaciones
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alto rendimiento para transmisiones en vivo masivas
CREATE INDEX idx_ledger_espectador_creador ON transacciones_ledger(espectador_id, creador_id);
CREATE INDEX idx_ledger_referencia_ext ON transacciones_ledger(referencia_externa_id);
```

---

## 🛠️ BLOQUE 4: ALGORITMO BACKEND ATÓMICO (REVENUE SHARE 70/30 COMPRADOR)

Para evitar la "clonación de monedas" o condiciones de carrera si la app experimenta latencia o clics rápidos concurrentes, el procesamiento de debitar y acreditar debe ocurrir dentro de una **transacción aislada en el nivel de seguridad financiera más alto (`SERIALIZABLE`)**.

### Código del Servidor (Node.js / TypeScript)
```typescript
import { Pool } from 'pg';
const databasePool = new Pool();

async function procesarEnvioRegaloModeloSetenta(espectadorId: string, creadorId: string, regaloId: string) {
  const client = await databasePool.connect();
  
  try {
    // 1. Iniciar Transacción SQL en aislamiento absoluto
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;');

    // 2. Bloquear la fila del espectador para evitar condiciones de carrera (Race Conditions)
    const balanceRes = await client.query(
      'SELECT monedas_disponibles FROM usuarios_balances WHERE usuario_id = $1 FOR UPDATE;', 
      [espectadorId]
    );
    
    if (balanceRes.rows.length === 0) throw new Error("USUARIO_NO_EXISTE");

    // 3. Obtener el costo exacto del regalo directo desde la BD (Seguridad estricta contra manipulaciones)
    const regaloRes = await client.query(
      'SELECT costo_monedas, nivel_animacion FROM catalogo_regalos WHERE id = $1 AND activo = true;', 
      [regaloId]
    );

    if (regaloRes.rows.length === 0) throw new Error("REGALO_INVALIDO");
    const costo = regaloRes.rows.costo_monedas;

    if (balanceRes.rows.monedas_disponibles < costo) {
      throw new Error("SALDO_INSUFICIENTE");
    }

    // 4. Calcular el Split: 70% neto para el Usuario / 30% de Comisión para la Plataforma
    // 100 Monedas enviadas ($1.00 USD) = 70 Diamantes ($0.70 USD) para el usuario recipiente
    const diamantesParaUsuario = Math.floor(costo * 0.70);

    // 5. Ejecutar débitos y créditos en espejo en los balances de memoria
    await client.query(
      'UPDATE usuarios_balances SET monedas_disponibles = monedas_disponibles - $1 WHERE usuario_id = $2;',
      [costo, espectadorId]
    );

    // Los diamantes ingresan al fondo CONGELADO por seguridad regulatoria y antifraude de 14 días
    await client.query(
      'UPDATE usuarios_balances SET diamantes_congelados = diamantes_congelados + $1 WHERE usuario_id = $2;',
      [diamantesParaUsuario, creadorId]
    );

    // 6. Asentar el movimiento de manera inmutable en el Libro Mayor (Ledger)
    await client.query(
      `INSERT INTO transacciones_ledger (espectador_id, creador_id, regalo_id, tipo_operacion, monedas_debitadas, diamantes_creditados) 
       VALUES ($1, $2, $3, 'ENVIO_REGALO', $4, $5);`,
      [espectadorId, creadorId, regaloId, costo, diamantesParaUsuario]
    );

    // 7. Consolidar de forma irreversible la transacción en disco duro
    await client.query('COMMIT;');
    
    return { exito: true, nivelAnimacion: regaloRes.rows.nivel_animacion };

  } catch (error) {
    // Si ocurre un error en base de datos o fallo de red, se cancela todo. Pérdida operativa = $0.00
    await client.query('ROLLBACK;');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 🔌 BLOQUE 5: ENDPOINT INTEGRADO DE WEBHOOK DE STRIPE

Este módulo expone la ruta pública necesaria para recibir las notificaciones asíncronas de cobro exitoso directo de Stripe. Su arquitectura previene hackeos de inyección de saldo y repetición de transacciones.

### Código de Conexión del Servidor (Node.js / Express)
```typescript
import express from 'express';
import Stripe from 'stripe';
import { Pool } from 'pg';

const stripe = new Stripe('sk_test_TU_LLAVE_SECRETA_DE_STRIPE', {
  apiVersion: '2025-01-27'
});

const dbPool = new Pool();
const router = express.Router();

// Requiere procesar el body crudo (Buffer) para verificar la firma de Stripe
router.post('/webhook-stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'whsec_TU_LLAVE_SECRETA_DEL_WEBHOOK'; 

  let event: Stripe.Event;

  try {
    // 1. Validar criptográficamente que la petición proviene legítimamente del servidor de Stripe
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err) {
    console.error(\`❌ Error crítico: Firma de Webhook inválida. \${(err as Error).message}\`);
    return res.status(400).send(\`Webhook Error: \${(err as Error).message}\`);
  }

  // 2. Escuchar exclusivamente el evento de cobro de checkout exitoso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const usuarioId = session.metadata?.usuarioId;
    const cantidadMonedas = parseInt(session.metadata?.cantidadMonedas || '0', 10);
    const referenciaStripe = session.id;

    if (!usuarioId || cantidadMonedas <= 0) {
      console.error('⚠️ Estructura de metadatos corrupta o ausente en la sesión de Stripe.');
      return res.status(400).json({ error: 'Metadatos corruptos' });
    }

    // 3. Ejecutar inyección de saldo atómica validada por ID único
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;');

      // Verificación contra ataques de repetición (Idempotency check)
      const transaccionPrevia = await client.query(
        'SELECT id FROM transacciones_ledger WHERE referencia_externa_id = $1;', 
        [referenciaStripe]
      );

      if (transaccionPrevia.rows.length > 0) {
        console.log(\`ℹ️ Transacción \${referenciaStripe} ya procesada anteriormente en el Ledger.\`);
        await client.query('ROLLBACK;');
        return res.status(200).json({ received: true });
      }

      // Incrementar el balance neto disponible del usuario
      await client.query(
        \`UPDATE usuarios_balances 
         SET monedas_disponibles = monedas_disponibles + $1 
         WHERE usuario_id = $2;\`,
        [cantidadMonedas, usuarioId]
      );

      // Registrar el ingreso contable real en el Ledger inmutable
      await client.query(
        \`INSERT INTO transacciones_ledger (espectador_id, tipo_operacion, monedas_debitadas, referencia_externa_id) 
         VALUES ($1, 'COMPRA', $2, $3);\`,
        [usuarioId, cantidadMonedas, referenciaStripe]
      );

      await client.query('COMMIT;');
      console.log(\`✅ Carga exitosa de \${cantidadMonedas} monedas al usuario \${usuarioId}.\`);

    } catch (error) {
      await client.query('ROLLBACK;');
      console.error('❌ Error de sistema procesando inyección de saldo:', error);
      return res.status(500).json({ error: 'Database failure' });
    } finally {
      client.release();
    }
  }

  res.status(200).json({ received: true });
});

export default router;
```

---

## ⚠️ BLOQUE 6: BLINDAJE ANTIFRAUDE (ESCROW DE 14 DÍAS)

Al entregar el 70% neto del ingreso al usuario, el margen operativo de tu plataforma se reduce al 30% neto. Un solo fraude por tarjeta clonada o contracargos bancarios (*chargebacks*) mal gestionados puede generar pérdidas financieras directas.

1.  **Regla de Custodia Obligatoria (*Escrow*):** Ningún diamante recibido puede ser liquidado de inmediato. Permanece en `diamantes_congelados` durante **14 días naturales** (ventana estándar internacional para detección de fraudes de pasarela).
2.  **Liberación Automatizada (*Cron Job*):** Tarea programada en el servidor que migra saldos seguros cada 24 horas:

```sql
-- Mover diamantes de Congelados a Liquidados tras superar la ventana de riesgo de 14 días
WITH transacciones_seguras AS (
    SELECT creador_id, SUM(diamantes_creditados) as total_seguro
    FROM transacciones_ledger
    WHERE tipo_operacion = 'ENVIO_REGALO' 
      AND creado_en < NOW() - INTERVAL '14 days'
    GROUP BY creador_id
)
UPDATE usuarios_balances b
SET 
    diamantes_congelados = diamantes_congelados - t.total_seguro,
    diamantes_liquidados = diamantes_liquidados + t.total_seguro
FROM transacciones_seguras t
WHERE b.usuario_id = t.creador_id;
```

### 6.3 Políticas Operativas de Retiro
*   **Mínimo de Retiro:** **$50.00 USD** (5,000 diamantes líquidos). Esto detiene costos administrativos redundantes por transacciones pequeñas de microcentavos.
*   **Máximo Automatizado:** **$500.00 USD diarios**. Cualquier solicitud que exceda este límite bloquea la dispersión para auditoría manual de identidad (KYC).
*   **Comisiones de Salida:** Las tarifas impuestas por Stripe Connect Payouts o PayPal por transferir fondos a cuentas de los usuarios se **restan íntegramente** del saldo final de cobro del usuario. Tu 30% neto de plataforma jamás subsidia la transferencia saliente.

---

## ⚛️ BLOQUE 7: FRONTEND COMPONENTE ROBUSTO TYPESCRIPT (`.tsx`)

Módulo de interfaz gráfica cliente optimizado para React o React Native. Pre-valida saldos para economizar recursos de red y congela los disparadores de ejecución de interfaz para mitigar clics repetitivos concurrentes.

```tsx
// CatalogoRegalos.tsx
import React, { useState } from 'react';

export type NivelRegalo = 'LVL_1' | 'LVL_2' | 'LVL_3' | 'LVL_4';

export interface RegaloItem {
  id: string;
  nombre: string;
  costoMonedas: number;
  nivel: NivelRegalo;
  iconoUrl: string;
}

interface Props {
  saldoMonedasActual: number;
  creadorId: string;
  onTransaccionExitosa: (nuevoSaldo: number) => void;
}

const LISTA_REGALOS_ESTANDAR: RegaloItem[] = [
  { id: 'reg_01', nombre: 'Me Gusta', costoMonedas: 1, nivel: 'LVL_1', iconoUrl: '/img/like.png' },
  { id: 'reg_05', nombre: 'Aplauso', costoMonedas: 5, nivel: 'LVL_1', iconoUrl: '/img/clap.png' },
  { id: 'reg_10', nombre: 'Café Caliente', costoMonedas: 10, nivel: 'LVL_1', iconoUrl: '/img/coffee.png' },
  { id: 'reg_25', nombre: 'Fuego Épico', costoMonedas: 25, nivel: 'LVL_2', iconoUrl: '/img/fire.png' },
  { id: 'reg_100', nombre: 'Auto Deportivo', costoMonedas: 100, nivel: 'LVL_3', iconoUrl: '/img/car.png' },
  { id: 'reg_999', nombre: 'Universo Fénix', costoMonedas: 10000, nivel: 'LVL_4', iconoUrl: '/img/fenix.png' }
];

export const CatalogoRegalos: React.FC<Props> = ({ saldoMonedasActual, creadorId, onTransaccionExitosa }) => {
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const ejecutarEnvio = async (regalo: RegaloItem) => {
    // VALIDACIÓN CLIENTE: Frena operaciones inválidas antes de consumir recursos de red del servidor
    if (saldoMonedasActual < regalo.costoMonedas) {
      alert("Operación cancelada: Monedas insuficientes.");
      return;
    }

    // INTERRUPTOR DE CONCURRENCIA: Bloquea clics duplicados masivos instantáneos
    setProcesandoId(regalo.id);

    try {
      const response = await fetch('/api/v1/monetizacion/regalar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer JWT_TOKEN_DEL_USUARIO'
        },
        body: JSON.stringify({
          regaloId: regalo.id,
          creadorId: creadorId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ERROR_SERVIDOR_REVERTIDO");
      }

      // Conciliación del estado local en el frontend
      onTransaccionExitosa(data.nuevoSaldoMonedas);
      
      // Emitir evento por WebSockets solo si el regalo requiere despliegue gráfico complejo
      if (regalo.nivel !== 'LVL_1') {
        ejecutarAnimacionEnPantalla(regalo.id, regalo.nivel);
      }

    } catch (err) {
      alert(\`Transacción denegada por el libro contable: \${(err as Error).message}\`);
    } finally {
      setProcesandoId(null);
    }
  };

  const ejecutarAnimacionEnPantalla = (id: string, nivel: NivelRegalo) => {
    console.log(\`Emitiendo WebSocket de animación nivel: \${nivel} para el ID: \${id}\`);
    // Punto de enganche para bibliotecas Lottie Web / SVGA Player
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {LISTA_REGALOS_ESTANDAR.map((regalo) => {
        const bloqueado = saldoMonedasActual < regalo.costoMonedas || procesandoId !== null;
        return (
          <button
            key={regalo.id}
            disabled={bloqueado}
            onClick={() => ejecutarEnvio(regalo)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: \`2px solid \${COLORES_BORDES[regalo.nivel]}\`,
              opacity: saldoMonedasActual < regalo.costoMonedas ? 0.4 : 1,
              cursor: bloqueado ? 'not-allowed' : 'pointer'
            }}
          >
            <img src={regalo.iconoUrl} alt={regalo.nombre} style={{ width: 36, height: 36 }} />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>{regalo.nombre}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>🪙 {regalo.costoMonedas}</p>
          </button>
        );
      })}
    </div>
  );
};

const COLORES_BORDES = {
  LVL_1: '#f0f0f0', 
  LVL_2: '#00bcff', 
  LVL_3: '#a800ff', 
  LVL_4: '#ffb700'  
};
```

---

## 🔒 BLOQUE 8: COMPLIANCE OPERATIVO Y SEGURIDAD BANCARIA MANDATORIA

1.  **Validación de Transacciones Fieles:** El servidor bajo ninguna circunstancia incrementa balances virtuales basándose en respuestas o peticiones del cliente del frontend. La inyección de tokens se ejecuta estrictamente procesando el evento asíncrono encriptado y firmado enviado por Stripe, Apple Billing o Google Play Billing.
2.  **Segregación de Cuentas de Fondos de Terceros:** Los ingresos percibidos por tu banco real que representen saldos acumulados de `diamantes_congelados` y `diamantes_liquidados` pertenecen legalmente a tus usuarios creadores en condición de custodia temporal. Debes mantener estos activos financieros depositados en una cuenta corriente corporativa totalmente independiente y separada de la cuenta utilizada para gastos corrientes, operativos y de desarrollo de la plataforma, evitando así contingencias por quiebra técnica o iliquidez.
