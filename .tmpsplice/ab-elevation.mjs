/**
 * A/B de elevación de cámara — EXPERIMENTO, no cambio.
 *
 * Parchea temporalmente lib/scene-poses.ts (elevación) y system-scene.ts
 * (uTime congelado, para que las tres tomas compartan fase exacta), construye,
 * captura, y al terminar restaura los dos ficheros.
 *
 * El original NO se lee del árbol de trabajo sino de git HEAD: si una pasada
 * anterior murió a mitad —y ya ha pasado— el árbol lleva su parche dentro y
 * copiarlo como "original" lo convertiría en permanente. HEAD es el único
 * estado que no depende de cómo terminó la vez anterior. Ambos ficheros están
 * limpios respecto a HEAD salvo por esos dos parches, comprobado con git diff.
 *
 * `node .tmpsplice/ab-elevation.mjs --restore` deshace todo desde HEAD.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";

const POSES = "lib/scene-poses.ts";
const SCENE = "components/scene/system-scene.ts";
const SHOTS =
  "C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad/shots";

mkdirSync(SHOTS, { recursive: true });

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: "pipe", shell: true, ...opts });
}

function restore() {
  sh("git", ["checkout", "--", POSES, SCENE]);
  console.log("restaurados desde HEAD:", POSES, "y", SCENE);
}

if (process.argv.includes("--restore")) {
  restore();
  process.exit(0);
}

restore();
const posesHead = sh("git", ["show", `HEAD:${POSES}`]).toString();
const sceneHead = sh("git", ["show", `HEAD:${SCENE}`]).toString();

// Fase temporal fija: sin esto cada captura sale con el disco en un punto
// distinto de su rotación y la comparación no compara.
const FROZEN = "marchMaterial.uniforms.uTime.value = 6.0; // A/B: fase fija";
const FROM = "marchMaterial.uniforms.uTime.value = elapsed;";
if (!sceneHead.includes(FROM)) throw new Error("no encuentro uTime del disco en HEAD");
writeFileSync(SCENE, sceneHead.replace(FROM, FROZEN));

if (!posesHead.includes("  elevation: 17,")) throw new Error("HEAD no está a 17°");

async function waitUp(url, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let server = null;
function killServer() {
  if (!server) return;
  try {
    sh("taskkill", ["/F", "/T", "/PID", String(server.pid)], { stdio: "ignore" });
  } catch {}
  server = null;
}

try {
  for (const deg of [17, 12, 9]) {
    writeFileSync(POSES, posesHead.replace("  elevation: 17,", `  elevation: ${deg},`));

    console.log(`\n=== ${deg}° · build ===`);
    sh("npm", ["run", "build"], { stdio: "ignore" });

    killServer();
    await new Promise((r) => setTimeout(r, 1500));
    server = spawn("npx", ["next", "start", "-p", "3100"], { shell: true, stdio: "ignore" });
    if (!(await waitUp("http://localhost:3100/es"))) throw new Error("servidor caído");

    console.log(`=== ${deg}° · captura ===`);
    sh("node", [".shot.mjs", `elev${deg}`]);
  }
} finally {
  killServer();
  restore();
}
console.log("\nhecho");
