import sharp from "sharp";
const file = process.argv[2] ?? "f2-a";
const box = { left: 655, top: 160, width: 175, height: 160 };
const { data, info } = await sharp(`.shots/${file}.png`).extract(box).raw().toBuffer({ resolveWithObject: true });
let grafito = 0, medio = 0, alto = 0, r = 0, g = 0, b = 0, n = 0;
for (let i = 0; i < data.length; i += info.channels) {
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (l < 14) continue;            // fondo / estrellas tenues
  n++; r += data[i]; g += data[i + 1]; b += data[i + 2];
  if (l < 55) grafito++; else if (l < 110) medio++; else alto++;
}
const pc = (x) => ((x / n) * 100).toFixed(1) + " %";
console.log(`${file}: píxeles de cuerpo ${n}`);
console.log(`  grafito (<55)   ${pc(grafito)}`);
console.log(`  medio  (55-110) ${pc(medio)}`);
console.log(`  highlight (>110)${pc(alto)}`);
console.log(`  color medio  R${(r/n).toFixed(0)} G${(g/n).toFixed(0)} B${(b/n).toFixed(0)}  (calidez R/B = ${(r/b).toFixed(2)})`);
