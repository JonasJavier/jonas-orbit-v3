import sharp from "sharp";
const img = sharp("assets/experimentos/observatorio.png").removeAlpha().greyscale();
const { width: W, height: H } = await img.metadata();
const data = await img.raw().toBuffer();
const px = (x,y) => data[y*W+x];
const cols = [];
for (let c=0;c<32;c++){
  const x0 = Math.floor(c*W/32), x1 = Math.floor((c+1)*W/32);
  let s=0,n=0;
  for (let x=x0;x<x1;x++) for (let y=0;y<H;y++){ s+=px(x,y); n++; }
  cols.push(Math.round(s/n));
}
console.log("W,H:", W, H);
console.log("medias por columna (32):", cols.join(","));
const at = (p) => {
  const x0=Math.max(0,Math.floor((p-0.005)*W)), x1=Math.min(W,Math.ceil((p+0.005)*W));
  let s=0,n=0; for(let x=x0;x<x1;x++) for(let y=0;y<H;y++){s+=px(x,y);n++;}
  return Math.round(s/n);
};
console.log("--- medias de banda 1% ---");
for (const p of [0.01,0.03,0.12,0.2,0.26,0.30,0.5,0.7,0.79,0.85,0.875,0.90,0.95,0.97,0.99]) {
  console.log(`x=${(p*100).toFixed(1)}% media=${at(p)}`);
}
const prof = (p) => {
  const x0=Math.max(0,Math.floor((p-0.004)*W)), x1=Math.min(W,Math.ceil((p+0.004)*W));
  const out=[];
  for (let b=0;b<24;b++){
    const y0=Math.floor(b*H/24), y1=Math.floor((b+1)*H/24);
    let s=0,n=0,mx=0; for(let x=x0;x<x1;x++) for(let y=y0;y<y1;y++){const v=px(x,y); s+=v;n++; if(v>mx)mx=v;}
    out.push(`${Math.round(b/24*100)}%:${Math.round(s/n)}/${mx}`);
  }
  return out.join(" ");
};
console.log("--- perfiles verticales (media/max por banda de 4.2% de alto) ---");
for (const p of [0.15,0.21,0.30,0.36,0.41,0.59]) console.log(`x=${(p*100)|0}%:`, prof(p));
