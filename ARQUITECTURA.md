# Arquitectura — Modelo Financiero Inmobiliario

Evaluación financiera de proyectos inmobiliarios en un solo HTML: supuestos de ventas, preventa, costos y crédito constructor → flujo de caja mensual → TIR, VPN, escenarios y sensibilidad. Gráficas con Chart.js. Público en modelo.inicon.com.co.

**Diagrama interactivo:** [docs/arquitectura/arquitectura.html](docs/arquitectura/arquitectura.html)
(abrir con doble clic; tema claro/oscuro, vistas guiadas, exportar PNG/SVG).
**Fuente del diagrama:** [docs/arquitectura/arquitectura.architecture.json](docs/arquitectura/arquitectura.architecture.json).

## Cómo actualizarlo

El diagrama se genera con [Archify](https://github.com/tt-a1i/archify) a partir del JSON. Tras cambiar la
arquitectura, editar el JSON y regenerar:

```bash
node ~/.agents/skills/archify/bin/archify.mjs deliver architecture docs/arquitectura/arquitectura.architecture.json docs/arquitectura/arquitectura.html --quality showcase
```

Generado el 2026-09-12 con Claude Code, a partir de la lectura del código de este repositorio.

## Decisiones de método

### 2026-11-24 — Flujo de caja, equity pico, TIR y VPN (Juan)

Se encontró que el flujo de caja restaba el pago del crédito constructor sin haber sumado sus desembolsos, y que los intereses se restaban dos veces. El estado de resultados no tenía el error.

| Decisión | Qué se decidió | Qué se descartó y por qué |
|---|---|---|
| Flujo de caja | Los desembolsos del crédito entran como caja. Los intereses se capitalizan y se pagan una sola vez, con el saldo, al fin de obra. | Dejarlo como estaba: la suma del flujo no coincidía con la utilidad. |
| Equity pico | Mayor faltante acumulado del flujo de caja (cuenta crédito, preventas y saldos de venta). | Fórmula anterior (egresos − crédito − preventas, sin saldos): más conservadora, pero inflaba el capital. |
| TIR | TIR real del flujo mensual, anualizada, después de impuestos (`calcTIR`). | Fórmula anterior `MOIC^(12/meses) − 1`: supone todo el capital puesto el mes 1 y devuelto el último. |
| Impuesto de renta | Se resta en el último mes del flujo. La suma del flujo es igual a la utilidad neta. | Flujo antes de impuestos. |
| VPN | Se calcula sobre el flujo, sin restar otra vez el capital al inicio. | Fórmula anterior: restaba el equity además del flujo, que ya incluye todos los egresos. |

Pendiente, encontrado al probar y **no corregido**:
- El reparto LP/GP devuelve el capital solo con la utilidad, no con el capital más la utilidad; por eso sus TIR salen negativas en proyectos que ganan.
- La tabla de sensibilidad no aplica la variación de «ritmo»: todas las filas dan lo mismo.
- Si no se venden todas las unidades, el estado de resultados cobra los gastos comerciales y administrativos completos, y el flujo solo los de lo vendido.
- Los controles permiten que la obra termine después de la duración total; en ese caso el modelo no cuadra.
