// Pruebas de regresión del crédito constructor.
// Ejecutar:  node --test tests/*.test.js
// Los meses de los comentarios son los que ve el usuario (1..N); el código usa índices (0..N-1).
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarModelo, inpBase, inpRepro, correr } = require('./cargar-modelo.js');

const M = cargarModelo();
const suma = a => a.reduce((x, y) => x + y, 0);
const mesesCon = a => a.map((v, i) => (v > 0 ? i + 1 : 0)).filter(Boolean);

function assertSinCredito({ m, prog, fin }, inp) {
  assert.equal(m.mesAp, -1, 'no debe existir apertura elegible');
  assert.equal(m.montoDesemb, 0, 'principal desembolsado');
  assert.equal(m.tramosEmit, 0);
  assert.ok(m.desemb.every(v => v === 0), 'desembolsos mensuales');
  assert.ok(m.desAcum.every(v => v === 0), 'desembolso acumulado (gráfico de fuentes)');
  assert.ok(m.saldoCred.every(v => v === 0), 'saldo (gráfico de saldo)');
  assert.ok(m.intMes.every(v => v === 0), 'intereses mensuales');
  assert.equal(m.totalInt, 0, 'intereses totales');
  assert.equal(m.saldoFinal, 0, 'repago');
  assert.ok(m.montoCred > 0, 'el cupo teórico se sigue informando aparte');
  assert.equal(m.cupoNoDes, m.montoCred);
  // Sin crédito, los egresos del flujo no pueden contener ningún movimiento de deuda:
  // solo terreno, costos de obra ejecutados dentro del horizonte y gastos sobre lo vendido.
  const k = (Math.min(m.finObra, m.N) - inp.dprev) / inp.dobra;
  const egSinDeuda = prog.cT + (fin.cC + fin.cI) * k + (fin.gC + fin.gA) * m.vAcum;
  assert.ok(Math.abs(suma(m.egMes) - m.impM - egSinDeuda) < 1, 'egresos sin intereses ni repago');
  assert.ok(m.pagoCred.every(v => v === 0), 'pago del crédito');
}

test('retraso 6 meses, umbral 90 %: el umbral llega en el mes 12, después de la obra → sin desembolsos', () => {
  const inp = inpRepro({ retraso: 6 }), r = correr(M, inp), m = r.m;
  assert.equal(m.finObra, 9);
  assert.equal(m.mesUmbral + 1, 12);
  assert.equal(m.credEstado, 'tardio');
  assertSinCredito(r, inp);
});

test('retraso 8 meses, umbral 90 %: ventas terminan en 50 % → umbral no alcanzado, sin desembolsos', () => {
  const inp = inpRepro({ retraso: 8 }), r = correr(M, inp), m = r.m;
  assert.ok(Math.abs(m.vAcum - 0.5) < 1e-9);
  assert.equal(m.mesUmbral, -1);
  assert.equal(m.credEstado, 'no_alcanzado');
  assertSinCredito(r, inp);
});

test('control válido (sin retraso, umbral 40 %): tres tramos iguales en los meses 7, 8 y 9', () => {
  const { m } = correr(M, inpRepro({ retraso: 0, peq: 0.40 }));
  assert.equal(m.credEstado, 'abierto');
  assert.equal(m.mesUmbral + 1, 7);
  assert.equal(m.mesAp + 1, 7);
  assert.deepEqual(mesesCon(m.desemb), [7, 8, 9]);
  for (const mes of [7, 8, 9]) assert.ok(Math.abs(m.desemb[mes - 1] - m.montoCred / 3) < 1);
  assert.ok(Math.abs(m.montoDesemb - m.montoCred) < 1);
  assert.ok(m.cupoNoDes < 1);
  assert.ok(m.totalInt > 0 && m.saldoFinal > 0);
});

test('control tal como está escrito en el informe (retraso 6, umbral 40 %): el umbral llega en el mes 11 → sin desembolsos', () => {
  // El informe atribuye a este caso desembolsos en 7, 8 y 9. Con retraso 6 las ventas empiezan
  // en el mes 10, así que el 40 % no puede cumplirse antes del fin de obra (mes 9).
  const inp = inpRepro({ retraso: 6, peq: 0.40 }), r = correr(M, inp), m = r.m;
  assert.equal(m.mesUmbral + 1, 11);
  assert.equal(m.credEstado, 'tardio');
  assertSinCredito(r, inp);
});

test('umbral alcanzado en el último mes de obra: un solo tramo, sin concentrar el remanente', () => {
  const { m } = correr(M, inpRepro({ retraso: 2, peq: 0.40 }));
  assert.equal(m.mesUmbral + 1, 9, 'umbral en el último mes de obra');
  assert.equal(m.credEstado, 'abierto');
  assert.deepEqual(mesesCon(m.desemb), [9]);
  assert.equal(m.tramosEmit, 1);
  assert.ok(Math.abs(m.desemb[8] - m.montoCred / 3) < 1, 'solo un tramo, no el cupo completo');
  assert.ok(Math.abs(m.cupoNoDes - m.montoCred * 2 / 3) < 1, 'dos tercios del cupo quedan sin desembolsar');
});

test('invariantes en una malla de supuestos (los mismos que recorre Monte Carlo)', () => {
  let n = 0, abiertos = 0, tardios = 0, nunca = 0;
  for (const curva of ['s', 'rapida', 'lenta', 'lineal']) {
    M.setCurva(curva);
    for (const [dtotal, dprev, dobra] of [[12, 3, 6], [30, 4, 18], [24, 0, 24], [18, 6, 20], [60, 12, 48]])
    for (const retraso of [0, 1, 3, 6, 8, 12])
    for (const peq of [0.40, 0.65, 0.90])
    for (const tramos of [3, 10, 20])
    for (const rpico of [0.02, 0.08, 0.15]) {
      const inp = inpBase({ dtotal, dprev, dobra, retraso, peq, tramos, rpico });
      const r = correr(M, inp), m = r.m;
      const N = inp.dtotal, ultObra = Math.min(dprev + dobra, N) - 1;
      const ctx = JSON.stringify({ curva, dtotal, dprev, dobra, retraso, peq, tramos, rpico });
      n++;
      // mes real del umbral, recalculado de forma independiente
      let ac = 0, umbral = -1;
      for (let i = 0; i < N; i++) { ac += m.unidMes[i]; if (ac >= peq - 1e-9) { umbral = i; break; } }
      assert.equal(m.mesUmbral, umbral, ctx);
      const esperado = umbral < 0 ? 'no_alcanzado' : umbral > ultObra ? 'tardio' : 'abierto';
      assert.equal(m.credEstado, esperado, ctx);
      if (esperado !== 'abierto') { assertSinCredito(r, inp); esperado === 'tardio' ? tardios++ : nunca++; continue; }
      abiertos++;
      assert.equal(m.mesAp, Math.max(umbral, dprev), ctx);
      m.desemb.forEach((d, i) => {
        if (d === 0) return;
        assert.ok(i >= umbral, 'desembolso antes del umbral: ' + ctx);
        assert.ok(i >= dprev && i <= ultObra, 'desembolso fuera de la ventana de obra: ' + ctx);
        assert.ok(d <= m.montoCred / tramos + 1, 'tramo mayor al nominal (remanente concentrado): ' + ctx);
      });
      assert.ok(m.montoDesemb <= m.montoCred + 1, ctx);
      assert.ok(Math.abs(m.montoDesemb + m.cupoNoDes - m.montoCred) < 1, ctx);
      assert.ok(Math.abs(m.montoDesemb - m.tramosEmit * m.montoCred / tramos) < 1, ctx);
      assert.ok(Math.abs(m.desAcum[N - 1] - m.montoDesemb) < 1, ctx);
    }
  }
  M.setCurva('rapida');
  assert.ok(abiertos > 100 && tardios > 100 && nunca > 100, `malla poco representativa: ${n} casos, ${abiertos}/${tardios}/${nunca}`);
});

test('ventas acumuladas iguales al umbral salvo error de coma flotante cuentan como umbral cumplido', () => {
  // Curva lineal: el acumulado llega a 0,39999999999999986 y la interfaz muestra 40,0 %.
  M.setCurva('lineal');
  const { m } = correr(M, inpBase({ retraso: 6, peq: 0.40, tramos: 3 }));
  M.setCurva('rapida');
  assert.equal(m.mesUmbral + 1, 18);
  assert.deepEqual(mesesCon(m.desemb), [18, 19, 20]);
});

test('los intereses siguen la misma tasa y fórmula sobre el saldo vigente', () => {
  const inp = inpBase();
  const { m } = correr(M, inp);
  let saldo = 0;
  for (let i = 0; i < inp.dtotal; i++) {
    saldo += m.desemb[i];
    const int = saldo * inp.tcred / 12;
    assert.ok(Math.abs(m.intMes[i] - int) < 1e-6, 'mes ' + (i + 1));
    saldo += int;
    if (i === m.finObra) saldo = 0;
  }
});

test('avisos, indicadores y Monte Carlo dependen del estado calculado, no de una segunda regla', () => {
  const js = M.html.slice(M.html.indexOf('<script>\n// ── Moneda'));
  assert.ok(!/vAcum\s*(>=|<)\s*inp\.peq/.test(js), 'ningún render debe decidir la apertura comparando vAcum con el PEQ');
  assert.ok(!js.includes('100% con equity'), 'no afirmar financiación 100 % con equity');
  assert.ok(!/mesAp\s*=\s*finObra/.test(js), 'no sustituir «no alcanzado» por fin de obra');
  // Monte Carlo y escenarios/sensibilidad llaman al mismo calcModel (una sola definición).
  assert.equal(js.match(/function calcModel\(/g).length, 1);
  assert.match(js, /function salidasDe\(inp\)\{[^}]*calcModel\(inp,prog,fin\)/);
});

test('Monte Carlo redondea el retraso a meses enteros (un retraso fraccionario rompe el modelo mensual)', () => {
  const { m } = correr(M, inpBase({ retraso: 1.4 }));
  assert.ok(Number.isNaN(m.vAcum), 'si esto deja de ser NaN, el redondeo en Monte Carlo puede revisarse');
  assert.match(M.html, /key:'retraso'[^}]*entero:true/);
  assert.match(M.html, /if\(act\[j\]\.entero\) v=Math\.round\(v\)/);
});
