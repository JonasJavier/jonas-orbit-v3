/**
 * Los fondos de pantalla de Gargantúa, listos para publicar (2026-10-16).
 *
 * Entrada: la carpeta de `tools/wallpaper-shots.mjs` (`<vista>-4k.png`,
 * 3840 × 2160, y `<vista>-phone.png`, 1440 × 3120, capturas nativas con GPU
 * real). Salida en `public/images/articulos/fondos-gargantua/`, con los
 * nombres que la entrada `gargantua-wallpapers` nombra en
 * `content/articles.data.ts`:
 *
 *   escritorio  `<base>-800.webp` y `<base>-1600.webp` (las figuras, 16:9)
 *               `<base>.jpg` (3840 × 2160, la descarga)
 *   teléfono    `<base>-400.webp` y `<base>-800.webp` (las figuras, vertical)
 *               `<base>.jpg` (1440 × 3120, la descarga)
 *   portada     `<base>-og.jpg` (1200 × 630) de la cinematográfica
 *
 * El nombre del archivo es parte del SEO de imágenes (Google lo lee): lleva
 * «gargantua», «interstellar», «wallpaper» y el formato. Los JPG de descarga
 * llevan XMP con autor, crédito, aviso de copyright y la URL de la licencia:
 * es lo que Google Imágenes lee para la etiqueta «Con licencia» y lo que
 * viaja con el archivo cuando alguien lo comparte.
 *
 *   node tools/prepare-wallpapers.mjs <carpeta-con-png>
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input) {
  console.error("Uso: node tools/prepare-wallpapers.mjs <carpeta-con-png>");
  process.exit(1);
}
const output = path.join(process.cwd(), "public/images/articulos/fondos-gargantua");
await mkdir(output, { recursive: true });

const LICENSE_URL = "https://jonasjavier.dev/en/blog/gargantua-wallpapers-4k-interstellar-black-hole#license";
const CREATOR = "Jonás Javier Encarnación";
const COPYRIGHT = "© 2026 Jonás Javier Encarnación. Free for personal use as a wallpaper.";

const xmp = (title) => `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"
    photoshop:Credit="Jonás Javier"
    xmpRights:WebStatement="${LICENSE_URL}"
    xmpRights:Marked="True">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>${CREATOR}</rdf:li></rdf:Seq></dc:creator>
   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${COPYRIGHT}</rdf:li></rdf:Alt></dc:rights>
   <plus:Licensor><rdf:Seq><rdf:li rdf:parseType="Resource">
    <plus:LicensorURL>${LICENSE_URL}</plus:LicensorURL>
   </rdf:li></rdf:Seq></plus:Licensor>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

/** Vista capturada → nombre publicado y título del XMP. */
const DESKTOP = [
  ["cinematic", "gargantua-interstellar-wallpaper-4k-cinematic", "Gargantua, Interstellar's black hole — 4K wallpaper"],
  ["film", "gargantua-interstellar-wallpaper-4k-film", "Gargantua without Doppler, as in the film — 4K wallpaper"],
  ["lens", "gargantua-interstellar-wallpaper-4k-lens", "Gargantua's gravitational lens — 4K wallpaper"],
  ["disk", "gargantua-interstellar-wallpaper-4k-disk", "Gargantua's accretion disk from above — 4K wallpaper"],
  ["shadow", "gargantua-interstellar-wallpaper-4k-shadow", "Gargantua's shadow up close — 4K wallpaper"],
];
const PHONE = [
  ["cinematic", "gargantua-interstellar-wallpaper-phone-cinematic", "Gargantua, Interstellar's black hole — phone wallpaper"],
  ["lens", "gargantua-interstellar-wallpaper-phone-lens", "Gargantua's gravitational lens — phone wallpaper"],
  ["shadow", "gargantua-interstellar-wallpaper-phone-shadow", "Gargantua's shadow — phone wallpaper"],
];

for (const [view, base, title] of DESKTOP) {
  const source = path.join(input, `${view}-4k.png`);
  await sharp(source).resize({ width: 1600, height: 900 }).webp({ quality: 84 }).toFile(path.join(output, `${base}-1600.webp`));
  await sharp(source).resize({ width: 800, height: 450 }).webp({ quality: 82 }).toFile(path.join(output, `${base}-800.webp`));
  await sharp(source).jpeg({ quality: 90, mozjpeg: true }).withXmp(xmp(title)).toFile(path.join(output, `${base}.jpg`));
  console.log(base);
}
for (const [view, base, title] of PHONE) {
  const source = path.join(input, `${view}-phone.png`);
  await sharp(source).resize({ width: 800 }).webp({ quality: 82 }).toFile(path.join(output, `${base}-800.webp`));
  await sharp(source).resize({ width: 400 }).webp({ quality: 80 }).toFile(path.join(output, `${base}-400.webp`));
  await sharp(source).jpeg({ quality: 90, mozjpeg: true }).withXmp(xmp(title)).toFile(path.join(output, `${base}.jpg`));
  console.log(base);
}
// La tarjeta al compartir la entrada (`articleMetadata` pide `<portada>-og.jpg`).
const cover = DESKTOP[0][1];
await sharp(path.join(input, "cinematic-4k.png"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(output, `${cover}-og.jpg`));
console.log(`${cover}-og.jpg`);
