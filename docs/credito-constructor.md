# Crédito constructor — reglas

Reglas que aplica `calcModel()` en `index.html`. Los meses son los que ve el usuario (1…N).

## Tres conceptos separados

| Campo del modelo | Significado |
|---|---|
| `mesUmbral` | Mes real en que las ventas acumuladas alcanzan el punto de equilibrio (PEQ). `-1` si nunca se alcanza dentro del horizonte. |
| `mesAp` | Apertura elegible: `max(mesUmbral, inicio de obra)`. Solo existe si el umbral se cumple a más tardar en el último mes de obra; si no, `-1`. |
| `montoCred` / `montoDesemb` | Cupo teórico (`% financiado × costo directo`) y monto efectivamente desembolsado. |

`credEstado` resume el resultado: `abierto`, `tardio` (umbral alcanzado después del cierre de obra) o `no_alcanzado`.

## Desembolso: contra avance de obra

1. Ningún giro ocurre antes del mes en que se cumple el umbral, ni fuera de la ventana de construcción.
2. En el mes de apertura el banco gira el % financiado del costo directo **ya ejecutado** (incluido ese mes): se pone al día.
3. Cada mes siguiente gira el % financiado del costo directo de ese mes, hasta el último mes de obra.
4. Si el crédito abre, al final de la obra se ha desembolsado el cupo completo. El acumulado girado nunca supera el % financiado de la obra ejecutada.
5. Si el estado es `tardio` o `no_alcanzado`, el crédito no existe en el flujo: principal, saldo, intereses y pagos son cero. El cupo teórico se sigue mostrando aparte.

No hay control de «tramos»: el calendario de giros lo determina el avance de la obra.

## Intereses y cancelación

- Los intereses se pagan **cada mes** sobre el principal vigente, a `tasa anual / 12`. No se capitalizan.
- El principal se cancela completo en el mes de la entrega (el siguiente al último mes de obra), con el saldo de los compradores. Ese mes también paga su interés.

## Supuestos decididos por Juan (pendientes de contrastar con un contrato real)

- Desembolso contra avance de obra con puesta al día en la apertura.
- Pago mensual de intereses.

Ambos se eligieron por criterio, no a partir de un contrato concreto. Un banco puede girar por hitos, retener un porcentaje o cobrar intereses trimestrales.

## Pruebas

```bash
node --test tests/*.test.js
```

Las pruebas cargan las funciones de cálculo directamente desde `index.html`, sin copia intermedia.
