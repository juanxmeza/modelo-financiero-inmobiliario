# Arquitectura — Modelo Financiero Inmobiliario

Evaluación financiera de proyectos inmobiliarios en un solo HTML: supuestos de ventas, preventa, costos y crédito constructor → flujo de caja mensual → TIR, VPN, escenarios y sensibilidad. Gráficas con Chart.js. Público en modelo.inicon.com.co.

**Diagrama interactivo:** [docs/arquitectura/arquitectura.html](docs/arquitectura/arquitectura.html)
(abrir con doble clic; tema claro/oscuro, vistas guiadas, exportar PNG/SVG).
**Fuente del diagrama:** [docs/arquitectura/arquitectura.architecture.json](docs/arquitectura/arquitectura.architecture.json).

## Cómo actualizarlo

El diagrama se genera con [Archify](https://github.com/tt-a1i/archify) a partir del JSON. Tras cambiar la
arquitectura, editar el JSON y regenerar:

```bash
node ~/.agents/skills/archify/bin/archify.mjs deliver architecture docs/arquitectura/arquitectura.architecture.json docs/arquitectura/arquitectura.html --quality showcase
```

Generado el 2026-09-12 con Claude Code, a partir de la lectura del código de este repositorio.
