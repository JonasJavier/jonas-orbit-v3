import sharp from "sharp";
const SHOTS="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const CROP={left:250,top:300,width:900,height:300};
const L=34;
const lab=(t,s,w)=>Buffer.from(`<svg width="${w}" height="${L}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${L}" fill="#0b0b0d"/><text x="14" y="23" font-family="monospace" font-size="16" fill="#e8e4dc" letter-spacing="2">${t}</text><text x="${w-14}" y="23" font-family="monospace" font-size="12" fill="#8a8681" text-anchor="end">${s}</text></svg>`);
const rows=[["antes-t24","ANTES · fase t=24","banda seccionada a la derecha · streamer aislado a la izquierda"],["despues-t24","DESPUES · fase t=24","mismo fotograma, misma fase"]];
const comp=[];let y=0;
for(const [f,t,s] of rows){
  const buf=await sharp(`${SHOTS}/${f}.png`).extract(CROP).png().toBuffer();
  comp.push({input:lab(t,s,CROP.width),top:y,left:0}); y+=L;
  comp.push({input:buf,top:y,left:0}); y+=CROP.height;
}
await sharp({create:{width:CROP.width,height:y,channels:3,background:"#0b0b0d"}}).composite(comp).png().toFile(`${SHOTS}/panel-huecos.png`);
console.log("panel-huecos.png",CROP.width+"x"+y);
