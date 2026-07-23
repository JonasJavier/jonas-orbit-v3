import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@/content/worlds.data";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { getWorld, getWorlds } from "./worlds";

describe("getWorld / getWorlds (composición id + locale)", () => {
  it("compone estructura y prosa para cada mundo de cada idioma publicado", () => {
    // Itera PUBLISHED_LOCALES: en F1A cubre solo es; al publicar en (F2A) la
    // cobertura de A1 se extiende automáticamente sin tocar el test.
    for (const locale of PUBLISHED_LOCALES) {
      for (const id of WORLD_IDS) {
        const world = getWorld(id, locale);
        expect(world.id).toBe(id);
        expect(world.prose.locale).toBe(locale);
        expect(world.prose.title.length).toBeGreaterThan(0);
        expect(world.prose.facts.length).toBeGreaterThan(0);
        expect(world.prose.panels.length).toBeGreaterThan(0);
        expect(world.accent).toMatch(/^#/);
      }
    }
  });

  it("lanza error claro para un idioma sin prosa (en no publicado)", () => {
    expect(() => getWorld("miller", "en")).toThrow(/miller.*en/);
  });

  it("devuelve los 7 mundos en orden narrativo", () => {
    const worlds = getWorlds("es");
    expect(worlds.map((w) => w.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(worlds[0].id).toBe("tesseract");
    expect(worlds[6].id).toBe("ranger");
  });

  it("los slugs de ancla son únicos dentro del idioma", () => {
    const slugs = getWorlds("es").map((w) => w.prose.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("Marketing Digital aparece como carrera completada (corrección de v2)", () => {
    const cooper = getWorld("cooper-station", "es");
    // Objetivo específico: el fact de Marketing Digital, no un regex sobre todo
    // el JSON (que rompería ante cualquier sinónimo editorial).
    const marketing = cooper.prose.facts.find(
      (fact) => fact.label === "Marketing Digital",
    );
    expect(marketing?.value).toMatch(/completada/i);
    // Y en ningún punto se describe como carrera en curso.
    const text = JSON.stringify(cooper.prose);
    expect(text).not.toMatch(/actualmente estudio|carrera en curso/i);
  });
});
