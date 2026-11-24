# Flujo de caja, indicadores, recaudo y ritmo de ventas

Reglas que aplica `calcModel()` en `index.html`. Las del crédito están en `credito-constructor.md`.

## Flujo de caja del inversionista

`flujoNeto` es el flujo apalancado después de impuestos, mes a mes:

```
+ recaudo de compradores (separación, cuotas iniciales, saldo)
+ desembolsos del crédito constructor
− egresos operativos (terreno, obra, indirectos, comisiones, administración)
− servicio del crédito: intereses cada mes; principal en el mes de la entrega
− impuesto de renta, en el último mes
```

La suma del flujo es la utilidad neta del estado de resultados; hay una prueba que lo exige.

## Indicadores derivados del flujo

- **VPN:** valor presente del flujo a la tasa de descuento, con cada mes descontado a fin de mes. Los aportes de equity ya están en el flujo como meses negativos.
- **Pico de equity:** déficit máximo del flujo acumulado, es decir, lo máximo que los socios llegan a tener aportado sin recuperar. La serie mensual de equity es ese déficit mes a mes.
- **TIR del inversionista:** tasa interna de retorno del flujo mensual, anualizada como `(1 + tasa mensual)^12 − 1`. Es −100 % si el flujo no recupera nada.
- **MOIC:** `(pico de equity + utilidad neta) / pico de equity`. Referencia; la TIR no se deriva de él.

## Waterfall LP/GP

Se reparte la caja total que vuelve a los socios (pico de equity + utilidad neta), en este orden: capital LP, capital GP, retorno preferido LP (hurdle compuesto sobre todo el horizonte) y el resto según el split.

Limitación: la rentabilidad de LP y GP se expresa como rentabilidad anual equivalente del múltiplo sobre todo el horizonte (`múltiplo^(1/años) − 1`). No es una TIR del flujo mensual y no es comparable con la TIR del inversionista, que sí reconoce que el capital entra gradualmente y vuelve antes del final.

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
