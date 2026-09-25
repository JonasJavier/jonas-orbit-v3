/**
 * Las capturas de la mesa de ingeniería — peldaños WebP y dimensiones medidas.
 *
 * De cada PNG de `public/media/projects/<id>/` deja copias WebP en los anchos
 * que la mesa pinta de verdad (`docs/design/endurance-proyectos.md` §9):
 *
 *   escritorio (más ancha que alta)  480 · 720 · 960 · 1440
 *   teléfono   (más alta que ancha)  390 · 780
 *
 * **No se amplía nunca**: un peldaño mayor que el original sería un archivo
 * más pesado y más blando, no una imagen mejor; los peldaños que no caben se
 * omiten y la página lo sabe por el manifiesto. Los PNG no se tocan:
 * `ProjectCase` y `ProjectCard` los siguen sirviendo por `next/image`.
 *
 * Además escribe `content/projects-media.json` con el ancho y el alto MEDIDOS
 * de cada original y sus peldaños disponibles. Es lo que permite que Velite
 * compruebe `frame: mobile` contra la imagen real y que la página componga el
 * `srcset` sin un campo de dimensiones a mano. Se ejecuta a mano al añadir o
 * sustituir capturas:
 *
 *   node tools/prepare-projects.mjs
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const mediaRoot = path.join(root, "public/media/projects");
const manifestPath = path.join(root, "content/projects-media.json");

const DESKTOP_STEPS = [480, 720, 960, 1440];
const MOBILE_STEPS = [390, 780];
const QUALITY = 84;

/** El peldaño `<nombre>-<ancho>.webp` junto a su original. */
function stepPath(pngPath, width) {
  return pngPath.replace(/\.png$/, `-${width}.webp`);
}

async function isFresh(target, sourceMtime) {
  try {
    return (await stat(target)).mtimeMs >= sourceMtime;
  } catch {
    return false;
  }
}

const manifest = {};
const projects = (await readdir(mediaRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const project of projects) {
  const dir = path.join(mediaRoot, project);
  await mkdir(dir, { recursive: true });
  const files = (await readdir(dir)).filter((file) => file.endsWith(".png")).sort();

  for (const file of files) {
    const source = path.join(dir, file);
    const buffer = await readFile(source);
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height) throw new Error(`Sin dimensiones: ${source}`);

    const portrait = height > width;
    const steps = (portrait ? MOBILE_STEPS : DESKTOP_STEPS).filter((step) => step <= width);
    const sourceMtime = (await stat(source)).mtimeMs;

    for (const step of steps) {
      const target = stepPath(source, step);
      if (await isFresh(target, sourceMtime)) continue;
      const webp = await sharp(buffer)
        .resize({ width: step, fit: "inside", kernel: "lanczos3" })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();
      await writeFile(target, webp);
      console.log(`${project}/${path.basename(target)}  ${(webp.length / 1024) | 0} KB`);
    }

    manifest[`/media/projects/${project}/${file}`] = { width, height, steps };
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} capturas registradas en content/projects-media.json`);

/*
  La sala — el fondo de la página, horneado por `tools/render-projects-room.mjs`.

  El original (`assets/proyectos/sala.png`) no se publica: a `public/` van
  copias WebP a los anchos que la página pinta a pantalla completa. Igual que
  las capturas, **no se amplía nunca**. Si el original todavía no existe, el
  paso se salta sin error: la página tiene su propio fondo de reserva.

  Calidad 90 y no 80: la sala es casi toda sombra, y a 80 el cuantizador de
  WebP aplana los grises oscuros en manchas —se pierden el grano y las juntas
  de la bóveda— por 25 KB de ahorro. A 90 la copia de 1920 sigue muy por
  debajo de los ~220 KB que se le permiten.
*/
const roomSource = path.join(root, "assets/proyectos/sala.png");
const roomOutput = path.join(root, "public/images/proyectos");
const ROOM_STEPS = [960, 1440, 1920, 2560];
const ROOM_QUALITY = 90;

let roomBuffer = null;
try {
  roomBuffer = await readFile(roomSource);
} catch {
  console.log("assets/proyectos/sala.png no existe todavía: se omite la sala");
}
if (roomBuffer) {
  await mkdir(roomOutput, { recursive: true });
  const { width: native } = await sharp(roomBuffer).metadata();
  for (const step of ROOM_STEPS.filter((width) => width <= native)) {
    const webp = await sharp(roomBuffer)
      .resize({ width: step, fit: "inside", kernel: "lanczos3" })
      // Un toque de nitidez al reducir, como en el Observatorio: sin él las
      // aristas iluminadas de las cuadernas se emplastan.
      .sharpen({ sigma: 0.6 })
      .webp({ quality: ROOM_QUALITY, effort: 6, smartSubsample: true })
      .toBuffer();
    await writeFile(path.join(roomOutput, `sala-${step}.webp`), webp);
    console.log(`proyectos/sala-${step}.webp  ${(webp.length / 1024) | 0} KB`);
  }
}
