/**
 * La tarjeta JPG de cada entrada del blog: `<portada>-og.jpg` (1200 × 630,
 * recorte central) a partir de `<portada>-1600.webp`.
 *
 * Existe porque `og:image` apuntaba al WebP de 1600 px y LinkedIn —donde
 * Jonás comparte las entradas— no pinta tarjetas WebP; Facebook tampoco lo
 * garantiza. Los casos y los especímenes ya llevaban su `-og.jpg`
 * (`prepare-projects.mjs`, `prepare-specimens.mjs`); esto cierra el hueco de
 * las entradas. Lee las portadas de `content/articles.data.ts` para no
 * generar una tarjeta por cada figura.
 *
 * Uso: node tools/prepare-article-og.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(root, "content/articles.data.ts"), "utf8");

const covers = new Set();
const entry = /images:\s*"([^"]+)",\s*cover:\s*(?:"([^"]+)"|\{([^}]+)\})/g;
for (const match of source.matchAll(entry)) {
  const [, images, single, byLocale] = match;
  const names = single ? [single] : [...byLocale.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const name of names) covers.add(`${images}/${name}`);
}
if (covers.size === 0) throw new Error("No se encontró ninguna portada en content/articles.data.ts");

for (const base of covers) {
  const input = path.join(root, "public", `${base}-1600.webp`);
  const output = path.join(root, "public", `${base}-og.jpg`);
  await sharp(input)
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(output);
  console.log(`${base}-og.jpg`);
}
