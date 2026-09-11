/** npm run content && node tools/prepare-edmunds.mjs
 * The MDX is the catalog; originals are only read. WebP strips EXIF (including
 * GPS). Runtime and CI use the prepared public assets, not the source folders.
 */
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const worlds = JSON.parse(await readFile(new URL("../.velite/worldProse.json", import.meta.url), "utf8"));
const output = resolve("public/art/edmunds");
await mkdir(output, { recursive: true });
let bytes = 0;
const pieces = worlds.find((world) => world.id === "edmunds" && world.locale === "es").creativity.artworks;
for (const piece of pieces) {
  if (!/^(Fotos|Disenos)\/[^/\\]+$/.test(piece.source) || piece.source.includes("..")) throw new Error(`Invalid source: ${piece.id}`);
  const source = resolve(piece.source);
  for (const width of [480, 960, 1920]) {
    const info = await sharp(source).rotate().resize({ width, height: width === 1920 ? 2400 : undefined, fit: "inside", withoutEnlargement: true }).webp({ quality: width === 1920 ? 85 : 79, effort: 5 }).toFile(resolve(output, `${piece.id}-${width}.webp`));
    bytes += info.size;
  }
}
console.log(`${pieces.length} works · 3 WebP sizes · ${(bytes / 1024 / 1024).toFixed(2)} MiB total`);
