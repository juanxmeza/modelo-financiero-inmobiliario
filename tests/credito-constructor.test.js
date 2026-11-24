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
  assert.equal(m.giroApertura, 0);
  assert.ok(m.desemb.every(v => v === 0), 'desembolsos mensuales');
  assert.ok(m.desAcum.every(v => v === 0), 'desembolso acumulado (gráfico de fuentes)');
  assert.ok(m.saldoCred.every(v => v === 0), 'saldo (gráfico de saldo)');
  assert.ok(m.intMes.every(v => v === 0), 'intereses mensuales');
  assert.equal(m.totalInt, 0, 'intereses totales');
  assert.ok(m.pagoCred.every(v => v === 0), 'servicio del crédito');
  assert.ok(m.montoCred > 0, 'el cupo teórico se sigue informando aparte');
  // Sin crédito, los egresos no pueden contener ningún movimiento de deuda:
  // solo terreno, obra, administración fija y comisiones sobre lo vendido.
  const egSinDeuda = prog.cT + fin.cC + fin.cI + fin.gA + fin.gC * m.vAcum;
  assert.ok(Math.abs(suma(m.egMes) - m.impM - egSinDeuda) < 1, 'egresos sin intereses ni repago');
}

// Escenario base de las pruebas: Lanzamiento, 12 meses, 3 de preventa, 6 de obra (meses 4 a 9),
// ritmo pico 20 % en el mes 4, umbral 40 %, 60 % del costo directo financiado.
// Ventas mensuales desde el inicio: 5 %, 10 %, 15 %, 20 %, 20 %, 16,4 %… (acumulado 5, 15, 30, 50, 70…).
const esc = over => inpRepro(Object.assign({ rpico: 0.20, peq: 0.40 }, over));

test('control (sin retraso): umbral en el mes 7 → giro de apertura por la obra ejecutada y luego mes a mes', () => {
  const { m, fin } = correr(M, esc({ retraso: 0 }));
  const mensual = 0.60 * fin.cC / 6;                      // 60 % del costo directo de un mes de obra
  assert.equal(m.credEstado, 'abierto');
  assert.equal(m.mesUmbral + 1, 7);
  assert.equal(m.mesAp + 1, 7);
  assert.deepEqual(mesesCon(m.desemb), [7, 8, 9]);
  assert.ok(Math.abs(m.desemb[6] - 4 * mensual) < 1, 'apertura: obra de los meses 4, 5, 6 y 7');
  assert.ok(Math.abs(m.giroApertura - 4 * mensual) < 1);
  assert.ok(Math.abs(m.desemb[7] - mensual) < 1 && Math.abs(m.desemb[8] - mensual) < 1);
  assert.ok(Math.abs(m.montoDesemb - m.montoCred) < 1, 'si abre, se desembolsa el cupo completo');
});

test('retraso 3 meses: el umbral llega en el mes 10, después de la obra (mes 9) → sin desembolsos', () => {
  const inp = esc({ retraso: 3 }), r = correr(M, inp), m = r.m;
  assert.equal(m.finObra, 9);
  assert.equal(m.mesUmbral + 1, 10);
  assert.equal(m.credEstado, 'tardio');
  assertSinCredito(r, inp);
});

test('retraso 8 meses: solo se vende el 5 % → umbral no alcanzado, sin desembolsos', () => {
  const inp = esc({ retraso: 8 }), r = correr(M, inp), m = r.m;
  assert.ok(Math.abs(m.vAcum - 0.05) < 1e-9);
  assert.equal(m.mesUmbral, -1);
  assert.equal(m.credEstado, 'no_alcanzado');
  assertSinCredito(r, inp);
});

test('retraso 2 meses: umbral en el último mes de obra → un solo giro por toda la obra ejecutada', () => {
  const { m } = correr(M, esc({ retraso: 2 }));
  assert.equal(m.mesUmbral + 1, 9, 'umbral en el último mes de obra');
  assert.equal(m.credEstado, 'abierto');
  assert.deepEqual(mesesCon(m.desemb), [9]);
  assert.ok(Math.abs(m.desemb[8] - m.montoCred) < 1, 'toda la obra está ejecutada: se gira el cupo');
});

test('casos del informe original (ritmo 15 %, retraso 6 u 8, umbral 90 % o 40 %): ninguno abre el crédito', () => {
  // En el código original los tres recibían el cupo completo en el mes 9.
  for (const over of [{ retraso: 6 }, { retraso: 8 }, { retraso: 6, peq: 0.40 }]) {
    const inp = inpRepro(over), r = correr(M, inp);
    assert.notEqual(r.m.credEstado, 'abierto', JSON.stringify(over));
    assertSinCredito(r, inp);
  }
});

test('invariantes en una malla de supuestos (los mismos que recorre Monte Carlo)', () => {
  let n = 0, abiertos = 0, tardios = 0, nunca = 0;
  for (const curva of ['s', 'rapida', 'lenta', 'lineal']) {
    M.setCurva(curva);
    for (const [dtotal, dprev, dobra] of [[12, 3, 6], [30, 4, 18], [24, 0, 24], [18, 6, 20], [60, 12, 48]])
    for (const retraso of [0, 1, 3, 6, 8, 12])
    for (const peq of [0.40, 0.65, 0.90])
    for (const pfinc of [0.40, 0.70, 0.90])
    for (const rpico of [0.02, 0.08, 0.15]) {
      const inp = inpBase({ dtotal, dprev, dobra, retraso, peq, pfinc, rpico });
      const r = correr(M, inp), m = r.m;
      const N = m.N, ultObra = dprev + dobra - 1;
      const ctx = JSON.stringify({ curva, dtotal, dprev, dobra, retraso, peq, pfinc, rpico });
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
      // el acumulado desembolsado nunca supera el % financiado de la obra ejecutada
      let ejecutado = 0, girado = 0;
      for (let i = 0; i < N; i++) {
        if (i >= dprev && i <= ultObra) ejecutado += r.fin.cC / dobra;
        girado += m.desemb[i];
        if (m.desemb[i] > 0) {
          assert.ok(i >= umbral, 'desembolso antes del umbral: ' + ctx);
          assert.ok(i >= dprev && i <= ultObra, 'desembolso fuera de la ventana de obra: ' + ctx);
        }
        assert.ok(girado <= pfinc * ejecutado + 1, 'giro por encima del avance de obra: ' + ctx);
        if (i >= m.mesAp && i <= ultObra) assert.ok(Math.abs(girado - pfinc * ejecutado) < 1, 'giro al día con el avance: ' + ctx);
      }
      assert.ok(Math.abs(m.montoDesemb - m.montoCred) < 1, ctx);
      assert.ok(Math.abs(m.desAcum[N - 1] - m.montoDesemb) < 1, ctx);
    }
  }
  M.setCurva('rapida');
  assert.ok(abiertos > 100 && tardios > 100 && nunca > 100, `malla poco representativa: ${n} casos, ${abiertos}/${tardios}/${nunca}`);
});

test('ventas acumuladas iguales al umbral salvo error de coma flotante cuentan como umbral cumplido', () => {
  // Curva lineal, ritmo 10 %: 6,5 % mensual; tras 10 meses el acumulado es 0,6499999999999999
  // y la interfaz muestra 65,0 %.
  M.setCurva('lineal');
  const { m } = correr(M, inpBase({ rpico: 0.10, peq: 0.65 }));
  M.setCurva('rapida');
  assert.equal(m.mesUmbral + 1, 14);
  assert.equal(m.mesAp + 1, 14);
});

test('intereses: se pagan cada mes sobre el principal vigente, sin capitalizar; el principal se cancela en la entrega', () => {
  const inp = inpBase();
  const { m } = correr(M, inp);
  assert.ok(m.montoDesemb > 0);
  let principal = 0;
  for (let i = 0; i < m.N; i++) {
    principal += m.desemb[i];
    const int = principal * inp.tcred / 12;
    assert.ok(Math.abs(m.intMes[i] - int) < 1e-6, 'interés del mes ' + (i + 1));
    if (i === m.mesPago) {
      assert.ok(Math.abs(m.pagoCred[i] - (int + principal)) < 1e-6, 'entrega: interés del mes + todo el principal');
      principal = 0;
    } else assert.ok(Math.abs(m.pagoCred[i] - int) < 1e-6, 'mes ' + (i + 1) + ': solo intereses');
    assert.ok(Math.abs(m.saldoCred[i] - principal) < 1e-6, 'el saldo es solo principal');
  }
  assert.equal(m.mesPago, m.finObra);
});

test('avisos, indicadores y Monte Carlo dependen del estado calculado, no de una segunda regla', () => {
  const js = M.html.slice(M.html.indexOf('<script>\n// ── Moneda'));
  assert.ok(!/vAcum\s*(>=|<)\s*inp\.peq/.test(js), 'ningún render debe decidir la apertura comparando vAcum con el PEQ');
  assert.ok(!js.includes('100% con equity'), 'no afirmar financiación 100 % con equity');
  assert.ok(!/mesAp\s*=\s*finObra/.test(js), 'no sustituir «no alcanzado» por fin de obra');
  assert.ok(!/tramos/i.test(M.html), 'el control de tramos ya no existe');
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
