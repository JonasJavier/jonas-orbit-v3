/**
 * Dos diagnósticos que necesitan su propio build, seguidos, y con restauración
 * garantizada:
 *
 *  1. DEBUG_RAYS sobre el shader NUEVO — el canal verde codifica hits/3, o sea
 *     cuántas veces cruza el disco cada rayo. Es la respuesta objetiva a "¿los
 *     arcos que se ven debajo de la sombra son órdenes distintos, y cuáles?".
 *  2. Estabilidad temporal del shader ANTERIOR (el de HEAD) con la cámara ya a
 *     9°, para tener con qué comparar el número del nuevo. Un valor de hervor
 *     suelto no dice nada; lo que importa es si sube o baja.
 *
 * El shader nuevo está sin commitear, así que se guarda a un lado y se recupera
 * al final pase lo que pase.
 */
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";

const SHADER = "components/scene/gargantua-shaders.ts";
const SCENE = "components/scene/system-scene.ts";
const KEEP = ".tmpsplice/shader-nuevo.ts";

const sh = (c, a, o = {}) => execFileSync(c, a, { stdio: "pipe", shell: true, ...o });

copyFileSync(SHADER, KEEP);

let server = null;
const kill = () => {
  if (!server) return;
  try {
    sh("taskkill", ["/F", "/T", "/PID", String(server.pid)], { stdio: "ignore" });
  } catch {}
  server = null;
};
async function up() {
  kill();
  await new Promise((r) => setTimeout(r, 1500));
  server = spawn("npx", ["next", "start", "-p", "3100"], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch("http://localhost:3100/es")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("servidor caído");
}

try {
  // --- 1 · DEBUG_RAYS -----------------------------------------------------
  const sceneSrc = readFileSync(SCENE, "utf8");
  const FROM = "defines: { MAX_STEPS: TIER[tier].steps },";
  if (!sceneSrc.includes(FROM)) throw new Error("no encuentro los defines");
  writeFileSync(
    SCENE,
    sceneSrc.replace(FROM, "defines: { MAX_STEPS: TIER[tier].steps, DEBUG_RAYS: 1 },"),
  );
  console.log("=== build con DEBUG_RAYS ===");
  sh("npm", ["run", "build"], { stdio: "ignore" });
  await up();
  sh("node", [".shot.mjs", "debug-rays"]);
  console.log("captura de clasificacion lista");
  sh("git", ["checkout", "--", SCENE]);

  // --- 2 · estabilidad del shader anterior --------------------------------
  sh("git", ["checkout", "--", SHADER]);
  console.log("\n=== build del shader anterior (HEAD) a 9° ===");
  sh("npm", ["run", "build"], { stdio: "ignore" });
  await up();
  const out = sh("node", [".stab.mjs", "nine-previo"]).toString();
  console.log(out);
} finally {
  kill();
  sh("git", ["checkout", "--", SCENE]);
  copyFileSync(KEEP, SHADER);
  console.log("shader nuevo restaurado");
}
