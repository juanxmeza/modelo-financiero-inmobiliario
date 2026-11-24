// Regresiones de la segunda auditoría: estados de la TIR, fuente de pago del crédito,
// retorno preferido del LP, payback sostenido y rótulos.
// Ejecutar:  node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarModelo, inpBase, correr } = require('./cargar-modelo.js');

const M = cargarModelo();
const anual = rMes => Math.pow(1 + rMes, 12) - 1;
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

test('TIR: solo se informa una tasa que anula el valor presente, también fuera del rango habitual', () => {
  assert.ok(cerca(M.calcTIR([-100, 50]), anual(-0.5)), 'raíz en −50 % mensual (antes: −100 %)');
  assert.ok(cerca(M.calcTIR([-100, 49.9]), anual(-0.501)));
  assert.ok(cerca(M.calcTIR([-100, 1]), anual(-0.99), 1e-9));
  assert.ok(cerca(M.calcTIR([-100, 201]) / anual(1.01), 1, 1e-6), 'raíz en +101 % mensual (antes: tope de +100 %)');
  assert.ok(cerca(M.calcTIR([-100, 200]) / anual(1), 1, 1e-6));
  assert.ok(cerca(M.calcTIR([-100, 0, 121]), anual(0.1)));
  assert.ok(Math.abs(M.calcTIR([-100, 100])) < 1e-9);
});

test('TIR: estados distintos para sin recuperación, sin inversión, sin raíz y varias raíces', () => {
  assert.deepEqual(M.calcTIRinfo([-100, 0, 0]), { tir: -1, estado: 'sin_recuperacion', raices: 0 });
  const sinInv = M.calcTIRinfo([100, 50]);
  assert.equal(sinInv.tir, null); assert.equal(sinInv.estado, 'sin_inversion');
  const sinRaiz = M.calcTIRinfo([-100, 150, -100]);          // siempre negativo: no hay raíz real
  assert.equal(sinRaiz.tir, null); assert.equal(sinRaiz.estado, 'sin_raiz');
  const multi = M.calcTIRinfo([-100, 260, -165]);            // raíces en 10 % y 50 % mensual
  assert.equal(multi.estado, 'multiple'); assert.equal(multi.raices, 2);
  assert.ok(cerca(multi.tir, anual(0.1)), 'se informa la más cercana a cero');
  const tres = M.calcTIRinfo([-1, 3.062, -3.12500075, 1.06300558]);   // 1,05 %, 1,15 % y 4 % mensual
  assert.equal(tres.estado, 'multiple'); assert.equal(tres.raices, 3);
  assert.ok(cerca(tres.tir, anual(0.0105), 1e-4), 'antes devolvía la de 4 % y saltaba las dos cercanas');
  assert.equal(M.calcTIRinfo([-100, 0, 121]).estado, 'ok');
  // el impuesto del último mes crea una raíz a tasa muy negativa: no vuelve ambiguo el caso por defecto
  const d = correr(M, inpBase()).m;
  assert.equal(d.tirEstado, 'ok'); assert.ok(cerca(d.tir, 0.32579, 1e-4));
});

test('TIR: caso alcanzable con controles que antes mostraba −100 % sin haber perdido todo', () => {
  M.setCurva('lineal');
  const { m } = correr(M, inpBase({ dtotal: 12, dprev: 0, dobra: 6, retraso: 11, pv: 2000000, rpico: 0.01 }));
  M.setCurva('rapida');
  assert.ok(m.flujoNeto[11] > 0, 'hay un ingreso neto en el último mes');
  assert.ok(m.tir > -1 && m.tir < -0.99);
  const x = Math.pow(1 + m.tir, 1 / 12);
  const vp = m.flujoNeto.reduce((a, v, t) => a + v / Math.pow(x, t + 1), 0);
  const escala = m.flujoNeto.reduce((a, v, t) => a + Math.abs(v) / Math.pow(x, t + 1), 0);
  assert.ok(Math.abs(vp) < 1e-9 * escala, 'la tasa informada anula el valor presente');
  assert.equal(m.tirEstado, 'ok');
});

test('crédito: si el saldo de compradores no alcanza para el servicio de la entrega, el modelo lo cuantifica', () => {
  M.setCurva('lineal');
  const { m } = correr(M, inpBase({ dtotal: 18, dprev: 12, dobra: 24, retraso: 0, rpico: 0.05, peq: 0.65, pfinc: 0.9, pv: 4500000, pterre: 27000000, tvpn: 0.25 }));
  M.setCurva('rapida');
  assert.ok(cerca(m.faltaPago, m.pagoCred[m.mesPago] - m.ingSal[m.mesPago], 1));
  assert.ok(Math.abs(m.faltaPago / 1e6 - 6342.4418) < 0.01, 'faltante de la auditoría: 6.342,44 M');
  assert.equal(correr(M, inpBase()).m.faltaPago, 0, 'en el caso por defecto el saldo sí alcanza');
  assert.match(M.html, /el saldo de compradores no alcanza: faltan/);
  assert.match(M.html, /if \(m\.faltaPago > 1\)\s+al\.push/);
});

test('retorno preferido del LP: se evalúa en el reparto, no comparando la TIR del proyecto con el hurdle', () => {
  // TIR 14,3 % < hurdle 15 %, y aun así el LP cobra completa su preferencia.
  M.setCurva('lineal');
  let inp = inpBase({ dtotal: 12, dprev: 3, dobra: 48, retraso: 1, rpico: 0.16, peq: 0.9, pfinc: 0.4, pv: 16500000, pterre: 21000000, tvpn: 0.05 });
  let m = correr(M, inp).m, wf = M.calcWF(inp, m);
  assert.ok(m.tir < inp.hurdle && cerca(wf.pLP, wf.hAmt, 1));
  // TIR 32,4 % > hurdle, y el LP no alcanza a cobrarla.
  M.setCurva('lenta');
  inp = inpBase({ dtotal: 60, dprev: 4, dobra: 24, retraso: 1, rpico: 0.14, pfinc: 0.9, tcred: 0.25, pv: 13000000, pterre: 6500000, ga: 0.06, tvpn: 0.05 });
  m = correr(M, inp).m; wf = M.calcWF(inp, m);
  M.setCurva('rapida');
  assert.ok(m.tir > inp.hurdle && wf.pLP < wf.hAmt - 1);
  assert.ok(!M.html.includes('El LP no alcanza su retorno preferido'), 'ya no se deduce de la TIR');
  assert.ok(!M.html.includes('zona sólida'));
  assert.match(M.html, /wf\.pLP < wf\.hAmt - 1\) al\.push/);
  assert.ok(!/'VIABLE'|'MARGINAL'/.test(M.html), 'la etiqueta de escenarios dice qué compara');
});

test('payback: es recuperación sostenida, no el primer cruce transitorio', () => {
  const { m } = correr(M, inpBase({ dtotal: 60, dprev: 0, dobra: 6, retraso: 1, rpico: 0.09, peq: 0.9, pfinc: 0.4, tcred: 0.25, pv: 13500000, pterre: 16500000, ga: 0.06 }));
  assert.ok(m.flujoAcum[17] >= 0 && m.flujoAcum[m.N - 1] < 0, 'cruza en el mes 18 y termina en negativo');
  assert.equal(m.payback, null);
  const b = correr(M, inpBase()).m;
  assert.equal(b.payback, 23);
  assert.ok(b.flujoAcum.slice(22).every(v => v >= 0) && b.flujoAcum[21] < 0);
});

test('gráfico de fuentes: la serie «Preventa (sep + CI)» no incluye el saldo a la entrega', () => {
  const { m } = correr(M, inpBase());
  let ac = 0;
  m.ingPreventaMes.forEach((v, i) => { ac += v; assert.ok(cerca(m.prevAcum[i], ac, 1e-3)); });
  assert.ok(m.prevAcum[m.N - 1] < m.ingAcum[m.N - 1] / 2);
  assert.match(M.html, /label:'Preventa', data:scaleArr\(m\.prevAcum\)/);
  assert.ok(!M.html.includes('inicio preventa'), 'el mes 1 no es el inicio de las ventas');
});

test('Monte Carlo: «Recargar rangos» no propone un retraso fuera del control y la TIR no definida no cuenta', () => {
  assert.match(M.html, /mn=0; mo=Math\.round\(bd\); mx=Math\.min\(mo\+3,tope\)/);
  assert.match(M.html, /tir\[it\]=\(o\.tir===null\?NaN:o\.tir\)/);
});
