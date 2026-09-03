import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";

const CROP = { left: 300, top: 250, width: 840, height: 420 };
const LABEL = 38;

const PANELS = [
  ["elev9", "9\u00b0 \u00b7 ANTES", "arcos apilados \u00b7 espiral macro \u00b7 medios beige"],
  ["nine", "9\u00b0 \u00b7 DESPUES", "orden 2+ exponencial \u00b7 flujo en bandas \u00b7 oro/ambar/cobre"],
];

function label(text, sub, w) {
  return Buffer.from(
    `<svg width="${w}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${LABEL}" fill="#0b0b0d"/>
      <text x="16" y="25" font-family="monospace" font-size="18" fill="#e8e4dc"
        letter-spacing="2">${text}</text>
      <text x="${w - 16}" y="25" font-family="monospace" font-size="12" fill="#8a8681"
        letter-spacing="1" text-anchor="end">${sub}</text>
    </svg>`,
  );
}

const composites = [];
let y = 0;
for (const [file, title, sub] of PANELS) {
  const buf = await sharp(`${dir}/${file}.png`).extract(CROP).png().toBuffer();
  composites.push({ input: label(title, sub, CROP.width), top: y, left: 0 });
  y += LABEL;
  composites.push({ input: buf, top: y, left: 0 });
  y += CROP.height;
}

await sharp({
  create: { width: CROP.width, height: y, channels: 3, background: "#0b0b0d" },
})
  .composite(composites)
  .png()
  .toFile(`${dir}/panel-antes-despues.png`);
console.log(`panel-antes-despues.png  ${CROP.width}x${y}`);
