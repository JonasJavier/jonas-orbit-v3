/**
 * Métricas de Gargantúa para el pase visual final. Uso:
 *   node gargantua-metrics.mjs <captura> [más...] [--centro=x,y] [--radio=R]
 *   node gargantua-metrics.mjs <captura> --encuadre
 * Lee de SHOTS_DIR (por defecto .shots/ del repo).
 *
 *   · anillos de la sombra: luminancia media por anillo del radio de la sombra
 *   · negro de verdad: extensión horizontal y vertical de la zona < 8 dentro
 *     de la sombra, pasando por el centro
 *   · recorte blanco: % de píxeles ≥ 250 y ≥ 235 en la banda del disco
 *   · asimetría: luminancia media a izquierda y derecha del centro en la banda
 *
 * ── Por qué el centro y el radio son ahora parámetros ───────────────────────
 *
 * Nacieron clavados —668, 448, radio 95— porque sólo existía un encuadre de
 * Gargantúa: la portada a 1440 × 860. El Observatorio monta cuatro vistas más,
 * cada una con su campo y su distancia, así que la sombra cae en otro sitio y
 * mide otra cosa en cada una. Con los valores de la home, las medidas sobre una
 * captura del laboratorio no están mal: están midiendo cielo.
 *
 * Los valores por defecto siguen siendo los de la portada, así que cualquier
 * invocación anterior da exactamente lo mismo que daba.
 *
 * ── `--encuadre` ────────────────────────────────────────────────────────────
 *
 * Otra pregunta, y la que hace falta para calibrar una vista: cuánto cuadro
 * ocupa el MATERIAL —no el cielo— y si toca algún canto. `observatory-fill.mjs`
 * no sirve aquí porque busca filas encendidas y en Gargantúa el campo estelar
 * enciende las 900: da 100 % del alto en cualquier encuadre, que es cierto y no
 * dice nada. Un disco cortado por el borde no es una muestra, es un recorte.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const centre = flag("centro")?.split(",").map(Number);
const CX = centre?.[0] ?? 668;
const CY = centre?.[1] ?? 448;
const R = Number(flag("radio") ?? 95);
const BAND = { left: 250, top: 355, width: 900, height: 190 };
const RINGS = [0, 0.35, 0.6, 0.8, 1.0, 1.25, 1.7];
/** Por encima de esto hay materia del disco; por debajo, cielo. El mismo
 *  umbral con el que la tabla del §14 duodecies cuenta «material ≥ 60». */
const MATERIAL = 60;
const captures = args.filter((a) => !a.startsWith("--"));

if (args.includes("--encuadre")) {
  for (const f of captures) {
    const path = `${dir}/${f}.png`;
    if (!existsSync(path)) {
      console.log(`${f}: no existe`);
      continue;
    }
    const { data, info } = await sharp(path).greyscale().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    let left = W, right = -1, top = H, bottom = -1, lit = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[y * W + x] < MATERIAL) continue;
        lit++;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    const touching = [
      left <= 1 && "izquierda",
      right >= W - 2 && "derecha",
      top <= 1 && "arriba",
      bottom <= H - 2 ? null : "abajo",
    ].filter(Boolean);
    console.log(
      `${f} · ${W}×${H}
` +
        `  material a lo ancho ${left}-${right} · ${(((right - left) / W) * 100).toFixed(1)} % del cuadro
` +
        `  material a lo alto  ${top}-${bottom} · ${(((bottom - top) / H) * 100).toFixed(1)} % del cuadro
` +
        `  superficie ${((lit / (W * H)) * 100).toFixed(1)} % · toca canto: ${touching.length ? touching.join(", ") : "no"}`,
    );
  }
  process.exit(0);
}

for (const f of captures) {
  const path = `${dir}/${f}.png`;
  if (!existsSync(path)) {
    console.log(`${f}: no existe`);
    continue;
  }
  const { data, info } = await sharp(path).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const px = (x, y) => data[y * W + x];

  // Anillos.
  const sums = new Array(RINGS.length - 1).fill(0);
  const counts = new Array(RINGS.length - 1).fill(0);
  for (let y = CY - 2 * R; y <= CY + 2 * R; y++) {
    for (let x = CX - 2 * R; x <= CX + 2 * R; x++) {
      const d = Math.hypot(x - CX, y - CY) / R;
      for (let i = 0; i < RINGS.length - 1; i++) {
        if (d >= RINGS[i] && d < RINGS[i + 1]) {
          sums[i] += px(x, y);
          counts[i]++;
        }
      }
    }
  }
  const rings = sums.map((s, i) => (s / counts[i]).toFixed(1).padStart(6));

  // Negro de verdad: extensión < 8 a lo largo de los ejes por el centro.
  const dark = (v) => v < 8;
  let left = CX, right = CX, up = CY, down = CY;
  while (left > CX - 2 * R && dark(px(left - 1, CY))) left--;
  while (right < CX + 2 * R && dark(px(right + 1, CY))) right++;
  while (up > CY - 2 * R && dark(px(CX, up - 1))) up--;
  while (down < CY + 2 * R && dark(px(CX, down + 1))) down++;
  // Área negra dentro del radio 1.25 R.
  let blackArea = 0;
  let shadowArea = 0;
  for (let y = CY - 1.25 * R; y <= CY + 1.25 * R; y++) {
    for (let x = CX - 1.25 * R; x <= CX + 1.25 * R; x++) {
      if (Math.hypot(x - CX, y - CY) > 1.25 * R) continue;
      shadowArea++;
      if (dark(px(Math.round(x), Math.round(y)))) blackArea++;
    }
  }

  // Banda: recorte y asimetría.
  let n = 0, c250 = 0, c235 = 0, lSum = 0, lN = 0, rSum = 0, rN = 0, mat = 0;
  for (let y = BAND.top; y < BAND.top + BAND.height; y++) {
    for (let x = BAND.left; x < BAND.left + BAND.width; x++) {
      if (Math.hypot(x - CX, y - CY) < R) continue;
      const v = px(x, y);
      n++;
      if (v >= 250) c250++;
      if (v >= 235) c235++;
      if (v >= 60) mat++;
      if (x < CX) { lSum += v; lN++; } else { rSum += v; rN++; }
    }
  }
  console.log(`${f}`);
  console.log(`  anillos ${RINGS.slice(0, -1).map((r, i) => `${r}-${RINGS[i + 1]}`).join(" | ")}`);
  console.log(`          ${rings.join(" | ")}`);
  console.log(`  negro<8 por el centro: ${right - left + 1} ancho × ${down - up + 1} alto · área negra ${(100 * blackArea / shadowArea).toFixed(1)} % del disco 1.25R`);
  console.log(`  banda: ≥250 ${(100 * c250 / n).toFixed(2)} % · ≥235 ${(100 * c235 / n).toFixed(2)} % · material(≥60) ${(100 * mat / n).toFixed(1)} % · izq ${(lSum / lN).toFixed(1)} · der ${(rSum / rN).toFixed(1)} · razón ${(lSum / lN / (rSum / rN)).toFixed(2)}`);
}
