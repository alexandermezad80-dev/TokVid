# Especificación Técnica: Sistema de Tokenomics Escalonado (Base 5)
Este documento define la arquitectura matemática, lógica de base de datos y flujos de conversión económica para el sistema de monetización interna mediante tokens/monedas.

## 1. Arquitectura de Precios y Escalas (Lógica de Negocio)
La aplicación implementará una progresión aritmética basada en múltiplos de 5 para la compra y uso de la moneda interna. Esto minimiza el esfuerzo de acarreo aritmético del usuario y estandariza los clústeres financieros.

* **Valor Base del Token:** 1 Token = $0.010 USD (Precio Web base)
* **Recargo por Pasarela In-App (iOS/Android):** +30% de recargo sobre el valor base ($0.013 USD por token) para mitigar las comisiones de las tiendas de aplicaciones.

### Matriz de Conversión Económica
| Cantidad de Tokens | Valor Nominal Neto ($) | Precio de Venta Web ($) | Precio In-App App Store/Google Play ($) |
| :--- | :--- | :--- | :--- |
| **5** | $0.05 | $0.05 | $0.07 |
| **10** | $0.10 | $0.10 | $0.13 |
| **15** | $0.15 | $0.15 | $0.20 |
| **20** | $0.20 | $0.20 | $0.26 |
| **25** | $0.25 | $0.25 | $0.33 |
| **30** | $0.30 | $0.31 | $0.40 |

---

## 2. Reglas de Validación de Negocio (Backend Cómputo)

```python
# Pseudo-código de validación para el Agente / Desarrollador

def validar_paquete_monetizacion(cantidad_tokens: int) -> bool:
    """
    Regla Algorítmica: El paquete debe pertenecer a la progresión aritmética
    estipulada (Múltiplos de 5 o unidades mínimas permitidas).
    """
    if cantidad_tokens < 1:
        return False
    if cantidad_tokens == 1:
        return True
    return (cantidad_tokens % 5 == 0)

def calcular_precio_venta(cantidad_tokens: int, canal_venta: str) -> float:
    """
    Calcula el costo final aplicando los coeficientes de comisión de pasarelas.
    """
    VALOR_BASE_TOKEN = 0.010
    COMISION_IN_APP = 1.30  # +30% Apple/Google
    
    if canal_venta == "web":
        # Ajuste por redondeo a favor de pasarela de pago estándar
        return round(cantidad_tokens * VALOR_BASE_TOKEN, 2) if cantidad_tokens != 30 else 0.31
    elif canal_venta == "in-app":
        return round((cantidad_tokens * VALOR_BASE_TOKEN) * COMISION_IN_APP, 2)
    else:
        raise ValueError("Canal de venta no parametrizado.")
```

---

## 3. Modelo de Distribución: Split de Ingresos (Comisión de Plataforma)
Para garantizar la sustentabilidad del ecosistema de la app, se aplica una regla de división proporcional del 50/50 sobre el valor base cuando los tokens se liquidan o retiran.

1. **Usuario A comprá tokens:** Paga el precio público con recargo incluido según el canal.
2. **Usuario A transfiere tokens a Usuario B (Gasto interno):** Se transfieren las unidades nominales intactas.
3. **Usuario B retira el dinero (Liquidación):** El sistema convierte los tokens a dinero real utilizando el **Valor de Liquidación** ($0.005 USD por token), reteniendo automáticamente el 50% de comisión operativa.

---

## 4. Estructura de Base de Datos Sugerida (Esquema SQL)

```sql
-- Tabla para registrar el catálogo de paquetes de tokens permitidos
CREATE TABLE paquetes_moneda (
    id SERIAL PRIMARY KEY,
    cantidad_tokens INT NOT NULL CHECK (cantidad_tokens = 1 OR cantidad_tokens % 5 = 0),
    precio_web DECIMAL(10,2) NOT NULL,
    precio_in_app DECIMAL(10,2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de transacciones monetarias para auditoría estricta
CREATE TABLE transacciones_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_transaccion VARCHAR(20) NOT NULL, -- 'COMPRA', 'TRANSFERENCIA_IN', 'TRANSFERENCIA_OUT', 'RETIRO'
    cantidad_tokens INT NOT NULL,
    monto_dinero_real DECIMAL(10,2),
    canal VARCHAR(10), -- 'web', 'ios', 'android'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```