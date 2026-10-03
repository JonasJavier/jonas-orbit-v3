/**
 * Recortes por formulario a partir de las maestras de `awards-shots.mjs`.
 *
 * Cada premio pide un tamaño distinto y ninguno coincide con la pantalla:
 *   · Awwwards: 1600 × 1200 (4:3) para la imagen principal; el resto de
 *     imágenes, libres. Se recorta el centro de la maestra 2880 × 1800 a
 *     2400 × 1800 y se escala. PNG.
 *   · CSS Design Awards: 1068 × 646 en JPG de 150 KB como máximo. Se recorta
 *     el centro de la maestra a 2880 × 1742 y se escala; la calidad JPEG baja
 *     hasta caber en 150 KB.
 *   · The FWA: el formulario no se pudo leer sin sesión; se deja un 16:9 a
 *     1920 × 1080 en JPG desde la maestra 3840 × 2160 y las maestras enteras
 *     para recortar a lo que pida.
 *
 * Uso: node tools/awards-crops.mjs <carpeta-con-maestras>
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve(process.argv[2] ?? "../jonas-orbit-premios/capturas");
const masters = readdirSync(dir).filter((f) => /^[a-z-]+-(2880x1800|3840x2160|1170x2532-phone)\.png$/.test(f));
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
  const [, id, size] = file.match(/^([a-z-]+)-(2880x1800|3840x2160|1170x2532-phone)\.png$/);
  const source = sharp(path.join(dir, file));
  if (size === "2880x1800") {
    // Awwwards 4:3
    const awwwards = path.join(dir, `awwwards-${index(id)}-${id}-1600x1200.png`);
    await source.clone().extract({ left: 240, top: 0, width: 2400, height: 1800 }).resize(1600, 1200).png().toFile(awwwards);
    // CSSDA 1068 × 646 (≈ 1.653:1), JPG ≤ 150 KB
    const cssda = path.join(dir, `cssda-${index(id)}-${id}-1068x646.jpg`);
    const cropped = source.clone().extract({ left: 0, top: 29, width: 2880, height: 1742 }).resize(1068, 646);
    const quality = await jpegUnder(cropped, cssda, 150 * 1024);
    console.log(path.basename(awwwards), "·", path.basename(cssda), quality ? `(q${quality}, ${Math.round(statSync(cssda).size / 1024)} KB)` : "(NO cabe en 150 KB)");
  }
  if (size === "3840x2160") {
    const fwa = path.join(dir, `fwa-${index(id)}-${id}-1920x1080.jpg`);
    await source.clone().resize(1920, 1080).jpeg({ quality: 90, mozjpeg: true }).toFile(fwa);
    console.log(path.basename(fwa));
  }
  if (size === "1170x2532-phone") {
    const phone = path.join(dir, `awwwards-mobile-${index(id)}-${id}-1170x2532.png`);
    await source.clone().png().toFile(phone);
    console.log(path.basename(phone));
  }
}
