/** npm run content && node tools/prepare-edmunds.mjs
 * The MDX is the catalog; originals are only read. WebP strips EXIF (including
 * GPS). Runtime and CI use the prepared public assets, not the source folders.
 *
 * Six rungs instead of three: the deck and the mosaic ask for a file close to
 * the size they actually paint (see `sizes` in edmunds-gallery.tsx), and every
 * context asks for 1.5× that, because a WebP looked at 1:1 is soft while the
 * same photo shrunk from a bigger file is crisp. Quality rises with the rung
 * because the large ones are the ones the viewer shows at full size.
 */
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const WIDTHS = [320, 480, 640, 960, 1280, 1920];
const quality = (width) => (width <= 640 ? 84 : width <= 1280 ? 85 : 86);

const worlds = JSON.parse(await readFile(new URL("../.velite/worldProse.json", import.meta.url), "utf8"));
const output = resolve("public/art/edmunds");
await mkdir(output, { recursive: true });
let bytes = 0;
const pieces = worlds.find((world) => world.id === "edmunds" && world.locale === "es").creativity.artworks;
for (const piece of pieces) {
  if (!/^(Fotos|Disenos)\/[^/\\]+$/.test(piece.source) || piece.source.includes("..")) throw new Error(`Invalid source: ${piece.id}`);
  const source = resolve(piece.source);
  for (const width of WIDTHS) {
    const info = await sharp(source).rotate().resize({ width, height: width === 1920 ? 2400 : undefined, fit: "inside", withoutEnlargement: true }).webp({ quality: quality(width), effort: 5 }).toFile(resolve(output, `${piece.id}-${width}.webp`));
    bytes += info.size;
  }
}
console.log(`${pieces.length} works · ${WIDTHS.length} WebP sizes · ${(bytes / 1024 / 1024).toFixed(2)} MiB total`);
