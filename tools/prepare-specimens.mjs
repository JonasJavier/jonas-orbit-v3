/**
 * Las imágenes publicadas de los seis especímenes del Observatorio.
 *
 * Entrada: una carpeta con `<id>.png` por espécimen (`tesseract`, `endurance`,
 * `gargantua`, `ranger`, `miller`, `edmunds`), capturas a 1600 × 900 con GPU
 * real en modo OBSERVAR y con el cromo del instrumento oculto (2026-10-02:
 * Chromium con ventana y ANGLE/D3D11 contra producción; el headless por
 * defecto no tiene GPU y el nivel plano no enseña el espécimen).
 *
 * Salida (`public/images/experimentos/observatorio/`): `<id>-1600.webp` y
 * `<id>-800.webp` (16:9, sitemap de imágenes y JSON-LD) y `<id>-og.jpg`
 * (1200 × 630, la tarjeta al compartir la URL del espécimen). Las rutas las
 * conoce `lib/observatory-images.ts`.
 *
 *   node tools/prepare-specimens.mjs <carpeta-con-png>
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input) {
  console.error("Uso: node tools/prepare-specimens.mjs <carpeta-con-png>");
  process.exit(1);
}
const output = path.join(process.cwd(), "public/images/experimentos/observatorio");
await mkdir(output, { recursive: true });

for (const id of ["tesseract", "endurance", "gargantua", "ranger", "miller", "edmunds"]) {
  const source = path.join(input, `${id}.png`);
  await sharp(source).resize({ width: 1600, height: 900, fit: "cover" }).webp({ quality: 84 }).toFile(path.join(output, `${id}-1600.webp`));
  await sharp(source).resize({ width: 800, height: 450, fit: "cover" }).webp({ quality: 82 }).toFile(path.join(output, `${id}-800.webp`));
  await sharp(source)
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(output, `${id}-og.jpg`));
  console.log(id);
}
