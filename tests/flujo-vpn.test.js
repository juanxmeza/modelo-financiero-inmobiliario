// Pruebas del flujo de caja del inversionista y del VPN.
// Ejecutar:  node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarModelo, inpBase, inpRepro, correr } = require('./cargar-modelo.js');

const M = cargarModelo();
const suma = a => a.reduce((x, y) => x + y, 0);

test('el flujo neto suma exactamente la utilidad neta (ni deuda fantasma ni intereses dobles)', () => {
  let n = 0;
  for (const curva of ['s', 'rapida', 'lenta', 'lineal']) {
    M.setCurva(curva);
    for (const [dtotal, dprev, dobra] of [[12, 3, 6], [30, 4, 18], [24, 0, 20], [60, 12, 36]])
    for (const retraso of [0, 3, 8])
    for (const peq of [0.40, 0.65, 0.90])
    for (const tramos of [3, 10, 20])
    for (const rpico of [0.03, 0.08, 0.20]) {
      const { m } = correr(M, inpBase({ dtotal, dprev, dobra, retraso, peq, tramos, rpico }));
      const ctx = JSON.stringify({ curva, dtotal, dprev, dobra, retraso, peq, tramos, rpico });
      assert.ok(Math.abs(suma(m.flujoNeto) - m.uN) < 1, ctx);
      assert.ok(Math.abs(suma(m.pagoCred) - (m.montoDesemb + m.totalInt)) < 1, 'se paga principal + intereses, una sola vez: ' + ctx);
      n++;
    }
  }
  M.setCurva('rapida');
  assert.ok(n > 1000);
});

test('los desembolsos entran al flujo y los intereses no se restan mes a mes', () => {
  const { m } = correr(M, inpRepro({ retraso: 0, rpico: 0.20, peq: 0.40 }));
  for (const mes of [7, 8, 9]) {
    const i = mes - 1;
    assert.ok(m.desemb[i] > 0 && m.intMes[i] > 0);
    assert.ok(Math.abs(m.flujoNeto[i] - (m.ingTotalMes[i] + m.desemb[i] - m.egOper[i])) < 1, 'mes ' + mes);
  }
  // el crédito se cancela en el mes de la entrega (mes 10) con principal + intereses
  assert.equal(m.mesPago + 1, 10);
  assert.ok(Math.abs(m.pagoCred[9] - (m.montoDesemb + m.totalInt)) < 1);
  assert.ok(m.saldoCred.slice(9).every(v => v === 0));
});

test('VPN: a tasa 0 % es la utilidad neta; no se antepone el pico de equity', () => {
  const inp = inpBase();
  const { m } = correr(M, inp);
  assert.ok(Math.abs(M.calcVPNeq(m, 0) - m.uN) < 1);
  // proyecto con utilidad positiva y flujo convencional: el VPN no puede ser peor que −(déficit máximo)
  assert.ok(M.calcVPNeq(m, inp.tvpn) > -Math.max(...m.flujoAcum.map(v => -v)));
  assert.ok(!/calcVPN\(\[-m2?\.eqInv/.test(M.html), 'ningún VPN debe anteponer −eqInv al flujo');
});

test('estado de resultados: gastos comerciales y administrativos solo sobre lo vendido', () => {
  const { m, fin } = correr(M, inpBase());   // ritmo 8 %: no se vende todo
  assert.ok(m.vAcum > 0.5 && m.vAcum < 0.9);
  assert.ok(Math.abs(m.gCV - fin.gC * m.vAcum) < 1 && Math.abs(m.gAV - fin.gA * m.vAcum) < 1);
});

test('recaudo: lo vendido se cobra completo (separación + cuota inicial + saldo), sin perder la cuota inicial', () => {
  for (const curva of ['s', 'rapida', 'lenta', 'lineal']) {
    M.setCurva(curva);
    for (const retraso of [0, 3, 6, 8, 12]) for (const mesci of [1, 3, 6]) for (const base of [inpBase, inpRepro]) {
      const inp = base({ retraso, mesci });
      const { m, fin } = correr(M, inp);
      assert.ok(Math.abs(m.ingTot - fin.ingT * m.vAcum) < 1, JSON.stringify({ curva, retraso, mesci, dtotal: inp.dtotal }));
    }
  }
  M.setCurva('rapida');
});

test('recaudo: ninguna unidad paga antes de venderse', () => {
  const { m } = correr(M, inpRepro({ retraso: 6 }));   // ventas en los meses 10, 11 y 12; entrega en el mes 10
  let cobrado = 0, vendido = 0;
  for (let i = 0; i < m.N; i++) {
    cobrado += m.ingTotalMes[i]; vendido += m.unidMes[i];
    assert.ok(cobrado <= m.ingTot / m.vAcum * vendido + 1, 'mes ' + (i + 1));
  }
});

test('ritmo pico: es el máximo mensual de ventas y cambia el resultado', () => {
  const venta = rp => correr(M, inpBase({ rpico: rp })).m;
  const a = venta(0.04), b = venta(0.08), c = venta(0.15);
  assert.ok(Math.abs(Math.max(...b.unidMes) - 0.08) < 1e-9, 'el mes pico vende exactamente el ritmo pico');
  assert.ok(a.vAcum < b.vAcum && b.vAcum < c.vAcum, 'más ritmo, más unidades vendidas en el horizonte');
  assert.ok(Math.abs(c.vAcum - 1) < 1e-9, 'nunca se vende más del 100 %');
  assert.ok(a.uN < b.uN && b.uN < c.uN);
  for (const m of [a, b, c]) assert.ok(m.unidMes.every(u => u >= 0 && u <= 0.5));
});

test('sensibilidad: las filas de ritmo recalculan el modelo con otro ritmo pico', () => {
  assert.match(M.html, /rpico: inp\.rpico \* \(1 \+ r\)/);
});
