/**
 * Métricas de la banda del disco primario, para discutir con números en vez de
 * con adjetivos.
 *
 * Mide dentro de una ventana que cubre el disco frontal y excluye la sombra —si
 * no, el agujero negro cuenta como «zona oscura» y la cifra deja de significar
 * nada.
 *
 *   · ÁREA OSCURA: porcentaje por debajo de un umbral bajo. Sube cuando el disco
 *     se vacía y baja cuando se llena. Sirve para comprobar que un cambio no ha
 *     engordado el disco de tapadillo.
 *   · HISTOGRAMA en cuatro tramos: negro / residual / tenue / material. Es el
 *     que de verdad importa cuando se trabaja la continuidad, porque el objetivo
 *     casi nunca es «menos oscuridad» sino MOVER píxeles del tramo negro al
 *     residual: material tenue en lugar de recortes.
 *
 * Ojo: la ventana incluye cielo por encima y por debajo de la banda, así que el
 * valor absoluto no dice gran cosa. Lo que vale es la diferencia entre dos
 * capturas de la MISMA fase.
 *
 * Uso:
 *   node tools/disk-metrics.mjs <captura> [más capturas...]
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const BAND = { left: 250, top: 355, width: 900, height: 190 };
const SHADOW = { cx: 668 - BAND.left, cy: 448 - BAND.top, r: 95 };
const DARK = 14;

const files = process.argv.slice(2);
if (!files.length) {
  console.error("uso: node tools/disk-metrics.mjs <captura> [...]");
  process.exit(1);
}

console.log(
  "captura            oscuro   negro<8  residual  tenue   material",
);
for (const f of files) {
  const path = `${dir}/${f}.png`;
  if (!existsSync(path)) {
    console.log(`${f.padEnd(18)} (no existe)`);
    continue;
  }
  const { data, info } = await sharp(path)
    .extract(BAND)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let dark = 0;
  let total = 0;
  const bucket = [0, 0, 0, 0];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (Math.hypot(x - SHADOW.cx, y - SHADOW.cy) < SHADOW.r) continue;
      const v = data[y * info.width + x];
      total++;
      if (v < DARK) dark++;
      if (v < 8) bucket[0]++;
      else if (v < 25) bucket[1]++;
      else if (v < 60) bucket[2]++;
      else bucket[3]++;
    }
  }
  const pct = (n) => `${((100 * n) / total).toFixed(1)} %`.padStart(8);
  console.log(
    `${f.padEnd(18)}${pct(dark)}${bucket.map(pct).join("")}`,
  );
}
