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

### 2026-11-24 — Segunda tanda: ritmo de ventas, preventa, crédito, gastos, duraciones y reparto (Juan)

Juan pidió corregir «todas, absolutamente todas» las fallas encontradas al probar.

| Tema | Qué se decidió | Qué se descartó o cómo estaba |
|---|---|---|
| Ritmo de ventas | El «ritmo pico» es el % real de unidades vendidas por mes; puede quedar inventario sin vender. Valor inicial 12,5 % para que el ejemplo venda todo. (Decisión de Juan.) | Antes las ventas se reescalaban siempre al 100 % y el control no tenía efecto. Descartado: dejar el 100 % fijo y quitar la fila de ritmo; y dejar el inicial en 8 % (vendería 64 %). |
| Inicio de la preventa | Las ventas arrancan el mes 1 más el retraso. | Antes arrancaban al iniciar la obra, así que la «preventa antes de obra» no vendía nada. **Revisar si esa era la intención.** |
| Ventas tardías | Lo vendido después de la entrega se cobra completo ese mes. Si no queda obra para cuotas, la cuota inicial se cobra con el saldo. | Antes esa cuota inicial se perdía y el saldo se anotaba en un mes anterior a la venta. |
| Crédito constructor | Solo abre si el punto de equilibrio se alcanza antes de terminar la obra. | Antes se desembolsaba completo aunque no se alcanzara. |
| Gastos comerciales y administrativos | Sobre lo vendido, tanto en el estado de resultados como en el flujo. | Antes el estado de resultados los cobraba completos. |
| Duraciones | La duración total sube sola hasta preventa + obra + 1 mes. | Antes se podía terminar la obra después del horizonte y el modelo no cuadraba. |
| Sensibilidad | La fila de «ritmo» ahora sí cambia el ritmo. | Antes todas las filas daban lo mismo. |
| Reparto LP/GP | Mes a mes: los socios aportan cuando falta caja (total = equity pico) y se reparte solo la caja que no hará falta después. Orden: capital LP, capital GP, preferido LP, split. TIR LP y GP reales, de sus propios flujos. | Antes se repartía solo la utilidad, sin devolver capital, y las TIR salían negativas. |

Comprobado con 20.000 combinaciones al azar: flujo = utilidad neta, ingresos = lo vendido, crédito = desembolsos, y aportes y repartos de socios cuadran con el equity pico y la utilidad.

No incluido (límites conocidos del modelo): el inventario sin vender no tiene valor; no hay IVA, retenciones ni capital de trabajo; el impuesto se paga todo al final.

### 2026-11-24 — Tercera tanda (Juan: «Sí, corrígelas»)

| Tema | Qué se hizo | Cómo estaba / qué se descartó |
|---|---|---|
| Retraso con decimales | El retraso se redondea a meses enteros dentro del cálculo. | Monte Carlo sorteaba retrasos con decimales y todas esas corridas daban error (0 válidas). |
| Control «Equity GP+LP (% costo total)» | Se quitó. | Ningún cálculo lo usaba; el equity sale del faltante de caja. Descartado: darle un uso, porque cambiaría el método. |
| Gráfica de financiamiento | La línea «Preventa acumulada (sep + CI)» ahora suma solo separaciones y cuotas. | Sumaba también los saldos a la entrega. |
| Gráfica de flujo en USD | Las barras de egresos usan la misma escala que las demás. | En USD salían en miles de pesos, no en miles de dólares. |
