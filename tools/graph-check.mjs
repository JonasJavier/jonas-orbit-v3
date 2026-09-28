#!/usr/bin/env node
/**
 * ¿El grafo de codebase-memory-mcp sigue limpio? (docs/ai/codebase-memory.md)
 *
 * Por qué existe: `auto_watch` mete en el grafo lo nuevo y lo editado, pero NO
 * saca lo borrado ni lo renombrado (medido el 2026-09-28: un .md eliminado
 * seguía dentro minutos después), y un reindexado encima tampoco lo limpia.
 * Los fantasmas se acumulan en silencio y el grafo empieza a mentir.
 *
 * Busca tres cosas:
 *   - fantasmas: rutas del grafo que ya no existen en disco;
 *   - ruido: rutas que .gitignore o .cbmignore excluyen (índice viejo);
 *   - grafos de más: otros proyectos indexados dentro de esta raíz (worktrees).
 *
 * Uso: `node tools/graph-check.mjs` → informe y exit 1 si hay algo.
 *      `--hook` (SessionStart de Claude Code) → silencio si está limpio, aviso
 *      breve si no, y exit 0 siempre: nunca bloquea una sesión.
 * El arreglo es del agente, desde el MCP: `delete_project` + `index_repository`
 * (con el servidor abierto la CLI no puede borrar la base).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const hook = process.argv.includes("--hook");
const root = resolve(import.meta.dirname, "..");
const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

function done(lines) {
  if (lines.length === 0) {
    if (!hook) console.log("Grafo limpio.");
    process.exit(0);
  }
  console.log(lines.join("\n"));
  process.exit(hook ? 0 : 1);
}

function cli(tool, args) {
  const result = spawnSync("codebase-memory-mcp", ["cli", tool, ...args], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.error || result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  } catch {
    return null;
  }
}

const listing = cli("list_projects", []);
if (!listing) {
  // Sin la herramienta instalada (CI, otro equipo) no hay grafo que vigilar.
  if (!hook) console.log("codebase-memory-mcp no responde: nada que comprobar.");
  process.exit(0);
}

const here = norm(root);
const own = listing.projects.find((p) => norm(p.root_path) === here);
const extra = listing.projects.filter(
  (p) => norm(p.root_path) !== here && norm(p.root_path).startsWith(`${here}/`),
);

const problems = [];
if (!own) {
  problems.push(
    `[grafo] Este repo no está indexado: index_repository(repo_path="${root.replace(/\\/g, "/")}").`,
  );
  done(problems);
}
for (const p of extra) {
  problems.push(`[grafo] Grafo de más dentro del repo: ${p.name} → delete_project("${p.name}").`);
}

const rows =
  cli("query_graph", [
    "--project", own.name,
    "--query", "MATCH (n) WHERE n.file_path IS NOT NULL RETURN DISTINCT n.file_path AS p",
    "--max-rows", "20000",
  ])?.rows ?? [];
// El indexador crea rutas sintéticas (`<python-builtins>`, `{}`) que no son archivos.
const paths = rows.map(([p]) => p).filter((p) => p && !/^[<{]/.test(p));

const ghosts = paths.filter((p) => !existsSync(resolve(root, p)));

// `--no-index` para que los patrones de .cbmignore alcancen también a lo versionado
// (docs/reference/v2/); `core.excludesFile` suma .cbmignore a los .gitignore.
const ignoredRun = spawnSync(
  "git",
  ["-c", "core.excludesFile=.cbmignore", "check-ignore", "--no-index", "--stdin"],
  { cwd: root, input: paths.join("\n"), encoding: "utf8" },
);
const noise = (ignoredRun.stdout ?? "").split(/\r?\n/).filter(Boolean);

const sample = (list) => list.slice(0, 5).join(", ") + (list.length > 5 ? ", …" : "");
if (ghosts.length) {
  problems.push(`[grafo] ${ghosts.length} rutas borradas siguen en el grafo: ${sample(ghosts)}.`);
}
if (noise.length) {
  problems.push(`[grafo] ${noise.length} rutas excluidas por .gitignore/.cbmignore están dentro: ${sample(noise)}.`);
}
if (ghosts.length || noise.length) {
  problems.push(
    `[grafo] Reconstruye desde el MCP: delete_project("${own.name}") + index_repository(repo_path="${root.replace(/\\/g, "/")}", mode="full"). Guía: docs/ai/codebase-memory.md.`,
  );
}
done(problems);
