/** Responsive, metadata-free copies. Personal originals remain untouched. */
import { readFile, mkdir, copyFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const archive = path.join(root, "assets/sobre-mi");
const output = path.join(root, "public/images/sobre-mi");
await mkdir(output, { recursive: true });
const inventory = JSON.parse(
  await readFile(path.join(archive, "_curaduria/inventario.json"), "utf8"),
);
const ids = [
  "F40",
  "F28",
  "F50",
  "F09",
  "F29",
  "F04",
  "F44",
  "F23",
  "F11",
  "F02",
  "F16",
  "F34",
  "F15",
  "F20",
  "F07",
  "F36",
  "F45",
];
const manifest = {};
// Withdrawn by the owner: the large team cannot remain publicly addressable.
// Keep the private original; remove only the four generated publication copies.
for (const width of [320, 640, 960, 1600]) {
  await unlink(path.join(output, `F13-${width}.webp`)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
for (const id of ids) {
  const entry = inventory.find((photo) => photo.id === id);
  const source = path.join(
    archive,
    id === "F23" ? "_curaduria/miniaturas/F23.jpg" : entry.archivo,
  );
  const metadata = await sharp(source).rotate().metadata();
  const photoWidth = metadata.autoOrient.width;
  const photoHeight = metadata.autoOrient.height;
  // 800 is the rung a phone's chapter photo needs (~650-750 device px):
  // without it the browser jumped from 640 straight to 960.
  const widths = [...new Set([320, 640, 800, 960, Math.min(1600, photoWidth)])]
    .filter((width) => width <= photoWidth)
    .sort((a, b) => a - b);
  for (const width of widths)
    await sharp(source)
      .rotate()
      .resize({ width })
      // Page sizes at 80 (2026-09-29, PageSpeed): at 86 a detailed photo
      // weighed ~480 KB at 960 px. The viewer's full size keeps 86.
      .webp({ quality: width >= 1600 || width === photoWidth ? 86 : 80 })
      .toFile(path.join(output, `${id}-${width}.webp`));
  manifest[id] = { width: photoWidth, height: photoHeight, widths };
}
// The owner replaced the external river reference with their improved F23.
const previous = JSON.parse(
  await readFile("content/about-photos.data.json", "utf8"),
);
for (const width of previous.E03?.widths ?? [])
  await unlink(path.join(output, `E03-${width}.webp`)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
const backgroundSource =
  process.argv[2] || path.join(archive, "_curaduria/fondo-generado-v1.png");
if (process.argv[2])
  await copyFile(
    backgroundSource,
    path.join(archive, "_curaduria/fondo-generado-v1.png"),
  );
await sharp(backgroundSource)
  .resize({ width: 1536 })
  .webp({ quality: 88 })
  .toFile(path.join(output, "cielo-montanas-1536.webp"));
// Phones show the hero as a tall strip of the landscape (`cover`, anchored at
// 58 % in about-page.css). This crop keeps exactly that strip at the same
// pixel density: starting it at 58 % of the spare width leaves the framing
// identical for every phone whose hero is taller than the crop is wide.
const MOBILE_CROP = 720;
const mobileLeft = Math.round(0.58 * (1536 - MOBILE_CROP));
await sharp(await sharp(backgroundSource).resize({ width: 1536 }).toBuffer())
  .extract({ left: mobileLeft, top: 0, width: MOBILE_CROP, height: 1024 })
  .webp({ quality: 82 })
  .toFile(path.join(output, "cielo-montanas-movil.webp"));
await writeFile(
  path.join(root, "content/about-photos.data.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared ${Object.keys(manifest).length} photographs and the background and its phone crop.`,
);
