/**
 * Recortes por formulario a partir de las maestras de `awards-shots.mjs`.
 *
 * Cada premio pide un tamaño distinto y ninguno coincide con la pantalla.
 * Los recortes salen de las tomas a DPR 1 (`<id>-1920x1200.png` y
 * `<id>-1920x1080.png`): la escena se dibuja a 1 píxel por punto (nivel
 * `orbit`), así que ésas son nítidas 1:1 y las de DPR 2 llevan el canvas
 * escalado ×2.
 *   · Awwwards: 1600 × 1200 (4:3) para la imagen principal; el resto de
 *     imágenes, libres. Centro de 1920 × 1200 → 1600 × 1200, sin escalar. PNG.
 *   · CSS Design Awards: 1068 × 646 en JPG de 150 KB como máximo. Centro de
 *     1920 × 1080 → 1785 × 1080 y reducción; la calidad JPEG baja hasta caber.
 *   · The FWA: el formulario no se pudo leer sin sesión; se deja el 16:9 a
 *     1920 × 1080 en JPG y las maestras enteras para recortar a lo que pida.
 *
 * Uso: node tools/awards-crops.mjs <carpeta-con-maestras>
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve(process.argv[2] ?? "../jonas-orbit-premios/capturas");
const masters = readdirSync(dir).filter((f) => /^[a-z-]+-(1920x1200|1920x1080|1170x2532-phone)\.png$/.test(f));
if (masters.length === 0) throw new Error(`Sin maestras en ${dir}`);

const ORDER = ["home", "projects", "project-omsta", "observatory-gargantua", "contact", "about", "education", "creativity", "experiments"];
const index = (id) => String(ORDER.indexOf(id) + 1).padStart(2, "0");

async function jpegUnder(image, target, maxBytes) {
  for (let quality = 90; quality >= 50; quality -= 5) {
    await image.clone().jpeg({ quality, mozjpeg: true }).toFile(target);
    if (statSync(target).size <= maxBytes) return quality;
  }
  return null;
}

for (const file of masters) {
  const [, id, size] = file.match(/^([a-z-]+)-(1920x1200|1920x1080|1170x2532-phone)\.png$/);
  const source = sharp(path.join(dir, file));
  if (size === "1920x1200") {
    // Awwwards 4:3, sin escalar: sólo se recortan 160 px por lado.
    const awwwards = path.join(dir, `awwwards-${index(id)}-${id}-1600x1200.png`);
    await source.clone().extract({ left: 160, top: 0, width: 1600, height: 1200 }).png().toFile(awwwards);
    console.log(path.basename(awwwards));
  }
  if (size === "1920x1080") {
    // CSSDA 1068 × 646 (≈ 1,653:1), JPG ≤ 150 KB
    const cssda = path.join(dir, `cssda-${index(id)}-${id}-1068x646.jpg`);
    const cropped = source.clone().extract({ left: 67, top: 0, width: 1785, height: 1080 }).resize(1068, 646);
    const quality = await jpegUnder(cropped, cssda, 150 * 1024);
    console.log(path.basename(cssda), quality ? `(q${quality}, ${Math.round(statSync(cssda).size / 1024)} KB)` : "(NO cabe en 150 KB)");
    const fwa = path.join(dir, `fwa-${index(id)}-${id}-1920x1080.jpg`);
    await source.clone().jpeg({ quality: 90, mozjpeg: true }).toFile(fwa);
    console.log(path.basename(fwa));
  }
  if (size === "1170x2532-phone") {
    const phone = path.join(dir, `awwwards-mobile-${index(id)}-${id}-1170x2532.png`);
    await source.clone().png().toFile(phone);
    console.log(path.basename(phone));
  }
}
