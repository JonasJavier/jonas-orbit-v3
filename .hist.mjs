import sharp from "sharp";
const S="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const BAND={left:250,top:355,width:900,height:190};
const SH={cx:668-BAND.left,cy:448-BAND.top,r:95};
console.log("fotograma        negro<8   residual8-25  tenue25-60  material>60");
for(const f of process.argv.slice(2)){
  const {data,info}=await sharp(`${S}/${f}.png`).extract(BAND).greyscale().raw().toBuffer({resolveWithObject:true});
  let b=[0,0,0,0],tot=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    if(Math.hypot(x-SH.cx,y-SH.cy)<SH.r)continue;
    const v=data[y*info.width+x];tot++;
    if(v<8)b[0]++;else if(v<25)b[1]++;else if(v<60)b[2]++;else b[3]++;
  }
  console.log(f.padEnd(16)+b.map(n=>((100*n)/tot).toFixed(1).padStart(8)+" %").join(""));
}
