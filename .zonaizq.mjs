import sharp from "sharp";
const S="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const L=32, Z=1.75;
const BOX={left:210,top:395,width:400,height:165};
const lab=(t,s,w)=>Buffer.from(`<svg width="${w}" height="${L}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${L}" fill="#0b0b0d"/><text x="12" y="22" font-family="monospace" font-size="15" fill="#e8e4dc" letter-spacing="2">${t}</text><text x="${w-12}" y="22" font-family="monospace" font-size="11" fill="#8a8681" text-anchor="end">${s}</text></svg>`);
const ROWS=[
  ["antes-t24","1 · ORIGINAL","hebra larga y aislada"],
  ["despues-t24","2 · COHESION","huecos mejor, hebra igual"],
  ["streamer2-t24","3 · FINAL","alcance sigue al material + corte compensado"],
];
const comp=[];let y=0,W=0;
for(const [f,t,s] of ROWS){
  const b=await sharp(`${S}/${f}.png`).extract(BOX).resize({width:Math.round(BOX.width*Z),kernel:"lanczos3"}).png().toBuffer();
  const m=await sharp(b).metadata(); W=Math.max(W,m.width);
  comp.push({input:lab(t,s,m.width),top:y,left:0}); y+=L;
  comp.push({input:b,top:y,left:0}); y+=m.height;
}
await sharp({create:{width:W,height:y,channels:3,background:"#0b0b0d"}}).composite(comp).png().toFile(`${S}/panel-izquierda.png`);
console.log("panel-izquierda.png",W+"x"+y);
