import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getF1AProjects } from "./projects";
import { projectOgImagePath } from "./site-metadata";

/** Ancho y alto de un JPEG, leídos del primer marcador SOF. */
function jpegSize(bytes: Buffer) {
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG sin marcador SOF");
}

describe("tarjetas para compartir de los casos", () => {
  it("cada caso publicado tiene su JPEG de 1200 × 630 y ligero", () => {
    for (const project of getF1AProjects("es")) {
      const src = projectOgImagePath(project.prose.featuredImage.src);
      expect(src, project.id).toMatch(/-og\.jpg$/);
      // Si falla, falta correr `node tools/prepare-projects.mjs`.
      const bytes = readFileSync(join(process.cwd(), "public", src));
      expect(bytes.subarray(0, 2).toString("hex"), project.id).toBe("ffd8");
      expect(jpegSize(bytes), project.id).toEqual({ width: 1200, height: 630 });
      expect(bytes.byteLength, project.id).toBeLessThan(300_000);
    }
  });
});
