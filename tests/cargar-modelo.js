// Carga las funciones puras de cálculo directamente desde index.html,
// para que las pruebas ejerciten el mismo código que se publica.
const fs = require('node:fs');
const path = require('node:path');

function cargarModelo(archivo = path.join(__dirname, '..', 'index.html')) {
  const html = fs.readFileSync(archivo, 'utf8');
  const ini = html.indexOf('const curvas = {');
  const fin = html.indexOf('// ── Charts');
  if (ini < 0 || fin < 0 || fin < ini) throw new Error('No se encontró el bloque de cálculo en ' + archivo);
  const codigo = html.slice(ini, fin);
  const fabrica = new Function(
    `let curvaActiva = 'rapida';
     ${codigo}
     return { calcProg, calcFin, calcModel, calcVPN, calcVPNeq, calcTIR, calcWF, setCurva: c => { curvaActiva = c; } };`
  );
  return { ...fabrica(), html };
}

// Supuestos por defecto de la página (valores iniciales de los sliders).
function inpBase(over = {}) {
  const sep = 0.02, ci = 0.28;
  return Object.assign({
    terreno: 1000, pterre: 7560000, alib: 0.30, pisos: 8, sotan: 3, cobsot: 1,
    acomun: 0.12, aestac: 28, pv: 10080000, pe: 50400000,
    sepPct: sep, ciPct: ci, salPct: 1 - sep - ci, mesci: 1,
    peq: 0.65, pfinc: 0.70, tcred: 0.14,
    csr: 2730000, csot: 3150000, ciind: 0.155, gc: 0.055, ga: 0.02,
    equity: 0.40, imp: 0.33, tvpn: 0.12,
    dtotal: 30, dprev: 4, dobra: 18, rpico: 0.12, mpico: 4, retraso: 0,
    gppct: 0.20, hurdle: 0.15, gpsplit: 0.30
  }, over);
}

// Caso de reproducción del informe: Lanzamiento, 12 meses, 3 de preventa, 6 de obra.
function inpRepro(over = {}) {
  return inpBase(Object.assign({
    dtotal: 12, dprev: 3, dobra: 6, rpico: 0.15, mpico: 4,
    peq: 0.90, pfinc: 0.60, retraso: 6
  }, over));
}

function correr(M, inp) {
  const prog = M.calcProg(inp), fin = M.calcFin(inp, prog), m = M.calcModel(inp, prog, fin);
  return { prog, fin, m };
}

module.exports = { cargarModelo, inpBase, inpRepro, correr };
