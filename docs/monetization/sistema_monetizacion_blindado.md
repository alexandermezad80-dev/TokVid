# MANUAL DE ESPECIFICACIÓN TÉCNICA: ARQUITECTURA DE MONETIZACIÓN BLINDADA
## SISTEMA DE REGALOS DIGITALES Y TOKENOMICS (MODELO REVENUE SHIFT 50/50)
### DISEÑADO PARA: AGENTES DE IA, CTO Y DESARROLLADORES CORE
### ESTADO: PRODUCCIÓN / COMPLIANCE FINANCIERO CONTROLADO / REGLA TOLERANCIA CERO A PÉRDIDAS

---

## 📌 BLOQUE 1: ARQUITECTURA FINANCIERA (EL ESCUDO DE PRECIOS)

Para evitar pérdidas operativas, la plataforma bajo ninguna circunstancia absorberá las comisiones cobradas por los procesadores de pago de terceros (App Store, Google Play, Stripe). Se implementa un modelo de **Precios Asimétricos**, trasladando el coste total de transacción e impuestos al espectador.

### 1.1 Fórmulas Matemáticas de Costo y Conversión
El valor neto interno que el servidor debe percibir por cada **1 Moneda** virtual se fija de forma exacta e inmutable en **$0.010 USD**.

*   **Fórmula para Pasarelas Web (Stripe / PayPal - Comisión promedio 5%):**
    $$	ext{Precio Venta Web} = rac{	ext{Monedas} 	imes 0.01}{1 - 0.05} = rac{	ext{Monedas} 	imes 0.01}{0.95}$$
*   **Fórmula para Tiendas Móviles (In-App Purchases iOS/Android - Comisión estándar 30%):**
    $$	ext{Precio Venta App} = rac{	ext{Monedas} 	imes 0.01}{1 - 0.30} = rac{	ext{Monedas} 	imes 0.01}{0.70}$$

### 1.2 Matriz de Carga de Tokens Oficial
El backend y frontend solo deben permitir transacciones basadas en paquetes cerrados. Queda estrictamente prohibido generar flujos de carga libres que rompan los márgenes mínimos de la siguiente matriz:

| ID Paquete | Monedas | Costo Neto Servidor | Precio Venta Web (Stripe) | Precio Venta App (Apple/Google) |
| :--- | :--- | :--- | :--- | :--- |
| `PKG_001` | **100** | $1.00 USD | $1.05 USD | $1.43 USD (Ajustado a $1.49) |
| `PKG_002` | **500** | $5.00 USD | $5.26 USD | $7.14 USD (Ajustado a $7.49) |
| `PKG_003` | **1,000** | $10.00 USD | $10.53 USD | $14.28 USD (Ajustado a $14.99) |
| `PKG_004` | **5,000** | $50.00 USD | $52.63 USD | $71.42 USD (Ajustado a $74.99) |

---

## 🧮 BLOQUE 2: LÓGICA MATEMÁTICA Y REGLA MODULO 5

Toda la contabilidad virtual dentro del sistema se procesa obligatoriamente utilizando **números enteros positivos**. Queda prohibido el uso de tipos de datos de punto flotante (`float`, `double`) para almacenar saldos en el core, debido a errores acumulativos de redondeo binario.

1.  **Regla de Validación:** Toda transacción de envío de regalos (excepto el regalo base con ID único de valor 1) debe cumplir estrictamente en el backend con la condición lógica:
    $$	ext{Cantidad Monedas} \pmod 5 == 0$$
2.  **Razón de Ingeniería:** La base decimal y sus divisores exactos ($1, 2, 5, 10$) mitigan la carga cognitiva del usuario en interfaces táctiles y agrupan de forma óptima los clústeres de analítica en la capa de datos.

---

## 📊 BLOQUE 3: CAPA DE PERSISTENCIA INMUTABLE (SQL LEDGER SEGURO)

Queda estrictamente prohibido utilizar sentencias `UPDATE` directas y aisladas sobre los balances de los usuarios para procesar el envío de un regalo. El sistema opera como un **Libro Mayor Contable (Ledger)**. Los balances de los usuarios son valores verificados mediante sumatorias o resguardados bajo restricciones de integridad relacional directas en el motor de base de datos.

```sql
-- Habilitar extensión para IDs seguros y aleatorios
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Balances del Ecosistema (Solo modificable dentro de transacciones Ledger)
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

-- 3. Libro Mayor de Transacciones Inmutable (Operaciones puras de inserción)
CREATE TABLE transacciones_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaccion_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    espectador_id VARCHAR(64) REFERENCES usuarios_balances(usuario_id),
    creador_id VARCHAR(64) REFERENCES usuarios_balances(usuario_id),
    regalo_id VARCHAR(32) REFERENCES catalogo_regalos(id),
    tipo_operacion VARCHAR(20) NOT NULL CONSTRAINT chk_tipo_op CHECK (tipo_operacion IN ('COMPRA', 'ENVIO_REGALO', 'RETIRO', 'CONVERSION_LIQUIDA')),
    monedas_debitadas INT DEFAULT 0,
    diamantes_creditados INT DEFAULT 0,
    referencia_externa_id VARCHAR(255), -- ID único provisto por Stripe/Apple/Google
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alta velocidad para streaming en tiempo real
CREATE INDEX idx_ledger_espectador_creador ON transacciones_ledger(espectador_id, creador_id);
```

---

## 🛠️ BLOQUE 4: CONTROLADOR BACKEND ATÓMICO (ACID)

Para evitar la "clonación de monedas" o condiciones de carrera (*Race Conditions*) cuando un usuario genera múltiples clics rápidos concurrentes sobre la red, el flujo debe envolverse en una transacción de base de datos con el nivel de aislamiento más alto disponible (`SERIALIZABLE`).

### Código del Servidor (Node.js / TypeScript / Express)
```typescript
import { Pool } from 'pg';
const databasePool = new Pool();

export async function procesarEnvioRegalo(espectadorId: string, creadorId: string, regaloId: string) {
  const client = await databasePool.connect();
  
  try {
    // 1. Iniciar Transacción con Máximo Aislamiento Financiero
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;');

    // 2. Bloquear en memoria la fila del espectador para evitar lecturas sucias
    const balanceRes = await client.query(
      'SELECT monedas_disponibles FROM usuarios_balances WHERE usuario_id = $1 FOR UPDATE;', 
      [espectadorId]
    );
    
    if (balanceRes.rows.length === 0) throw new Error("USUARIO_NO_EXISTE");
    
    // 3. Obtener el costo exacto directamente del Catálogo Seguro en BD (Nunca confiar en el valor enviado por el Frontend)
    const regaloRes = await client.query(
      'SELECT costo_monedas, nivel_animacion FROM catalogo_regalos WHERE id = $1 AND activo = true;', 
      [regaloId]
    );

    if (regaloRes.rows.length === 0) throw new Error("REGALO_INVALIDO_O_INACTIVO");
    const costo = regaloRes.rows[0].costo_monedas;

    if (balanceRes.rows[0].monedas_disponibles < costo) {
      throw new Error("SALDO_INSUFICIENTE");
    }

    // 4. Aplicar el Split 50/50 Matemático (Retención de la Casa)
    // 100 Monedas debitadas equivalen a 50 Diamantes para el Creador.
    // El abono inicial va directamente a la cuenta CONGELADA por seguridad antifraude.
    const diamantesParaCreador = Math.floor(costo * 0.50);

    // 5. Modificar Balances de forma simultánea (Doble Asiento en Memoria)
    await client.query(
      'UPDATE usuarios_balances SET monedas_disponibles = monedas_disponibles - $1 WHERE usuario_id = $2;',
      [costo, espectadorId]
    );

    await client.query(
      'UPDATE usuarios_balances SET diamantes_congelados = diamantes_congelados + $1 WHERE usuario_id = $2;',
      [diamantesParaCreador, creadorId]
    );

    // 6. Registrar Asiento Contable Permanente en el Ledger Inmutable
    await client.query(
      `INSERT INTO transacciones_ledger (espectador_id, creador_id, regalo_id, tipo_operacion, monedas_debitadas, diamantes_creditados) 
       VALUES ($1, $2, $3, 'ENVIO_REGALO', $4, $5);`,
      [espectadorId, creadorId, regaloId, costo, diamantesParaCreador]
    );

    // 7. Consolidar cambios en disco duro de forma síncrona
    await client.query('COMMIT;');
    
    return { exito: true, nivelAnimacion: regaloRes.rows[0].nivel_animacion };

  } catch (error) {
    // Si cualquier paso intermedio falla, se anulan todos los movimientos del bloque. Pérdida financiera = 0.
    await client.query('ROLLBACK;');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## ⚠️ BLOQUE 5: BLINDAJE ANTIFRAUDE (ESCROW DE 14 DÍAS Y RETIROS)

El fraude masivo mediante el uso de tarjetas de crédito robadas o cuentas vulneradas genera disputas bancarias (*chargebacks*) que pueden drenar tu capital de forma imprevista si ya le has pagado al creador.

1.  **Regla de Custodia Obligatoria (*Escrow*):** Todos los diamantes derivados del envío de regalos entrarán inicialmente al estado `diamantes_congelados`. Permanecerán allí bloqueados durante **14 días naturales** (ventana estándar de detección de fraude bancario).
2.  **Liberación Automatizada Segura (*Cron Job*):** Una tarea programada ejecutada en el servidor cada 24 horas transferirá de forma masiva los saldos que superen la ventana de riesgo hacia el balance disponible para retiro líquido:

```sql
-- Migración de saldo congelado a saldo líquido verificable tras 14 días
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

### 5.3 Reglas Operativas de Retiro Seguro
*   **Mínimo de Liquidación Requerido:** **$50.00 USD** (Equivalente exacto a 10,000 diamantes liquidados). Bloquea la micro-dispersión que genera altos costes por transferencia.
*   **Máximo Automatizado Diario:** **$500.00 USD**. Cualquier petición de retiro que supere este valor detendrá la ejecución del backend y requerirá una aprobación manual e inspección de logs de auditoría por parte del administrador de la plataforma.
*   **Asignación de Comisiones de Salida:** Las tarifas impuestas por los procesadores de pago de dispersión externa (Stripe Connect, PayPal Payouts, transferencias bancarias de salida) serán **deducidas en su totalidad** del saldo bruto que solicita el creador. La empresa nunca absorberá los costes de transferencia saliente.

---

## ⚛️ BLOQUE 6: FRONTEND ROBUSTO EN TYPESCRIPT (`.tsx`)

Implementación nativa para la interfaz de cliente en entornos React o React Native. Su función clave es bloquear de forma reactiva la interfaz del espectador mientras la transacción contable está en tránsito, impidiendo peticiones duplicadas y validando saldos de forma local.

### 6.1 Estructura del Componente Integrado (`CatalogoRegalos.tsx`)
```tsx
import React, { useState } from 'react';

export type NivelRegalo = 'LVL_1' | 'LVL_2' | 'LVL_3' | 'LVL_4';

export interface RegaloItem {
  id: string;
  nombre: string;
  costoMonedas: number;
  nivel: NivelRegalo;
  iconoUrl: string;
}

interface CatalogoRegalosProps {
  saldoMonedasActual: number;
  creadorId: string;
  onTransaccionExitosa: (nuevoSaldo: number) => void;
}

// Configuración espejo estricta que mapea la Base de Datos
const LISTA_REGALOS_COMPLETA: RegaloItem[] = [
  { id: 'reg_01', nombre: 'Me Gusta', costoMonedas: 1, nivel: 'LVL_1', iconoUrl: '/img/like.png' },
  { id: 'reg_05', nombre: 'Aplauso', costoMonedas: 5, nivel: 'LVL_1', iconoUrl: '/img/clap.png' },
  { id: 'reg_10', nombre: 'Café de Creador', costoMonedas: 10, nivel: 'LVL_1', iconoUrl: '/img/coffee.png' },
  { id: 'reg_25', nombre: 'Fuego Épico', costoMonedas: 25, nivel: 'LVL_2', iconoUrl: '/img/fire.png' },
  { id: 'reg_100', nombre: 'Auto Deportivo', costoMonedas: 100, nivel: 'LVL_3', iconoUrl: '/img/car.png' },
  { id: 'reg_999', nombre: 'Universo Fénix', costoMonedas: 10000, nivel: 'LVL_4', iconoUrl: '/img/fenix.png' }
];

const COLORES_BORDES_NIVEL = {
  LVL_1: '#e5e7eb', // Gris: Sin impacto en rendimiento
  LVL_2: '#3b82f6', // Azul: Animación ligera sobre pantalla
  LVL_3: '#a855f7', // Morado: Animación media pantalla completa
  LVL_4: '#eab308'  // Dorado: Notificación global a toda la App + Lottie 3D
};

export const CatalogoRegalos: React.FC<CatalogoRegalosProps> = ({ 
  saldoMonedasActual, 
  creadorId, 
  onTransaccionExitosa 
}) => {
  const [regaloProcesandoId, setRegaloProcesandoId] = useState<string | null>(null);

  const ejecutarEnvioRegalo = async (regalo: RegaloItem) => {
    // 1. VALIDACIÓN LOCAL: Frena llamadas innecesarias a la API si el cliente no posee balance
    if (saldoMonedasActual < regalo.costoMonedas) {
      alert("Operación denegada de forma segura: Monedas insuficientes.");
      return;
    }

    // 2. BLOQUEO DE BOTÓN: Desactiva mecánicamente clics masivos concurrentes
    setRegaloProcesandoId(regalo.id);

    try {
      const response = await fetch('/api/v1/monetizacion/regalar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer SECURE_JWT_TOKEN_DEL_USUARIO'
        },
        body: JSON.stringify({
          regaloId: regalo.id,
          creadorId: creadorId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ERROR_SISTEMA_REVERTIDO");
      }

      // 3. ACTUALIZACIÓN RECONCILIADA DEL ESTADO DEL CLIENTE
      onTransaccionExitosa(data.nuevoSaldoMonedas);
      
      // 4. DISPARAR EVENTO DE ANIMACIÓN SÓLO SI EL NIVEL LO REQUIERE
      if (regalo.nivel !== 'LVL_1') {
        renderizarAnimacionCliente(regalo.id, regalo.nivel);
      }

    } catch (err) {
      alert(`Transacción cancelada por seguridad del Libro Contable: ${(err as Error).message}`);
    } finally {
      // Liberar bloqueo de control una vez finalizada la persistencia en el backend
      setRegaloProcesandoId(null);
    }
  };

  const renderizarAnimacionCliente = (id: string, nivel: NivelRegalo) => {
    console.log(`Disparando evento WebSocket global para renderizado Lottie Nivel: ${nivel}, ID: ${id}`);
    // Punto de enganche para reproducir archivos Lottie JSON o animaciones SVGA
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px' }}>
      {LISTA_REGALOS_COMPLETA.map((regalo) => {
        const esInvalidoPorSaldo = saldoMonedasActual < regalo.costoMonedas;
        const estaBloqueado = esInvalidoPorSaldo || regaloProcesandoId !== null;

        return (
          <button
            key={regalo.id}
            disabled={estaBloqueado}
            onClick={() => ejecutarEnvioRegalo(regalo)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: `2px solid ${COLORES_BORDES_NIVEL[regalo.nivel]}`,
              opacity: esInvalidoPorSaldo ? 0.4 : 1,
              cursor: estaBloqueado ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s ease'
            }}
          >
            <img src={regalo.iconoUrl} alt={regalo.nombre} style={{ width: 40, height: 40, display: 'block', margin: '0 auto' }} />
            <p style={{ margin: '6px 0 2px 0', fontSize: '13px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
              {regalo.nombre}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
              🪙 {regalo.costoMonedas}
            </p>
          </button>
        );
      })}
    </div>
  );
};
```

---

## 🔒 BLOQUE 7: COMPLIANCE OPERATIVO Y SEGURIDAD BANCARIA

1.  **Principio de Inmutabilidad del Frontend:** El cliente (`.tsx`) es únicamente un visor de datos interactivo. El servidor web debe desconfiar de forma estricta de cualquier dato numérico proveniente del teléfono del usuario. Toda validación de precios y saldos se ejecuta obligatoriamente de forma redundante en el Backend antes de tocar las tablas contables.
2.  **Fondo de Reserva Reconciliado:** El flujo monetario correspondiente a los diamantes que se encuentran retenidos en la ventana de custodia de 14 días debe ser resguardado en una cuenta bancaria corporativa completamente separada de los fondos operativos de tu empresa. Esto garantiza liquidez absoluta y blindaje legal en caso de auditorías externas.