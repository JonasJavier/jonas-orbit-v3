import { describe, expect, it } from "vitest";
import { WORLD_IDS } from "@/content/worlds.data";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import {
  BESPOKE_WORLD_IDS,
  RESERVED_SEGMENTS,
  getWorld,
  getWorldBySlug,
  getWorldNavItems,
  getWorldNeighbours,
  getWorldPath,
  getWorlds,
} from "./worlds";

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

  it("devuelve los 6 mundos en orden narrativo", () => {
    const worlds = getWorlds("es");
    expect(worlds.map((w) => w.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(worlds[0].id).toBe("tesseract");
    expect(worlds[5].id).toBe("ranger");
  });

  it("los slugs de ruta son únicos dentro del idioma", () => {
    const slugs = getWorlds("es").map((w) => w.prose.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

});

/**
 * G1 (matriz del pivote): cada WorldId resuelve a su ruta y viceversa; una ruta
 * desconocida no resuelve a ningún mundo.
 *
 * Cubre el riesgo de "mundo inalcanzable o duplicado": con 7 rutas reales, un
 * slug repetido o colisionando con una carpeta estática deja un mundo sin
 * página y nadie se entera hasta producción.
 */
describe("G1 · contrato de rutas WorldId ↔ slug", () => {
  for (const locale of PUBLISHED_LOCALES) {
    it(`[${locale}] cada mundo resuelve a su ruta y la ruta devuelve el mismo mundo`, () => {
      for (const id of WORLD_IDS) {
        const world = getWorld(id, locale);
        const path = getWorldPath(world, locale);
        expect(path).toBe(`/${locale}/${world.prose.slug}`);
        expect(getWorldBySlug(world.prose.slug, locale)?.id).toBe(id);
      }
    });

    it(`[${locale}] una ruta desconocida no resuelve a ningún mundo`, () => {
      expect(getWorldBySlug("agujero-de-gusano", locale)).toBeUndefined();
      expect(getWorldBySlug("", locale)).toBeUndefined();
      expect(getWorldBySlug("formacion", locale)).toBeUndefined();
    });

    it(`[${locale}] ningún slug secuestra un segmento reservado`, () => {
      const slugs = getWorlds(locale).map((world) => world.prose.slug);
      for (const reserved of RESERVED_SEGMENTS) {
        expect(slugs).not.toContain(reserved);
      }
    });

    it(`[${locale}] los mundos a medida tienen carpeta propia y no la genera [mundo]`, () => {
      // Si esta lista se desincroniza de las carpetas de app/, Next serviría la
      // página genérica y el índice de proyectos o el formulario desaparecerían.
      const bespoke = BESPOKE_WORLD_IDS.map(
        (id) => getWorld(id, locale).prose.slug,
      );
      expect(bespoke).toEqual(["proyectos", "contacto"]);
    });
  }

  it("los destinos de navegación llevan href resuelto y orden narrativo", () => {
    const items = getWorldNavItems("es");
    expect(items).toHaveLength(6);
    expect(items.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items[0].href).toBe("/es/sobre-mi");
    expect(items[5].href).toBe("/es/contacto");
    // Nada de prosa larga en la proyección: cruza a todas las rutas.
    expect(Object.keys(items[0])).not.toContain("prose");
  });

  it("los vecinos recorren la secuencia completa sin salirse por los extremos", () => {
    const first = getWorldNeighbours(getWorld("tesseract", "es"), "es");
    expect(first.previous).toBeUndefined();
    expect(first.next?.id).toBe("miller");

    const last = getWorldNeighbours(getWorld("ranger", "es"), "es");
    expect(last.previous?.id).toBe("gargantua");
    expect(last.next).toBeUndefined();
  });
});
