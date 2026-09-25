import { describe, expect, it } from "vitest";
import {
  F1A_PROJECT_IDS,
  PROJECT_IDS,
  projectsData,
  type ProjectId,
  type ProjectStructuralData,
} from "./projects.data";
import {
  validateProjectProse,
  type ArchitectureLike,
  type ImageSize,
  type ProjectProseLike,
} from "./validate-projects";

/**
 * Fixtures INVENTADOS a propósito y sin parecido con el catálogo real: si el
 * validador dependiera de que el contenido publicado tuviera un hueco, dejaría
 * de probar nada el día que el hueco se llenara (lección del índice de
 * Experimentos).
 */

/** Arquitectura mínima que un caso completo tiene derecho a publicar. */
function architecture(overrides: Partial<ArchitectureLike> = {}): ArchitectureLike {
  return {
    nodes: [
      { id: "panel", label: "Panel", lane: "cliente", screen: "/media/projects/omsta/cover.png" },
      { id: "api", label: "API", lane: "servicio", decision: "Servicios atómicos." },
      { id: "db", label: "PostgreSQL", lane: "datos" },
      { id: "worker", label: "Worker", lane: "infraestructura" },
    ],
    edges: [
      ["panel", "api"],
      ["api", "db"],
      ["worker", "db"],
    ],
    ...overrides,
  };
}

function project(
  id: ProjectId,
  locale: string,
  slug: string = id,
): ProjectProseLike {
  const isCaseStudy = projectsData[id].kind === "case-study";
  return {
    id,
    locale,
    slug,
    featuredImage: {
      src: `/media/projects/${id}/cover.png`,
      alt: `Captura de ${id}`,
    },
    ...(isCaseStudy
      ? {
          architecture: architecture({
            nodes: architecture().nodes.map((node) =>
              node.screen ? { ...node, screen: `/media/projects/${id}/cover.png` } : node,
            ),
          }),
        }
      : {}),
  };
}

function requiredLocale(locale: string): ProjectProseLike[] {
  return F1A_PROJECT_IDS.map((id) => project(id, locale));
}

function validate(
  entries: readonly ProjectProseLike[],
  assetExists: (src: string) => boolean = () => true,
  imageSize: (src: string) => ImageSize | null = () => null,
): void {
  validateProjectProse(
    entries,
    ["es"],
    PROJECT_IDS,
    F1A_PROJECT_IDS,
    projectsData,
    assetExists,
    imageSize,
  );
}

/** Cambia UN proyecto de la lista requerida y deja el resto intacto. */
function withProject(
  id: ProjectId,
  patch: (entry: ProjectProseLike) => ProjectProseLike,
): ProjectProseLike[] {
  return requiredLocale("es").map((entry) => (entry.id === id ? patch(entry) : entry));
}

describe("validateProjectProse", () => {
  it("acepta las piezas requeridas de F1A", () => {
    expect(() => validate(requiredLocale("es"))).not.toThrow();
  });

  it("falla si falta una ficha requerida en un idioma publicado", () => {
    const entries = requiredLocale("es").filter(
      (entry) => entry.id !== "network",
    );
    expect(() => validate(entries)).toThrow(/network/);
  });

  it("falla si dos archivos comparten proyecto e idioma", () => {
    const entries = [...requiredLocale("es"), project("omsta", "es", "otro")];
    expect(() => validate(entries)).toThrow(/[Pp]royecto duplicado/);
  });

  it("falla si dos proyectos comparten slug e idioma", () => {
    const entries = requiredLocale("es").map((entry) =>
      entry.id === "network" ? { ...entry, slug: "wikiverse" } : entry,
    );
    expect(() => validate(entries)).toThrow(/[Ss]lug de proyecto duplicado/);
  });

  it("falla si una imagen no tiene alt localizado", () => {
    const entries = requiredLocale("es").map((entry) =>
      entry.id === "network"
        ? { ...entry, featuredImage: { ...entry.featuredImage, alt: "" } }
        : entry,
    );
    expect(() => validate(entries)).toThrow(/sin alt/);
  });

  it("falla si una imagen declarada no existe", () => {
    expect(() => validate(requiredLocale("es"), () => false)).toThrow(
      /Asset inexistente/,
    );
  });

  it("falla si dos proyectos comparten orden", () => {
    const broken: Record<ProjectId, ProjectStructuralData> = {
      ...projectsData,
      network: { ...projectsData.network, order: projectsData.wikiverse.order },
    };
    expect(() =>
      validateProjectProse(
        requiredLocale("es"),
        ["es"],
        PROJECT_IDS,
        F1A_PROJECT_IDS,
        broken,
      ),
    ).toThrow(/[Oo]rden de proyecto repetido/);
  });
});

describe("validateProjectProse · la mesa de ingeniería (P1)", () => {
  it("frame: mobile sólo puede llevarlo una imagen más alta que ancha", () => {
    const entries = withProject("network", (entry) => ({
      ...entry,
      gallery: [{ src: "/media/projects/network/wide.png", alt: "Ancha", frame: "mobile" }],
    }));
    const landscape = () => ({ width: 1440, height: 900 });
    expect(() => validate(entries, () => true, landscape)).toThrow(/más alta que ancha/);

    const portrait = () => ({ width: 390, height: 844 });
    expect(() => validate(entries, () => true, portrait)).not.toThrow();
    // Sin dimensiones medidas no hay nada que afirmar: no se inventa un fallo.
    expect(() => validate(entries)).not.toThrow();
  });

  it("un caso completo sin architecture no construye", () => {
    const entries = withProject("omsta", (entry) => {
      const bare = { ...entry };
      delete bare.architecture;
      return bare;
    });
    expect(() => validate(entries)).toThrow(/no declara "architecture"/);
  });

  it("una ficha breve puede no declararla: la capa se deriva del stack", () => {
    expect(requiredLocale("es").find((entry) => entry.id === "network")?.architecture).toBeUndefined();
    expect(() => validate(requiredLocale("es"))).not.toThrow();
  });

  it("un caso completo exige al menos cuatro nodos y una decisión", () => {
    const few = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({ nodes: architecture().nodes.slice(0, 3), edges: [] }),
    }));
    expect(() => validate(few)).toThrow(/al menos 4/);

    const noDecision = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({
        nodes: architecture().nodes.map((node) => {
          const silent = { ...node };
          delete silent.decision;
          return silent;
        }),
      }),
    }));
    expect(() => validate(noDecision)).toThrow(/ninguna decisión/);
  });

  it("toda arista une dos nodos declarados y distintos", () => {
    const dangling = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({ edges: [["panel", "gateway"]] }),
    }));
    expect(() => validate(dangling)).toThrow(/nodo inexistente.*gateway/);

    const loop = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({ edges: [["api", "api"]] }),
    }));
    expect(() => validate(loop)).toThrow(/a sí mismo/);

    const malformed = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({ edges: [["api"]] }),
    }));
    expect(() => validate(malformed)).toThrow(/mal formada/);
  });

  it("no admite dos nodos con el mismo id ni un carril fuera del conjunto", () => {
    const repeated = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({
        nodes: [...architecture().nodes, { id: "api", label: "Otra API", lane: "servicio" }],
      }),
    }));
    expect(() => validate(repeated)).toThrow(/repetido.*"api"/);

    const badLane = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({
        nodes: architecture().nodes.map((node) =>
          node.id === "worker" ? { ...node, lane: "gateway" as "servicio" } : node,
        ),
      }),
    }));
    expect(() => validate(badLane)).toThrow(/Carril desconocido/);
  });

  it("una pantalla sólo puede ser nodo si está en la mesa, y de un solo nodo", () => {
    const foreign = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({
        nodes: architecture().nodes.map((node) =>
          node.id === "panel" ? { ...node, screen: "/media/projects/omsta/ausente.png" } : node,
        ),
      }),
    }));
    expect(() => validate(foreign)).toThrow(/no está en la mesa/);

    const shared = withProject("omsta", (entry) => ({
      ...entry,
      architecture: architecture({
        nodes: architecture().nodes.map((node) =>
          node.id === "api" ? { ...node, screen: "/media/projects/omsta/cover.png" } : node,
        ),
      }),
    }));
    expect(() => validate(shared)).toThrow(/misma pantalla/);
  });

  it("una pantalla de la galería vale como nodo igual que la destacada", () => {
    const entries = withProject("omsta", (entry) => ({
      ...entry,
      gallery: [{ src: "/media/projects/omsta/reserva.png", alt: "Reserva", caption: "" } as ProjectProseLike["featuredImage"]],
      architecture: architecture({
        nodes: [
          ...architecture().nodes,
          { id: "reservas", label: "Reservas", lane: "servicio", screen: "/media/projects/omsta/reserva.png" },
        ],
        edges: [["reservas", "db"]],
      }),
    }));
    expect(() => validate(entries)).not.toThrow();
  });
});
