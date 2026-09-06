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
import { readFileSync } from "node:fs";

/*
  `bodies.ts` entró en la lista después de que el pase visual del Tesseracto
  metiera dos backticks en sus comentarios GLSL en la misma sesión. El guardián
  daba verde las dos veces porque sólo miraba el archivo de Gargantúa, y el
  error salía luego como un TS1005 apuntando a una línea de prosa — que es
  exactamente el despiste que este script existe para evitar.
*/
const FILES = [
  "components/scene/gargantua-shaders.ts",
  "components/scene/bodies.ts",
  "components/scene/tesseract-model.ts",
];
const OPEN = /\/\* glsl \*\/ `/;

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
console.log("GLSL sin backticks");
