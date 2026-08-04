import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl — origen canónico del sitio", () => {
  it("cae al fallback de desarrollo cuando no está definido", () => {
    expect(resolveSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(resolveSiteUrl("")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("   ")).toBe("http://localhost:3000");
  });

  it("conserva el origen de producción", () => {
    expect(resolveSiteUrl("https://jonasorbit.com")).toBe(
      "https://jonasorbit.com",
    );
  });

  it("normaliza la barra final para no duplicarla al componer rutas", () => {
    expect(resolveSiteUrl("https://jonasorbit.com/")).toBe(
      "https://jonasorbit.com",
    );
    expect(resolveSiteUrl("https://jonasorbit.com///")).toBe(
      "https://jonasorbit.com",
    );
  });

  it("rompe el build ante un valor definido pero inválido", () => {
    // Un origen roto produce sitemap, canonical y OG rotos en silencio; es
    // preferible que falle el build a desplegarlo sin que nadie lo note.
    expect(() => resolveSiteUrl("jonasorbit.com")).toThrow(
      /URL absoluta válida/,
    );
    expect(() => resolveSiteUrl("ftp://jonasorbit.com")).toThrow(
      /http o https/,
    );
  });
});
