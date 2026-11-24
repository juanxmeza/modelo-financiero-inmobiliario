// Pruebas del flujo de caja del inversionista y del VPN.
// Ejecutar:  node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarModelo, inpBase, inpRepro, correr } = require('./cargar-modelo.js');

const M = cargarModelo();
const suma = a => a.reduce((x, y) => x + y, 0);

test('el flujo neto suma exactamente la utilidad neta (ni deuda fantasma ni intereses dobles) y todo lo vendido se cobra', () => {
  let n = 0;
  for (const curva of ['s', 'rapida', 'lenta', 'lineal']) {
    M.setCurva(curva);
    for (const [dtotal, dprev, dobra] of [[12, 3, 6], [30, 4, 18], [24, 0, 20], [60, 12, 36], [12, 0, 18], [12, 6, 6], [24, 12, 48]])
    for (const retraso of [0, 3, 8])
    for (const peq of [0.40, 0.65, 0.90])
    for (const pfinc of [0.40, 0.70, 0.90])
    for (const rpico of [0.03, 0.08, 0.20]) {
      const { m, fin } = correr(M, inpBase({ dtotal, dprev, dobra, retraso, peq, pfinc, rpico }));
      const ctx = JSON.stringify({ curva, dtotal, dprev, dobra, retraso, peq, pfinc, rpico });
      assert.ok(Math.abs(suma(m.flujoNeto) - m.uN) < 1, ctx);
      assert.ok(Math.abs(m.ingTot - fin.ingT * m.vAcum) < 1, 'todo lo vendido se cobra: ' + ctx);
      assert.ok(Math.abs(suma(m.pagoCred) - (m.montoDesemb + m.totalInt)) < 1, 'servicio del crédito = principal + intereses: ' + ctx);
      n++;
    }
  }
  M.setCurva('rapida');
  assert.ok(n > 2000);
});

test('los desembolsos entran al flujo y los intereses salen cada mes', () => {
  const { m } = correr(M, inpRepro({ retraso: 0, rpico: 0.20, peq: 0.40 }));
  for (const mes of [7, 8, 9]) {
    const i = mes - 1;
    assert.ok(m.desemb[i] > 0 && m.intMes[i] > 0);
    assert.ok(Math.abs(m.flujoNeto[i] - (m.ingTotalMes[i] + m.desemb[i] - m.egOper[i] - m.intMes[i])) < 1, 'mes ' + mes);
  }
  // el principal se cancela en el mes de la entrega (mes 10)
  assert.equal(m.mesPago + 1, 10);
  assert.ok(Math.abs(m.pagoCred[9] - (m.montoDesemb + m.intMes[9])) < 1);
  assert.ok(m.saldoCred.slice(9).every(v => v === 0));
});

test('VPN: a tasa 0 % es la utilidad neta; no se antepone el pico de equity', () => {
  const inp = inpBase();
  const { m } = correr(M, inp);
  assert.ok(Math.abs(M.calcVPNeq(m, 0) - m.uN) < 1);
  assert.ok(!/calcVPN\(\[-m2?\.eqInv/.test(M.html), 'ningún VPN debe anteponer −eqInv al flujo');
});

test('gastos: comisiones sobre lo vendido; administración fija y repartida por igual cada mes', () => {
  const inp = inpBase({ rpico: 0.08 });        // no se vende todo
  const { m, fin } = correr(M, inp);
  assert.ok(m.vAcum > 0.5 && m.vAcum < 0.9);
  assert.ok(Math.abs(m.gCV - fin.gC * m.vAcum) < 1, 'comerciales proporcionales a lo vendido');
  assert.ok(Math.abs(m.gAV - fin.gA) < 1, 'administrativos completos aunque no se venda todo');
  // un mes sin obra ni ventas ni deuda (mes 2): el único egreso es la cuota de administración
  assert.ok(Math.abs(m.egOper[1] - fin.gA / m.N) < 1);
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

test('si la duración total no incluye la entrega, el modelo se extiende hasta ese mes y lo señala', () => {
  // Hallazgo de auditoría: horizonte 12, preventa 0, obra 18 → la entrega es en el mes 19.
  const inp = inpRepro({ dprev: 0, dobra: 18, retraso: 0, peq: 0.40, rpico: 0.20 });
  const { m, fin } = correr(M, inp);
  assert.equal(m.N, 19);
  assert.equal(m.horizonteExt, true);
  assert.equal(m.mesPago + 1, 19);
  assert.equal(m.flujoNeto.length, 19);
  assert.ok(Math.abs(suma(m.flujoNeto) - m.uN) < 1, 'caja = utilidad');
  assert.ok(Math.abs(m.ingTot - fin.ingT * m.vAcum) < 1, 'recaudo completo');
  assert.ok(m.ingSal[18] > 0 && m.pagoCred[18] > m.montoDesemb, 'saldo de compradores y principal en el mes de la entrega');
  const b = correr(M, inpBase()).m;
  assert.equal(b.N, 30); assert.equal(b.horizonteExt, false);
  assert.match(M.html, /if \(m\.horizonteExt\) al\.push/);
});

test('pico de equity: es el déficit máximo del flujo acumulado del inversionista', () => {
  for (const inp of [inpBase(), inpBase({ rpico: 0.06 }), inpRepro({ retraso: 0, rpico: 0.20, peq: 0.40 })]) {
    const { m } = correr(M, inp);
    let ac = 0, peor = 0, mesPeor = 0;
    m.flujoNeto.forEach((f, i) => { ac += f; if (-ac > peor + 1e-6) { peor = -ac; mesPeor = i + 1; } });
    assert.ok(Math.abs(m.picoEq - peor) < 1);
    assert.equal(m.mesPico, mesPeor);
    assert.ok(m.equityReq.every((v, i) => Math.abs(v - Math.max(0, -m.flujoAcum[i])) < 1e-6));
  }
});

test('TIR: es la tasa interna del flujo mensual, anualizada', () => {
  // flujos conocidos: −100 hoy… se invierte 100 y se reciben 121 dos meses después → 10 % mensual
  assert.ok(Math.abs(M.calcTIR([-100, 0, 121]) - (Math.pow(1.1, 12) - 1)) < 1e-9);
  assert.ok(Math.abs(M.calcTIR([-100, 100])) < 1e-9, 'recuperar lo invertido es 0 %');
  assert.equal(M.calcTIR([-100, 0, 0]), -1, 'no recuperar nada es −100 %');
  assert.ok(M.calcTIR([-100, 0, 81]) < 0);
  // en el modelo: el VPN descontado a la TIR es cero, y el signo coincide con el de la utilidad
  for (const inp of [inpBase(), inpBase({ rpico: 0.10 }), inpBase({ rpico: 0.06 }), inpRepro({ retraso: 0, rpico: 0.20, peq: 0.40 })]) {
    const { m } = correr(M, inp);
    if (m.tir > -1) {
      const rMes = Math.pow(1 + m.tir, 1 / 12) - 1;
      const vp = m.flujoNeto.reduce((a, v, t) => a + v / Math.pow(1 + rMes, t + 1), 0);
      assert.ok(Math.abs(vp) < 1e-3 * m.picoEq, 'VPN a la TIR = 0');
    }
    assert.equal(Math.sign(m.tir), Math.sign(m.uN));
    // coherencia con el VPN: si la TIR supera la tasa de descuento, el VPN es positivo
    const tasaEfectiva = Math.pow(1 + inp.tvpn / 12, 12) - 1;
    assert.equal(m.tir > tasaEfectiva, M.calcVPNeq(m, inp.tvpn) > 0);
  }
  assert.ok(!/Math\.pow\(m2?\.MOIC/.test(M.html), 'la TIR ya no se deriva del MOIC');
});
