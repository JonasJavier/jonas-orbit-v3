/**
 * El vestíbulo del Observatorio — copias responsivas, sin metadatos.
 *
 * El original vive en `assets/` y no se publica: a `public/` sólo van copias
 * WebP a los anchos que la página pinta de verdad. **No se amplía nunca**: un
 * ancho mayor que el del original sería un archivo más pesado y más blando, no
 * una imagen mejor. Si algún día hace falta retina de verdad, se regenera el
 * original más grande y se vuelve a correr esto.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "assets/experimentos/observatorio.png");
const output = path.join(root, "public/images/experimentos");
await mkdir(output, { recursive: true });

const original = sharp(await readFile(source));
const { width: native } = await original.metadata();

/*
  La sala se pinta a lo alto de la ventana: con un original 2:3, una pantalla
  de 900 px de alto le da unos 600 px de ancho. 1024 es el nativo y 1,7× lo
  que pinta, que es justo lo que pide la regla de nitidez de Edmunds.
*/
const widths = [480, 720, 1024].filter((width) => width <= native);

for (const width of widths) {
  const buffer = await sharp(await readFile(source))
    .resize({ width, fit: "inside", kernel: "lanczos3" })
    // Un toque de nitidez al reducir: sin él el degradado del limbo se
    // emplasta y el suelo pierde las juntas.
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
  await writeFile(path.join(output, `observatorio-${width}.webp`), buffer);
  console.log(`observatorio-${width}.webp  ${(buffer.length / 1024) | 0} KB`);
}
