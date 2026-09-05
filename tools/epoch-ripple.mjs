/**
 * Ondulación de luminancia a lo largo de un ciclo de épocas del disco.
 *
 * El disco de Gargantúa avanza con dos copias del campo cruzadas sobre un
 * diente de sierra de periodo EPOCH (ver gargantua-shaders.ts). Eso acota la
 * deformación, que era el fallo, pero introduce una pregunta nueva: el relevo
 * entre copias NO puede notarse. Dos realizaciones distintas del mismo campo
 * procedural no tienen el mismo brillo medio, así que al pasar el peso de una a
 * otra la luminancia de la banda se mueve.
 *
 * Esto lo mide. Se le pasan las capturas de un ciclo —las fases repartidas sobre
 * EPOCH/2, que es el periodo VISUAL: cada media época una copia está en edad
 * cero con peso uno— y devuelve la excursión pico a valle en porcentaje.
 *
 * La cifra solo significa algo contra dos referencias:
 *
 *   · EL RUIDO DE CAPTURA, que se mide repitiendo la MISMA fase dos veces. Bajo
 *     SwiftShader sale del orden de 0.15 %. Una ondulación de ese tamaño no
 *     existe.
 *   · EL CIERRE DEL CICLO: la primera y la última fase son la misma
 *     configuración media época después, así que su diferencia tiene que caer
 *     dentro del ruido. Si no cae, el ciclo no cierra y hay deriva, que es un
 *     defecto peor que la ondulación.
 *
 * Uso:
 *   node tools/epoch-ripple.mjs <captura> <captura> ...
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// La misma banda que disk-metrics: cubre el disco frontal y excluye el cielo
// que el ojo no usa para juzgar brillo de material.
const BAND = { left: 250, top: 355, width: 900, height: 190 };

const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const files = process.argv.slice(2);
if (files.length < 2) {
  console.error("uso: node tools/epoch-ripple.mjs <captura> <captura> ...");
  process.exit(1);
}

async function meanLuma(name) {
  const path = `${dir}/${name}.png`;
  if (!existsSync(path)) return null;
  const { data } = await sharp(path)
    .extract(BAND)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (const v of data) sum += v;
  return sum / data.length;
}

const values = [];
for (const f of files) {
  const luma = await meanLuma(f);
  if (luma === null) {
    console.error(`falta ${f}`);
    process.exit(1);
  }
  values.push(luma);
  console.log(`${f.padEnd(16)} ${luma.toFixed(3).padStart(9)}`);
}

const max = Math.max(...values);
const min = Math.min(...values);
const mean = values.reduce((s, v) => s + v, 0) / values.length;
const ripple = ((max - min) / mean) * 100;
const closure = (Math.abs(values.at(-1) - values[0]) / mean) * 100;

console.log("");
console.log(`ondulacion pico-a-valle  ${ripple.toFixed(2)} %`);
console.log(`cierre del ciclo         ${closure.toFixed(2)} %`);
