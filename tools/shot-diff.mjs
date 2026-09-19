/**
 * Diferencia entre dos capturas, para probar que un refactor no cambió la imagen.
 *
 * Nace en el pase de Gargantúa en el Observatorio, y nace por una necesidad
 * concreta: ese trabajo mueve constantes de un pase visual CONGELADO a un
 * módulo compartido, y la única garantía aceptable de que el System Map no
 * cambió es una comparación de píxeles, no una lectura a ojo.
 *
 * ── El suelo de ruido se mide, no se supone ─────────────────────────────────
 *
 * Dos capturas del MISMO código no salen idénticas: el raymarch acumula en el
 * tiempo sobre ocho posiciones de Halton y el número de fotogramas que la GPU
 * consiga en la ventana de asentamiento depende de la máquina y del momento. O
 * sea que «distintas» no significa «rotas», y sin medir cuánto difieren dos
 * capturas iguales no se puede afirmar nada sobre dos capturas distintas.
 *
 * Por eso el uso es siempre de a tres: base contra base —el suelo— y base
 * contra la versión nueva. Si el segundo número no es del orden del primero,
 * el refactor cambió la imagen.
 *
 * Uso:
 *   node tools/shot-diff.mjs <a> <b>
 *   SHOTS_DIR=.shots/x node tools/shot-diff.mjs base-home base-home-2
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error("Uso: node tools/shot-diff.mjs <a> <b>");
  process.exit(1);
}

async function grey(name) {
  const path = `${dir}/${name}.png`;
  if (!existsSync(path)) {
    console.error(`no existe: ${path}`);
    process.exit(1);
  }
  return sharp(path).greyscale().raw().toBuffer({ resolveWithObject: true });
}

const left = await grey(a);
const right = await grey(b);

if (left.info.width !== right.info.width || left.info.height !== right.info.height) {
  console.error("las dos capturas tienen que medir lo mismo");
  process.exit(1);
}

let sum = 0;
let peak = 0;
let over1 = 0;
let over4 = 0;
let over16 = 0;
for (let i = 0; i < left.data.length; i++) {
  const d = Math.abs(left.data[i] - right.data[i]);
  sum += d;
  if (d > peak) peak = d;
  if (d > 1) over1++;
  if (d > 4) over4++;
  if (d > 16) over16++;
}

const n = left.data.length;
const pct = (count) => ((count / n) * 100).toFixed(3);
console.log(
  `${a} ↔ ${b}\n` +
    `  media |Δ| ${(sum / n).toFixed(4)} · pico ${peak}\n` +
    `  píxeles >1 ${pct(over1)} % · >4 ${pct(over4)} % · >16 ${pct(over16)} %`,
);
