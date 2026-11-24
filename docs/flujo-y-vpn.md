# Flujo de caja, VPN, recaudo y ritmo de ventas

Reglas que aplica `calcModel()` en `index.html`.

## Flujo de caja del inversionista

`flujoNeto` es el flujo apalancado después de impuestos, mes a mes:

```
+ recaudo de compradores (separación, cuotas iniciales, saldo)
+ desembolsos del crédito constructor
− egresos operativos (terreno, obra, indirectos, gastos comerciales y administrativos)
− pago del crédito: principal + intereses capitalizados, una sola vez, en el mes de la entrega
− impuesto de renta, en el último mes
```

La suma del flujo es la utilidad neta del estado de resultados; hay una prueba que lo exige.

**VPN** = valor presente de ese flujo a la tasa de descuento, con cada mes descontado a fin de mes. No se antepone el pico de equity: los aportes ya están en el flujo como meses negativos.

Supuestos:

- Los intereses se capitalizan en el saldo y se pagan al cancelar el crédito. No hay pago mensual de intereses.
- El impuesto se paga completo en el último mes del horizonte.
- El crédito se cancela en el mes de la entrega (el siguiente al último mes de obra). El panel muestra ese pago real (principal + todos los intereses).

## Horizonte

El horizonte siempre contiene el mes de la entrega. Si la «duración total» indicada es menor que `preventa + obra + 1`, el modelo se calcula hasta el mes de la entrega y muestra una alerta. Truncarlo dejaría fuera costos de obra, el saldo de compradores y el pago del crédito, y la caja dejaría de cuadrar con la utilidad.

## Monte Carlo

- El retraso de ventas se redondea a meses enteros y debe estar dentro del rango del control (0 a 12). Ninguna variable admite mínimos negativos.
- El tornado usa correlación de Spearman con rangos promedio en empates. Si una variable no varía en la muestra (por ejemplo, un retraso que siempre redondea al mismo mes), se indica «sin variación» en vez de un coeficiente.

## Recaudo

- Separación: en el mes de la venta.
- Cuota inicial: en cuotas iguales desde `mes de venta + inicio de cuotas` hasta el último mes de obra. Si ya no caben cuotas, se cobra junto con el saldo.
- Saldo: en el mes de la entrega (el siguiente al último mes de obra). Las unidades vendidas después de la entrega pagan el saldo en el mes de la venta.

Todo lo vendido se cobra completo: ingresos totales = ingreso potencial × % vendido.

## Ritmo de ventas

El «ritmo pico» es el porcentaje máximo de unidades que se vende en un mes; cada curva reparte las ventas mensuales por debajo de ese máximo. La curva **no se normaliza a 100 %**: si el ritmo no alcanza, el proyecto no se vende completo dentro del horizonte.

Las unidades no vendidas al final del horizonte **no generan ingreso** (no se les asigna valor de inventario). Es un supuesto conservador pendiente de confirmar.

## Pendiente de decidir

- **Pico de equity y TIR.** El «pico de equity» se calcula como egresos acumulados − crédito − preventa (separación y cuotas), sin contar el saldo a la entrega; por eso suele quedar en el último mes y por encima del déficit máximo real del flujo. La TIR del inversionista se deriva de ese pico (`MOIC^(12/meses) − 1`), no es la tasa interna del flujo mensual.
- **Valor del inventario no vendido** al final del horizonte.
- **Valores por defecto**: con la curva Lanzamiento y ritmo pico 8 % se vende el 64 % en 30 meses y no se alcanza el umbral de 65 %.
