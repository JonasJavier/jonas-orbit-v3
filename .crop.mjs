import sharp from "sharp";
const dir = "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const [src, out, x, y, w, h, scale] = process.argv.slice(2);
await sharp(`${dir}/${src}.png`)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: Math.round(+w * (+scale || 1)), kernel: "nearest" })
  .toFile(`${dir}/${out}.png`);
console.log("ok");
