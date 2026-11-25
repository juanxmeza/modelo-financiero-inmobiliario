# Flujo de caja, indicadores, recaudo y ritmo de ventas

Reglas que aplica `calcModel()` en `index.html`. Las del crédito están en `credito-constructor.md`.

## Flujo de caja del inversionista

`flujoNeto` es el flujo apalancado después de impuestos, mes a mes:

```
+ recaudo de compradores (separación, cuotas iniciales, saldo)
+ desembolsos del crédito constructor
− egresos operativos (terreno, obra, indirectos, comisiones, administración)
− servicio del crédito: intereses por trimestre vencido; principal en el mes de la entrega
− impuesto de renta, en el último mes
```

La suma del flujo es la utilidad neta del estado de resultados; hay una prueba que lo exige.

## Indicadores derivados del flujo

- **VPN:** valor presente del flujo, con cada mes descontado a fin de mes a `tasa anual / 12`. La tasa del control es nominal: 12 % equivale a 12,68 % efectivo anual, que es la cifra comparable con la TIR.
- **Pico de equity:** déficit máximo del flujo acumulado. La serie mensual de equity es ese déficit mes a mes.
- **TIR del inversionista:** tasa interna de retorno del flujo mensual, anualizada como `(1 + tasa mensual)^12 − 1`. **Solo se muestra cuando es única.** El modelo guarda también la raíz mensual (`tirMes`), porque la anualización pierde precisión cerca de −100 %; la interfaz muestra «< −99,9 %» en esos casos, para no confundirlos con la pérdida total. Estados (`tirEstado`):
  - `ok`: una sola tasa relevante; es la que se muestra.
  - `multiple`: más de una tasa relevante; no se muestra ninguna («n/d») y una alerta remite al VPN. En proyectos con pérdida alguna de esas tasas puede ser positiva e incluso superar la meta, por lo que elegir una sería engañoso.
  - `sin_recuperacion`: no hay ningún ingreso neto; −100 %.
  - `sin_inversion`: no hay ningún mes negativo; «n/d». Ocurre con combinaciones extremas de precio alto y costos bajos, cuando el recaudo del primer mes supera la compra del terreno.
  - `sin_raiz`: no se encontró ninguna tasa relevante en el rango de búsqueda; «n/d». No prueba que no exista una fuera de él.
  - **Tasas relevantes:** con utilidad positiva, solo las positivas. El impuesto del último mes crea una raíz a tasa muy negativa en casi todo proyecto rentable; no cambia ninguna decisión con tasas de descuento ≥ 0 y se ignora. Con pérdida cuentan todas, positivas y negativas.
  - **Rango y resolución:** de −99,9 % a +900 % mensual. La malla tiene paso de 0,05 puntos entre −30 % y +50 % mensual y es más gruesa fuera de esa banda (hasta 4,7 puntos en el extremo superior, y unos 0,7 justo por debajo de −30 %). No se detectan raíces tangentes ni dos raíces dentro de una misma celda; en ese caso puede mostrarse una tasa que no es única.
- **Monte Carlo:** informa cuántas iteraciones tienen TIR única, pérdida total, varias tasas o ninguna. Solo las dos primeras entran en media, percentiles, histograma y tornado de la TIR. El tornado ordena por la tasa mensual. `P(TIR ≥ hurdle)` se calcula sobre el total de iteraciones: una sin TIR única cuenta como «no supera la meta». El VPN usa todas las iteraciones con VPN válido. Los rangos de cada variable no pueden superar diez veces el tope de su control.
- **Payback:** primer mes desde el cual el flujo acumulado ya no vuelve a ser negativo. Un cruce que después se revierte no cuenta.
- **MOIC:** `(pico de equity + utilidad neta) / pico de equity`. Referencia; la TIR no se deriva de él.

## Waterfall LP/GP

Se reparte la caja total que vuelve a los socios (pico de equity + utilidad neta), en este orden: capital LP, capital GP, retorno preferido LP (hurdle compuesto sobre todo el horizonte) y el resto según el split.

Limitación: la rentabilidad de LP y GP es la anualización del múltiplo sobre todo el horizonte (`múltiplo^(1/años) − 1`). No es una TIR y no es comparable con la del inversionista; la interfaz lo dice junto a las cifras.

La alerta sobre el retorno preferido compara lo que el LP recibe en el reparto con el hurdle compuesto. No se deduce de la TIR del proyecto: un proyecto puede superar la meta y no cubrir la preferencia, o al revés. Las etiquetas de la pestaña de escenarios solo comparan la TIR del proyecto con la meta.

## Supuestos

- **Impuesto:** se paga completo en el último mes del horizonte. Simplificación de prefactibilidad; no reproduce anticipos ni el calendario fiscal.
- **Gastos comerciales:** proporcionales a las unidades vendidas, en el mes de la venta.
- **Gastos administrativos:** fijos. El porcentaje se aplica a las ventas totales potenciales y se reparte por igual entre todos los meses, se venda o no.
- **Unidades sin vender** al final del horizonte: valen cero. La interfaz lo avisa.

## Horizonte

El horizonte siempre contiene el mes de la entrega. Si la «duración total» indicada es menor que `preventa + obra + 1`, el modelo se calcula hasta el mes de la entrega y muestra una alerta.

## Recaudo

- Separación: en el mes de la venta.
- Cuota inicial: en cuotas iguales desde `mes de venta + inicio de cuotas` hasta el último mes de obra. Si ya no caben cuotas, se cobra junto con el saldo.
- Saldo: en el mes de la entrega. Las unidades vendidas después de la entrega pagan el saldo en el mes de la venta.

Todo lo vendido se cobra completo: ingresos totales = ingreso potencial × % vendido.

## Ritmo de ventas

El «ritmo pico» es el porcentaje máximo de unidades que se vende en un mes; cada curva reparte las ventas mensuales por debajo de ese máximo. La curva no se normaliza a 100 %: si el ritmo no alcanza, el proyecto no se vende completo dentro del horizonte. Valor por defecto: 12 %.

## Monte Carlo

- El retraso de ventas se redondea a meses enteros y debe estar dentro del rango del control (0 a 12). Ninguna variable admite mínimos negativos.
- El tornado usa correlación de Spearman con rangos promedio en empates. Si una variable no varía en la muestra, se indica «sin variación» en vez de un coeficiente.
