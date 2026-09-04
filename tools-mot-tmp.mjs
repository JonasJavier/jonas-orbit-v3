import sharp from "sharp";
const box = { left: 655, top: 160, width: 175, height: 160 };
const names = process.argv.slice(2);
const frames = [];
for (const n of names) {
  const { data, info } = await sharp(`.shots/${n}.png`).extract(box).raw().toBuffer({ resolveWithObject: true });
  const lum = new Float32Array(data.length / info.channels);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j++) {
    lum[j] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  frames.push({ n, lum });
}
for (let a = 0; a < frames.length - 1; a++) {
  const A = frames[a], B = frames[a + 1];
  let moved = 0, cuerpoA = 0, cuerpoB = 0, ambos = 0, volteos = 0;
  for (let i = 0; i < A.lum.length; i++) {
    const d = Math.abs(A.lum[i] - B.lum[i]);
    if (d > 8) moved++;
    if (A.lum[i] > 20) cuerpoA++;
    if (B.lum[i] > 20) cuerpoB++;
    if (A.lum[i] > 20 && B.lum[i] > 20) ambos++;
    if ((A.lum[i] > 20) !== (B.lum[i] > 20)) volteos++;
  }
  const cuerpo = Math.max(cuerpoA, cuerpoB);
  console.log(
    `${A.n} → ${B.n}: cambian ${moved} px = ${((moved / cuerpo) * 100).toFixed(1)} % del cuerpo` +
    `   silueta estable ${((ambos / cuerpo) * 100).toFixed(1)} %` +
    `   píxeles que aparecen o desaparecen ${((volteos / cuerpo) * 100).toFixed(1)} %`,
  );
}
