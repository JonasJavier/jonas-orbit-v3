/**
 * Recorte y ampliación de una captura, para juzgar una zona concreta.
 *
 * A 1440×860 el disco de Gargantúa mide unos 600 px de ancho: mirar la captura
 * entera no sirve para decidir nada sobre un filamento o un carril de polvo.
 *
 * Uso:
 *   node tools/crop.mjs <origen> <destino> <x> <y> <ancho> <alto> [zoom]
 *
 * Los nombres son sin extensión y se resuelven contra SHOTS_DIR (por defecto
 * .shots/). El zoom usa lanczos3; para inspeccionar píxel a píxel, pasar
 * `nearest` como octavo argumento.
 */
import sharp from "sharp";
import { resolve } from "node:path";

const [src, out, x, y, w, h, zoom = "1", kernel = "lanczos3"] =
  process.argv.slice(2);
if (!src || !out || !w || !h) {
  console.error(
    "uso: node tools/crop.mjs <origen> <destino> <x> <y> <ancho> <alto> [zoom] [kernel]",
  );
  process.exit(1);
}
const dir = resolve(process.env.SHOTS_DIR ?? ".shots");

await sharp(`${dir}/${src}.png`)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: Math.round(+w * +zoom), kernel })
  .toFile(`${dir}/${out}.png`);
console.log(`${dir}/${out}.png  ${Math.round(+w * +zoom)} px de ancho`);
