/**
 * Regenera los iconos rasterizados del sitio a partir de las fuentes SVG.
 *
 *   node docs/design/favicon/generate.mjs
 *
 * Entradas
 *   app/icon.svg                        — obra completa (Gargantúa).
 *   docs/design/favicon/gargantua-16.svg — misma silueta engordada. A 16 y 24 px
 *     los arcos de la obra completa caen por debajo de un pixel y se apagan;
 *     esta variante los sube a ~1.3 px para que sobrevivan al downsampling.
 *
 * Salidas
 *   app/favicon.ico    — 16/24 desde la variante, 32/48 desde la obra. Solo lo
 *     usan Safari y los rastreadores que piden /favicon.ico a ciegas; el resto
 *     de navegadores toma app/icon.svg, que es nítido a cualquier densidad.
 *   app/apple-icon.png — 180 px a sangre. iOS aplica su propia máscara, así que
 *     la teja se rasteriza con las esquinas rectas (rx=0) para no redondear dos
 *     veces.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const density = 1400;

/** Empaqueta PNGs en un contenedor ICO (soportado por todo navegador actual). */
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: icono
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(16 * frames.length);
  let offset = header.length + directory.length;

  frames.forEach((frame, i) => {
    const at = i * 16;
    directory.writeUInt8(frame.size >= 256 ? 0 : frame.size, at);
    directory.writeUInt8(frame.size >= 256 ? 0 : frame.size, at + 1);
    directory.writeUInt8(0, at + 2); // paleta
    directory.writeUInt8(0, at + 3); // reservado
    directory.writeUInt16LE(1, at + 4); // planos
    directory.writeUInt16LE(32, at + 6); // bits por pixel
    directory.writeUInt32LE(frame.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += frame.data.length;
  });

  return Buffer.concat([header, directory, ...frames.map((f) => f.data)]);
}

const render = (svg, size) =>
  sharp(svg, { density }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const artwork = await readFile(`${root}app/icon.svg`);
const small = await readFile(`${root}docs/design/favicon/gargantua-16.svg`);

const ico = buildIco([
  { size: 16, data: await render(small, 16) },
  { size: 24, data: await render(small, 24) },
  { size: 32, data: await render(artwork, 32) },
  { size: 48, data: await render(artwork, 48) },
]);
await writeFile(`${root}app/favicon.ico`, ico);

const squared = Buffer.from(artwork.toString("utf8").replaceAll('rx="7"', 'rx="0"'));
await sharp(squared, { density })
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(`${root}app/apple-icon.png`);

console.log(`favicon.ico ${ico.length} B · apple-icon.png 180x180`);
