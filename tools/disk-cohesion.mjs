/**
 * ¿El disco se lee como UNA masa o como capas? Tres números por captura.
 *
 * Nace en el pase de cohesión (2026-09-19). El diagnóstico del dueño era
 * perceptual —«se sigue leyendo como bandas superpuestas» y «el lado izquierdo
 * y el derecho no hablan el mismo idioma»— y ninguna herramienta del repositorio
 * medía eso: `disk-silhouette.mjs` dice cómo TERMINA el brazo, `disk-metrics.mjs`
 * cuánto material hay, `gargantua-metrics.mjs` qué pasa en la sombra. Aquí se
 * mide cómo se REPARTE lo que hay, en tres preguntas:
 *
 *   1. ESTRATOS. Sobre rayos que salen del centro hacia la banda frontal, el
 *      color (calidez = (R−B)/(R+B)) se recorre con el radio. Si cambia en
 *      escalones, el cambio total se concentra en pocos píxeles; si es una
 *      rampa, se reparte. Se publica la fracción del cambio total que cae en el
 *      15 % de píxeles con mayor gradiente: 1.0 sería un escalón perfecto, 0.15
 *      una rampa perfecta. Es el índice de «capas cromáticas».
 *
 *   2. GRAMÁTICA POR REGIÓN. En cuatro regiones —izquierda arriba/abajo,
 *      derecha arriba/abajo— se mide, sólo sobre píxeles con material:
 *        · hf: energía de alta frecuencia sobre la varianza local (cuánto grano);
 *        · coherencia: del tensor de estructura, 0 isótropo, 1 laminar;
 *        · orientación: ángulo medio de las estrías, en grados desde la
 *          horizontal de pantalla.
 *      Dos regiones «de la misma familia» dan hf y coherencia parecidos.
 *
 *   3. RAZONES. izq/der y arriba/abajo de las cifras de arriba, que es lo que
 *      se compara entre dos versiones. 1.00 es la misma gramática.
 *
 * ── Lo que NO dice ──────────────────────────────────────────────────────────
 *
 * Ninguna de estas cifras decide si el disco está bien: decide si un cambio ha
 * movido lo que se quería mover y en qué dirección. Cuando una métrica y la
 * captura se contradigan, manda la captura.
 *
 * Uso:
 *   node tools/disk-cohesion.mjs <captura.png> [más...] [--centro=x,y] [--radio=R]
 *
 * Los nombres son rutas de archivo (con extensión), no nombres de SHOTS_DIR:
 * las capturas de este pase viven en carpetas por etiqueta.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const centre = flag("centro")?.split(",").map(Number);
const CX = centre?.[0] ?? 668;
const CY = centre?.[1] ?? 432;
/** Radio de la sombra en píxeles: la unidad de todas las regiones. */
const R = Number(flag("radio") ?? 88);
const files = args.filter((a) => !a.startsWith("--"));

if (!files.length) {
  console.error("uso: node tools/disk-cohesion.mjs <captura.png> [...] [--centro=x,y] [--radio=R]");
  process.exit(1);
}

/** Umbral de material sobre el cielo, en niveles de gris. */
const MATERIAL = 14;

for (const file of files) {
  if (!existsSync(file)) {
    console.log(`${file}: no existe`);
    continue;
  }
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;
  const rgb = (x, y) => {
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const luma = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Cielo: p10 de una ventana ancha alrededor del disco, fuera de la sombra.
  const cieloMuestras = [];
  for (let y = Math.max(0, CY - 3 * R); y < Math.min(H, CY + 3 * R); y += 3) {
    for (let x = Math.max(0, CX - 7 * R); x < Math.min(W, CX + 7 * R); x += 3) {
      if (Math.hypot(x - CX, y - CY) < 1.3 * R) continue;
      cieloMuestras.push(luma(x, y));
    }
  }
  cieloMuestras.sort((a, b) => a - b);
  const cielo = cieloMuestras[Math.round((cieloMuestras.length - 1) * 0.1)];

  // ── 1. Estratos ───────────────────────────────────────────────────────────
  // Rayos hacia la banda frontal: de 205° a 335° en pantalla (270° es abajo).
  const concentraciones = [];
  for (let deg = 205; deg <= 335; deg += 10) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const calidez = [];
    for (let d = 1.3 * R; d < 6.4 * R; d += 1) {
      const x = Math.round(CX + dx * d);
      const y = Math.round(CY + dy * d);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) break;
      if (luma(x, y) < cielo + MATERIAL) {
        calidez.push(null);
        continue;
      }
      const [r, , b] = rgb(x, y);
      calidez.push((r - b) / (r + b + 1));
    }
    // Sólo el tramo continuo de material más largo: fuera de él no hay disco.
    let mejor = [0, 0];
    let ini = -1;
    for (let i = 0; i <= calidez.length; i++) {
      if (i < calidez.length && calidez[i] !== null) {
        if (ini < 0) ini = i;
      } else if (ini >= 0) {
        if (i - ini > mejor[1] - mejor[0]) mejor = [ini, i];
        ini = -1;
      }
    }
    const tramo = calidez.slice(mejor[0], mejor[1]);
    if (tramo.length < 40) continue;
    // Suavizado de 5 px y gradiente absoluto.
    const suave = tramo.map((_, i) => {
      let s = 0, n = 0;
      for (let k = -2; k <= 2; k++) {
        const v = tramo[i + k];
        if (v !== undefined) { s += v; n++; }
      }
      return s / n;
    });
    const grad = [];
    for (let i = 1; i < suave.length; i++) grad.push(Math.abs(suave[i] - suave[i - 1]));
    const total = grad.reduce((s, v) => s + v, 0);
    if (total <= 0) continue;
    const ordenado = [...grad].sort((a, b) => b - a);
    const top = Math.max(1, Math.round(ordenado.length * 0.15));
    const enTop = ordenado.slice(0, top).reduce((s, v) => s + v, 0);
    concentraciones.push(enTop / total);
  }
  const estratos = concentraciones.length
    ? concentraciones.reduce((s, v) => s + v, 0) / concentraciones.length
    : NaN;

  // ── 1 bis. Familia de tono ────────────────────────────────────────────────
  // La referencia tiene el 95 % de sus píxeles con color entre 0° y 25° de
  // tono y ninguno por encima de 35°; el beige (35-55°, poca saturación,
  // claro) y el caqui (33-55°, saturado, oscuro) son familias que allí no
  // existen. Se cuenta sobre píxeles con material dentro de ±3 radios en
  // vertical y ±7 en horizontal.
  let conColor = 0, sobre30 = 0, beige = 0, caqui = 0, satSuma = 0;
  for (let y = Math.max(0, CY - 3 * R); y < Math.min(H, CY + 3 * R); y += 2) {
    for (let x = Math.max(0, CX - 7 * R); x < Math.min(W, CX + 7 * R); x += 2) {
      if (Math.hypot(x - CX, y - CY) < 1.1 * R) continue;
      const [r, g, b] = rgb(x, y);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const val = max / 255;
      const sat = max > 0 ? (max - min) / max : 0;
      if (luma(x, y) < cielo + MATERIAL || sat < 0.08) continue;
      let hue;
      if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
      else if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
      else hue = 60 * ((r - g) / (max - min) + 4);
      if (hue < 0) hue += 360;
      conColor++;
      satSuma += sat;
      if (hue > 30 && hue < 180) sobre30++;
      if (hue >= 35 && hue <= 55 && sat >= 0.1 && sat <= 0.4 && val > 0.6) beige++;
      if (hue >= 33 && hue <= 55 && sat > 0.4 && val < 0.55) caqui++;
    }
  }
  const pct = (n) => (conColor ? ((100 * n) / conColor).toFixed(1) : "—");

  // ── 2. Gramática por región ───────────────────────────────────────────────
  const regiones = {
    "izq-arriba": { x0: CX - 5.6 * R, x1: CX - 1.6 * R, y0: CY - 2.2 * R, y1: CY - 0.2 * R },
    "izq-abajo": { x0: CX - 5.6 * R, x1: CX - 1.6 * R, y0: CY - 0.2 * R, y1: CY + 2.0 * R },
    "der-arriba": { x0: CX + 1.6 * R, x1: CX + 6.2 * R, y0: CY - 2.2 * R, y1: CY - 0.2 * R },
    "der-abajo": { x0: CX + 1.6 * R, x1: CX + 6.2 * R, y0: CY - 0.2 * R, y1: CY + 2.0 * R },
  };

  const medir = ({ x0, x1, y0, y1 }) => {
    x0 = Math.max(2, Math.round(x0)); y0 = Math.max(2, Math.round(y0));
    x1 = Math.min(W - 3, Math.round(x1)); y1 = Math.min(H - 3, Math.round(y1));
    let n = 0, sumL = 0, sumL2 = 0, sumLap2 = 0;
    let jxx = 0, jyy = 0, jxy = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const l = luma(x, y);
        if (l < cielo + MATERIAL) continue;
        // Vecinos: también material, o el borde entra como estructura.
        const lx1 = luma(x + 1, y), lx0 = luma(x - 1, y);
        const ly1 = luma(x, y + 1), ly0 = luma(x, y - 1);
        if (Math.min(lx1, lx0, ly1, ly0) < cielo + MATERIAL) continue;
        n++;
        sumL += l;
        sumL2 += l * l;
        const lap = lx1 + lx0 + ly1 + ly0 - 4 * l;
        sumLap2 += lap * lap;
        const gx = (lx1 - lx0) * 0.5;
        const gy = (ly1 - ly0) * 0.5;
        jxx += gx * gx; jyy += gy * gy; jxy += gx * gy;
      }
    }
    if (n < 200) return null;
    const varL = sumL2 / n - (sumL / n) ** 2;
    const hf = Math.sqrt(sumLap2 / n) / Math.max(1, Math.sqrt(varL));
    const tr = jxx + jyy;
    const disc = Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy);
    const coherencia = tr > 0 ? disc / tr : 0;
    // Orientación de las ESTRÍAS (perpendicular al gradiente dominante).
    const theta = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
    let orient = ((theta + Math.PI / 2) * 180) / Math.PI;
    orient = ((orient + 90) % 180) - 90;
    return { n, media: sumL / n, hf, coherencia, orient };
  };

  const medidas = {};
  for (const [nombre, zona] of Object.entries(regiones)) medidas[nombre] = medir(zona);

  const fmt = (m) =>
    m
      ? `material ${String(m.n).padStart(6)} px · media ${m.media.toFixed(1).padStart(5)} · hf ${m.hf.toFixed(3)} · coherencia ${m.coherencia.toFixed(3)} · orient ${m.orient.toFixed(0).padStart(4)}°`
      : "sin material suficiente";

  console.log(file);
  console.log(`  cielo ${cielo.toFixed(1)} · estratos (concentración del cambio de color) ${estratos.toFixed(3)}`);
  console.log(
    `  tono: >30° ${pct(sobre30)} % · beige ${pct(beige)} % · caqui ${pct(caqui)} % · saturación media ${conColor ? (satSuma / conColor).toFixed(2) : "—"} (${conColor} px con color)`,
  );
  for (const [nombre, m] of Object.entries(medidas)) console.log(`  ${nombre.padEnd(11)} ${fmt(m)}`);

  const razon = (a, b, campo) =>
    a && b ? (a[campo] / Math.max(1e-6, b[campo])).toFixed(2) : "—";
  const ia = medidas["izq-arriba"], ib = medidas["izq-abajo"];
  const da = medidas["der-arriba"], db = medidas["der-abajo"];
  console.log(
    `  razones hf        izq/der arriba ${razon(ia, da, "hf")} · izq/der abajo ${razon(ib, db, "hf")} · arriba/abajo izq ${razon(ia, ib, "hf")} · arriba/abajo der ${razon(da, db, "hf")}`,
  );
  console.log(
    `  razones coherencia izq/der arriba ${razon(ia, da, "coherencia")} · izq/der abajo ${razon(ib, db, "coherencia")} · arriba/abajo izq ${razon(ia, ib, "coherencia")} · arriba/abajo der ${razon(da, db, "coherencia")}`,
  );
}
