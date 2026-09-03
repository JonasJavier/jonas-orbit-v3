import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";
const SCENE="components/scene/system-scene.ts";
const SHOTS="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";
const sh=(c,a,o={})=>execFileSync(c,a,{stdio:"pipe",shell:true,...o});
const FROM="marchMaterial.uniforms.uTime.value = elapsed;";
const TO='marchMaterial.uniforms.uTime.value = Number(new URLSearchParams(location.search).get("t") ?? "") || elapsed;';
const tag=process.argv[2]; const phases=process.argv.slice(3).map(Number);
let server=null;
try{
  const src=readFileSync(SCENE,"utf8");
  if(!src.includes(FROM)) throw new Error("no encuentro uTime");
  writeFileSync(SCENE, src.replace(FROM,TO));
  sh("npm",["run","build"],{stdio:"ignore"});
  server=spawn("npx",["next","start","-p","3100"],{shell:true,stdio:"ignore"});
  for(let i=0;i<90;i++){try{if((await fetch("http://localhost:3100/es")).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
  const b=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const ctx=await b.newContext({viewport:{width:1440,height:860},deviceScaleFactor:1,reducedMotion:"no-preference"});
  const page=await ctx.newPage();
  await page.addInitScript(()=>localStorage.setItem("jonas-orbit:efectos-forzados","true"));
  for(const t of phases){
    await page.goto(`http://localhost:3100/es?t=${t}`,{waitUntil:"load",timeout:120000});
    await page.waitForTimeout(15000);
    await page.screenshot({path:`${SHOTS}/${tag}-t${t}.png`,timeout:180000});
    console.log("capturado t="+t);
  }
  await b.close();
} finally {
  if(server){try{sh("taskkill",["/F","/T","/PID",String(server.pid)],{stdio:"ignore"});}catch{}}
  sh("git",["checkout","--",SCENE]);
  console.log("system-scene.ts restaurado");
}
