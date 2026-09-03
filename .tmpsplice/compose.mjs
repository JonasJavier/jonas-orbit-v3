import sharp from "sharp";

const dir =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";

const CROP = { left: 300, top: 270, width: 760, height: 420 };
const W = CROP.width;
const H = CROP.height;
const LABEL = 34;

async function panel(src, text) {
  const img = await sharp(`${dir}/${src}.png`).extract(CROP).toBuffer();
  const svg = Buffer.from(
    `<svg width="${W}" height="${LABEL}">
       <rect width="100%" height="100%" fill="#000"/>
       <text x="14" y="23" font-family="monospace" font-size="15"
             letter-spacing="2" fill="#9fb3c8">${text}</text>
     </svg>`,
  );
  return sharp({
    create: { width: W, height: H + LABEL, channels: 3, background: "#000" },
  })
    .composite([
      { input: svg, top: 0, left: 0 },
      { input: img, top: LABEL, left: 0 },
    ])
    .png()
    .toBuffer();
}

const before = await panel("before", "ANTES");
const after = await panel("final", "DESPUES");

await sharp({
  create: {
    width: W,
    height: (H + LABEL) * 2 + 8,
    channels: 3,
    background: "#000",
  },
})
  .composite([
    { input: before, top: 0, left: 0 },
    { input: after, top: H + LABEL + 8, left: 0 },
  ])
  .toFile(`${dir}/before-after.png`);

console.log("before-after.png");
