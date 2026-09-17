/**
 * Guardián de backticks dentro del GLSL.
 *
 * Los shaders viven en template literals de JavaScript, así que un backtick
 * dentro de un comentario del shader CIERRA el literal. El build falla, y falla
 * apuntando a una línea de comentario en prosa, lo cual despista mucho: parece
 * un problema del contenido del comentario y no de un carácter.
 *
 * Es un error fácil de cometer justamente porque escribir `uRs` entre backticks
 * es la costumbre en el resto del archivo — fuera de los literales, donde sí es
 * correcto. Dentro del shader hay que dejar los identificadores en plano.
 *
 * Uso:
 *   node tools/glsl-check.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  LA LISTA SE DESCUBRE, NO SE ESCRIBE.

  `bodies.ts` entró en una lista a mano después de que el pase visual del
  Tesseracto metiera dos backticks en sus comentarios GLSL en la misma sesión.
  El guardián daba verde las dos veces porque sólo miraba el archivo de
  Gargantúa, y el error salía luego como un TS1005 apuntando a una línea de
  prosa — que es exactamente el despiste que este script existe para evitar.

  Y volvió a pasar. `observatory-sky.ts` nació con dos backticks en un
  comentario del shader, el guardián dijo «GLSL sin backticks» y el fallo
  apareció otra vez como un error de sintaxis en una línea de texto. La lección
  estaba escrita aquí arriba y aun así se repitió, porque lo que se arregló la
  primera vez fue la LISTA y no el mecanismo: una lista a mano se queda vieja
  el día que alguien escribe un shader nuevo, que es justo el día en que más
  falta hace.

  Ahora se buscan todos los archivos que abran un literal GLSL. Un shader nuevo
  queda cubierto por existir.
*/
const ROOTS = ["components", "lib", "app"];

function sources(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const OPEN = /\/\* glsl \*\/ `/;

const FILES = ROOTS.flatMap((root) => sources(root)).filter((file) =>
  OPEN.test(readFileSync(file, "utf8")),
);

let failed = false;
for (const file of FILES) {
  const bad = [];
  let inside = false;
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (!inside) {
        if (OPEN.test(line)) inside = true;
        return;
      }
      if (/^`;/.test(line)) {
        inside = false;
        return;
      }
      if (line.includes("`")) bad.push(`  ${file}:${i + 1}  ${line.trim().slice(0, 66)}`);
    });
  if (bad.length) {
    failed = true;
    console.error(`Backticks dentro del GLSL (cierran el template):\n${bad.join("\n")}`);
  }
}

if (failed) process.exit(1);
console.log(`GLSL sin backticks · ${FILES.length} archivos con shader`);
