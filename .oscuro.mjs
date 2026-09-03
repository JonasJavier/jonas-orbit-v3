/**
 * Área oscura DENTRO de la banda del disco frontal, excluida la sombra.
 * Es la métrica del defecto: cuanto más alta, más "recortes" negros hay.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const SHOTS =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const BAND = { left: 250, top: 355, width: 900, height: 190 };
const SH = { cx: 668 - BAND.left, cy: 448 - BAND.top, r: 95 };

export async function darkArea(file) {
  const { data, info } = await sharp(file)
    .extract(BAND)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let dark = 0;
  let tot = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (Math.hypot(x - SH.cx, y - SH.cy) < SH.r) continue;
      tot++;
      if (data[y * info.width + x] < 14) dark++;
    }
  }
  return (100 * dark) / tot;
}

if (process.argv[2]) {
  for (const f of process.argv.slice(2)) {
    const p = `${SHOTS}/${f}.png`;
    if (!existsSync(p)) {
      console.log(`${f.padEnd(14)} (no existe)`);
      continue;
    }
    console.log(`${f.padEnd(14)} area oscura ${(await darkArea(p)).toFixed(1)} %`);
  }
}
