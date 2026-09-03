import sharp from "sharp";
const dir = "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
for (const tag of ["baseline", "after"]) {
  for (const pair of ["ab", "bc"]) {
    const { data, info } = await sharp(`${dir}/${tag}-diff-${pair}.png`).raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    let lap = 0, n = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      lap += Math.abs(4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w]);
      n++;
    }
    console.log(`${tag} ${pair}: energia de alta frecuencia del diff = ${(lap / n).toFixed(2)}`);
  }
}
