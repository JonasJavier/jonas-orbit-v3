import sharp from "sharp";
const S="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const L=32;
const lab=(t,s,w)=>Buffer.from(`<svg width="${w}" height="${L}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${L}" fill="#0b0b0d"/><text x="12" y="22" font-family="monospace" font-size="15" fill="#e8e4dc" letter-spacing="2">${t}</text><text x="${w-12}" y="22" font-family="monospace" font-size="11" fill="#8a8681" text-anchor="end">${s}</text></svg>`);
async function panel(name,box,zoom,rows){
  const comp=[];let y=0,W=0;
  for(const [f,t,s] of rows){
    const b=await sharp(`${S}/${f}.png`).extract(box).resize({width:Math.round(box.width*zoom),kernel:"lanczos3"}).png().toBuffer();
    const m=await sharp(b).metadata(); W=Math.max(W,m.width);
    comp.push({input:lab(t,s,m.width),top:y,left:0}); y+=L;
    comp.push({input:b,top:y,left:0}); y+=m.height;
  }
  await sharp({create:{width:W,height:y,channels:3,background:"#0b0b0d"}}).composite(comp).png().toFile(`${S}/${name}.png`);
  console.log(name+".png",W+"x"+y);
}
const ROWS=[["streamer2-t24","ANTES","version anterior"],["cont-t24","DESPUES","continuidad corregida"]];
await panel("fin-izquierda",{left:210,top:395,width:400,height:165},1.75,ROWS);
await panel("fin-derecha",{left:740,top:375,width:400,height:165},1.75,ROWS);
await panel("fin-completo",{left:250,top:290,width:900,height:310},1.0,ROWS);
