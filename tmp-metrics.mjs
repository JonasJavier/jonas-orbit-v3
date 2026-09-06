import sharp from "sharp";
import { resolve } from "node:path";
const dir = resolve(process.env.SHOTS_DIR ?? ".shots");
const [x, y, w, h, ...names] = process.argv.slice(2);
for (const name of names) {
  const { data } = await sharp(`${dir}/${name}.png`)
    .extract({ left: +x, top: +y, width: +w, height: +h }).raw().toBuffer({ resolveWithObject: true });
  let n = 0, sum = 0, sum2 = 0, warm = 0, cool = 0, dark = 0;
  const lumas = [];
  for (let i = 0; i < data.length; i += 3) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    lumas.push(l); n++; sum += l; sum2 += l * l; warm += data[i]; cool += data[i + 2];
    if (l < 12) dark++;
  }
  lumas.sort((a, b) => a - b);
  const mean = sum / n, std = Math.sqrt(sum2 / n - mean * mean);
  console.log(name.padEnd(12), "media", mean.toFixed(1), "contraste", (std / mean).toFixed(3),
    "p50", lumas[Math.floor(n * 0.5)].toFixed(0), "p95", lumas[Math.floor(n * 0.95)].toFixed(0),
    "cálido/frío", (warm / cool).toFixed(3), "% negro", ((dark / n) * 100).toFixed(1));
}
