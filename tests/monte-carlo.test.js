// Pruebas de las utilidades estadísticas de la pestaña de riesgo.
// Ejecutar:  node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarModelo } = require('./cargar-modelo.js');

const { html } = cargarModelo();
const ini = html.indexOf('  function rank(a){'), fin = html.indexOf('  function histCanvas(');
assert.ok(ini > 0 && fin > ini, 'no se encontraron rank/spearman en index.html');
const { rank, spearman } = new Function(html.slice(ini, fin) + '; return { rank, spearman };')();

test('rank: empates reciben el rango promedio', () => {
  assert.deepEqual(rank([10, 20, 20, 30]), [0, 1.5, 1.5, 3]);
  assert.deepEqual(rank([5, 5, 5]), [1, 1, 1]);
  assert.deepEqual(rank([3, 1, 2]), [2, 0, 1]);
});

test('spearman: sin variación no hay correlación que informar (antes devolvía 1,00)', () => {
  const cte = new Float64Array(100).fill(0), y = Float64Array.from({ length: 100 }, (_, i) => i);
  assert.equal(spearman(cte, y), null);
  assert.equal(spearman(y, cte), null);
  assert.equal(spearman(cte, new Float64Array(100).fill(0.1)), null);
});

test('spearman: relaciones monótonas dan ±1 y los empates no inventan correlación', () => {
  const x = Float64Array.from({ length: 50 }, (_, i) => i);
  assert.ok(Math.abs(spearman(x, x.map(v => v * v)) - 1) < 1e-12);
  assert.ok(Math.abs(spearman(x, x.map(v => -v)) + 1) < 1e-12);
  // x con solo dos valores, y alternante e independiente de x
  const x2 = Float64Array.from({ length: 100 }, (_, i) => (i < 50 ? 0 : 1));
  const y2 = Float64Array.from({ length: 100 }, (_, i) => i % 2);
  assert.ok(Math.abs(spearman(x2, y2)) < 1e-12);
});

test('Monte Carlo valida el dominio: sin mínimos negativos y el retraso dentro del rango del control', () => {
  assert.match(html, /if\(!\(a\.min>=0\)\)/);
  assert.match(html, /if\(a\.entero && !\(a\.min>=lo && a\.max<=hi\)\)/);
  assert.match(html, /if\(x\.r===null\)/);
});
