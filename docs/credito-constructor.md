# Crédito constructor — reglas de desembolso

Reglas que aplica `calcModel()` en `index.html`. Los meses son los que ve el usuario (1…N).

## Tres conceptos separados

| Campo del modelo | Significado |
|---|---|
| `mesUmbral` | Mes real en que las ventas acumuladas alcanzan el punto de equilibrio (PEQ). `-1` si nunca se alcanza dentro del horizonte. |
| `mesAp` | Apertura elegible: `max(mesUmbral, inicio de obra)`. Solo existe si el umbral se cumple a más tardar en el último mes de obra; si no, `-1`. |
| `montoCred` / `montoDesemb` | Cupo teórico (`% financiado × costo directo`) y monto efectivamente desembolsado. `cupoNoDes` es la diferencia. |

`credEstado` resume el resultado: `abierto`, `tardio` (umbral alcanzado después del cierre de obra) o `no_alcanzado`.

## Reglas

1. Ningún desembolso ocurre antes del mes en que se cumple el umbral.
2. Ningún desembolso ocurre fuera de la ventana de construcción (del inicio de obra al último mes de obra).
3. Si el estado es `tardio` o `no_alcanzado`, el crédito no existe en el flujo: principal, saldo, intereses y repago son cero. El cupo teórico se sigue mostrando, aparte del desembolsado.
4. Los tramos son iguales (`cupo / n.º de tramos`), con un intervalo de `floor(meses disponibles / tramos)` meses y mínimo uno.

## Supuesto pendiente de confirmar por Juan

**Qué pasa con los tramos que no caben entre la apertura y el fin de obra.**

Regla implementada (la más conservadora): **no se desembolsan**. El cupo restante queda sin usar, se informa en el panel y se emite una alerta. Antes, el remanente se sumaba completo al último mes de obra.

Esto no afecta solo al caso límite. Con los supuestos por defecto (apertura en el mes 12, obra hasta el mes 22) hay 11 meses disponibles: cualquier configuración de más de 11 tramos deja cupo sin desembolsar. Con 20 tramos se desembolsa el 55 % del cupo.

Alternativas a decidir:

- **A — No desembolsar el remanente** (implementada). Subestima el crédito si el banco permite ponerse al día.
- **B — Repartir el cupo completo entre los meses disponibles** (menos tramos, más grandes). Supone que el banco desembolsa de una vez la obra ya ejecutada.
- **C — Desembolsar contra avance de obra:** en la apertura, el % financiado del costo ya ejecutado; después, el % financiado del costo de cada mes. Es lo más cercano a un desembolso contra actas de avance, pero vuelve irrelevante el control «tramos».

## Pruebas

```bash
node --test tests/*.test.js
```

Las pruebas cargan las funciones de cálculo directamente desde `index.html`, sin copia intermedia.
