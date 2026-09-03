import { readFileSync, writeFileSync } from "node:fs";

const path = "components/scene/gargantua-shaders.ts";
const raw = readFileSync(path, "utf8");
const crlf = raw.includes("\r\n");
const lines = raw.replace(/\r\n/g, "\n").split("\n");

const disk = readFileSync(".tmpsplice/disk.txt", "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\n$/, "");
const fbmaa3 = readFileSync(".tmpsplice/fbmaa3.txt", "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\n$/, "");

const sigIdx = lines.findIndex((l) => l.startsWith("vec3 diskSample("));
if (sigIdx < 0) throw new Error("no diskSample");
let endIdx = -1;
for (let i = sigIdx + 1; i < lines.length; i++) {
  if (lines[i] === "}") {
    endIdx = i;
    break;
  }
}
if (endIdx < 0) throw new Error("no close brace");
console.log(
  `diskSample body: ${endIdx - sigIdx - 1} lines -> ${disk.split("\n").length}`,
);

const fbm3Idx = lines.findIndex((l) => l.startsWith("/** Tres octavas,"));
if (fbm3Idx < 0) throw new Error("no fbm3 comment");
if (fbm3Idx > sigIdx) throw new Error("orden inesperado");

const out = [
  ...lines.slice(0, fbm3Idx),
  ...fbmaa3.split("\n"),
  ...lines.slice(fbm3Idx, sigIdx + 1),
  ...disk.split("\n"),
  ...lines.slice(endIdx),
];

const text = out.join("\n");
writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text);
console.log("spliced ->", out.length, "lines");
