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
  const { m } = correr(M, inpRepro({ retraso: 0, peq: 0.40 }));
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
  const inp = inpRepro({ retraso: 8 });
  const { m, fin } = correr(M, inp);
  assert.ok(Math.abs(m.vAcum - 0.5) < 1e-9);
  assert.ok(Math.abs(m.gCV - fin.gC * 0.5) < 1 && Math.abs(m.gAV - fin.gA * 0.5) < 1);
});
