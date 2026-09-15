/** Responsive, metadata-free copies. Personal originals remain untouched. */
import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
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
  "F42",
  "F13",
  "F36",
  "F45",
];
const manifest = {};
for (const id of ids) {
  const entry = inventory.find((photo) => photo.id === id);
  const source = path.join(archive, entry.archivo);
  const widths = [...new Set([320, 640, 960, Math.min(1600, entry.ancho)])]
    .filter((width) => width <= entry.ancho)
    .sort((a, b) => a - b);
  for (const width of widths)
    await sharp(source)
      .rotate()
      .resize({ width })
      .webp({ quality: 86 })
      .toFile(path.join(output, `${id}-${width}.webp`));
  manifest[id] = { width: entry.ancho, height: entry.alto, widths };
}
// E03 is the owner's selected visual reference, not a claim of photographic authorship.
// The permission to publish this third-party photograph is documented separately.
const riverPath = path.join(
  archive,
  "mis-raices/referencias-externas/E03-rio-yuna.jpg",
);
try {
  await readFile(riverPath);
} catch {
  const response = await fetch(
    "https://bonaocity.com.do/wp-content/uploads/2024/06/Rio-Yuna.jpg",
  );
  if (!response.ok) throw new Error(`Bonao image: ${response.status}`);
  await writeFile(riverPath, Buffer.from(await response.arrayBuffer()));
}
const river = await sharp(riverPath).metadata();
const riverWidths = [...new Set([320, 640, 960, Math.min(1600, river.width)])]
  .filter((width) => width <= river.width)
  .sort((a, b) => a - b);
for (const width of riverWidths)
  await sharp(riverPath)
    .resize({ width })
    .webp({ quality: 86 })
    .toFile(path.join(output, `E03-${width}.webp`));
manifest.E03 = {
  width: river.width,
  height: river.height,
  widths: riverWidths,
};
const backgroundSource =
  process.argv[2] || path.join(archive, "_curaduria/fondo-generado-v1.png");
if (process.argv[2])
  await copyFile(
    backgroundSource,
    path.join(archive, "_curaduria/fondo-generado-v1.png"),
  );
for (const width of [768, 1536])
  await sharp(backgroundSource)
    .resize({ width })
    .webp({ quality: 88 })
    .toFile(path.join(output, `cielo-montanas-${width}.webp`));
await writeFile(
  path.join(root, "content/about-photos.data.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared ${Object.keys(manifest).length} photographs and two background sizes.`,
);
