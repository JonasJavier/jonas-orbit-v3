import sharp from "sharp";
const S="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const L=30, Z=1.9;
const lab=(t,w)=>Buffer.from(`<svg width="${w}" height="${L}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${L}" fill="#0b0b0d"/><text x="12" y="21" font-family="monospace" font-size="15" fill="#e8e4dc" letter-spacing="2">${t}</text></svg>`);
async function tile(file,box){
  const b=await sharp(`${S}/${file}.png`).extract(box).resize({width:Math.round(box.width*Z),kernel:"lanczos3"}).png().toBuffer();
  return {buf:b,w:Math.round(box.width*Z),h:Math.round(box.height*Z)};
}
const ZONES=[
  ["IZQUIERDA \u00b7 streamer exterior",{left:250,top:400,width:290,height:150}],
  ["DERECHA \u00b7 ventana en la banda",{left:760,top:380,width:290,height:150}],
];
const comp=[];let y=0,W=0;
for(const [name,box] of ZONES){
  for(const [file,tag] of [["antes-t24","ANTES"],["despues-t24","DESPUES"]]){
    const t=await tile(file,box); W=Math.max(W,t.w);
    comp.push({input:lab(`${name}  \u00b7  ${tag}`,t.w),top:y,left:0}); y+=L;
    comp.push({input:t.buf,top:y,left:0}); y+=t.h;
  }
}
await sharp({create:{width:W,height:y,channels:3,background:"#0b0b0d"}}).composite(comp).png().toFile(`${S}/panel-zonas.png`);
console.log("panel-zonas.png",W+"x"+y);
