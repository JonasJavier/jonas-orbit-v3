/**
 * Panel comparativo de elevación. Mismo recorte en coordenadas de PANTALLA para
 * los tres: la distancia de encuadre la recalcula la escena con cada elevación,
 * así que recortar "centrado en Gargantúa" en cada uno escondería justo lo que
 * se quiere ver — cuánto cambia su tamaño y su sitio en el cuadro.
 */
import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";

const ANGLES = [17, 12, 9];
const LABEL = 34;

function label(text, w, sub) {
  const svg = `<svg width="${w}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${LABEL}" fill="#0b0b0d"/>
    <text x="14" y="23" font-family="monospace" font-size="17" fill="#e8e4dc"
      letter-spacing="2">${text}</text>
    <text x="${w - 14}" y="23" font-family="monospace" font-size="13" fill="#8a8681"
      letter-spacing="1" text-anchor="end">${sub}</text>
  </svg>`;
  return Buffer.from(svg);
}

async function stack(name, extract, scale, sub) {
  const tiles = [];
  let W = 0;
  let H = 0;
  for (const deg of ANGLES) {
    let img = sharp(`${dir}/elev${deg}.png`);
    if (extract) img = img.extract(extract);
    if (scale && scale !== 1) {
      const w = Math.round((extract ? extract.width : 1440) * scale);
      img = img.resize({ width: w });
    }
    const buf = await img.png().toBuffer();
    const meta = await sharp(buf).metadata();
    tiles.push({ deg, buf, w: meta.width, h: meta.height });
    W = Math.max(W, meta.width);
    H += meta.height + LABEL;
  }

  const composites = [];
  let y = 0;
  for (const t of tiles) {
    composites.push({ input: label(`ELEVACION ${t.deg}\u00b0`, W, sub(t.deg)), top: y, left: 0 });
    y += LABEL;
    composites.push({ input: t.buf, top: y, left: 0 });
    y += t.h;
  }

  await sharp({
    create: { width: W, height: H, channels: 3, background: "#0b0b0d" },
  })
    .composite(composites)
    .png()
    .toFile(`${dir}/${name}.png`);
  console.log(`${name}.png  ${W}x${H}`);
}

const NOTE = {
  17: "baseline actual",
  12: "experimento",
  9: "experimento",
};

// Recorte fijo alrededor del centro del cuadro, donde vive Gargantua.
await stack("panel-gargantua", { left: 330, top: 210, width: 800, height: 470 }, 1, (d) => NOTE[d]);
await stack("panel-completo", null, 0.62, (d) => `${NOTE[d]} \u00b7 1440x860`);
