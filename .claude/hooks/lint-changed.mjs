#!/usr/bin/env node
/**
 * PostToolUse hook: pasa ESLint por el archivo que Claude acaba de tocar.
 *
 * Por qué existe: `npm run lint` usa `--max-warnings=0`, así que un warning
 * tonto rompe CI. Detectarlo en el momento de la edición cuesta ~2 s; detectarlo
 * en CI cuesta un ciclo de push. El hook NO reescribe el archivo (nada de
 * `--fix` silencioso): solo informa, y deja la corrección al criterio del agente.
 *
 * Contrato de hooks: exit 0 = silencio; exit 2 = el stderr vuelve al modelo.
 * Cualquier fallo del propio hook sale con 0 para no bloquear nunca la sesión.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, isAbsolute } from "node:path";

const LINTABLE = /\.(ts|tsx|mjs)$/;
const LINTED_ROOTS = ["app", "components", "lib", "content", "e2e"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== "string" || !LINTABLE.test(filePath)) process.exit(0);

const cwd = payload?.cwd ?? process.cwd();
const rel = (isAbsolute(filePath) ? relative(cwd, filePath) : filePath).replace(
  /\\/g,
  "/",
);
// Fuera del repo, o en un directorio que ESLint no cubre: no hay nada que decir.
if (rel.startsWith("..") || !LINTED_ROOTS.some((root) => rel.startsWith(`${root}/`))) {
  process.exit(0);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["eslint", "--max-warnings=0", "--format=compact", rel],
  { cwd, encoding: "utf8", shell: false },
);

// El hook falló (npx ausente, timeout): no es problema del código editado.
if (result.error || result.status === null) process.exit(0);
if (result.status === 0) process.exit(0);

process.stderr.write(
  `ESLint falla en ${rel} (el repo compila con --max-warnings=0):\n` +
    `${result.stdout || ""}${result.stderr || ""}`,
);
process.exit(2);
