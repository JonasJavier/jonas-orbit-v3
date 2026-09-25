import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/projects";
import { getF1AProjects } from "@/lib/projects";
import { initialNode, statusReadout, tableProject, type TableProject } from "@/lib/engineering-table";
import { getWorld } from "@/lib/worlds";
import { EngineeringTable } from "./engineering-table";
import { ProjectsPage } from "./projects-page";

const settings = vi.hoisted(() => ({ motion: true }));
vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => settings.motion }));

/**
 * LA MESA DE INGENIERÍA, en jsdom (`docs/design/endurance-proyectos.md` §11).
 *
 * Lo que se prueba aquí es el CONTRATO del DOM, no la coreografía: que el
 * HTML servido no decida el proyecto (P5, en su parte de servidor), que sólo
 * la capa elegida del proyecto a la vista sea operable (P4, por atributo
 * porque jsdom no implementa `inert`), que una ficha sin galería, sin enlaces
 * y sin decisiones se pinte con dignidad (P3), que las cifras salgan de los
 * datos (P11), que con el movimiento apagado no haya cruce (P10, lo que jsdom
 * puede ver) y que la salida al caso completo esté siempre a mano (A20).
 */

const world = getWorld("endurance", "es");
const catalog = () => getF1AProjects("es");
const table = () => catalog().map((project) => tableProject(project, "/es/proyectos"));
const pad = (value: number) => String(value).padStart(2, "0");
const section = (id: string) => document.getElementById(id) as HTMLElement;
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const live = () => document.querySelector('[aria-live="polite"]') as HTMLElement;
const inspector = (id: string) =>
  within(section(id)).getByRole("region", { name: "Inspector del módulo" });
const nodeButton = (id: string, nodeId: string) =>
  section(id).querySelector(`.holo-node[data-node-id="${nodeId}"] .holo-node__box`) as HTMLButtonElement;
const frames = (id: string) => [...section(id).querySelectorAll<HTMLButtonElement>(".holo-screen__pick")];
const noteText = (id: string) => section(id).querySelector(".holo-note__text")?.textContent;
/** La ficha técnica de un proyecto, como pares rótulo → cifra. */
const readout = (id: string) =>
  Object.fromEntries(
    [...section(id).querySelectorAll(".table-readout > div")].map((row) => [
      row.querySelector("dt")?.textContent,
      row.querySelector("dd")?.textContent,
    ]),
  );

/**
 * Una ficha mínima INVENTADA: sin galería, sin enlaces y sin arquitectura
 * declarada —el esquema se deriva de su stack y no tiene decisiones—.
 */
function bare(overrides: Partial<Record<keyof Project["prose"], unknown>> = {}): TableProject {
  const prose = {
    id: "network",
    slug: "minima",
    locale: "es",
    title: "Mínima",
    eyebrow: "Ficha",
    summary: "Una ficha con lo justo.",
    statusLabel: "Listo para producción",
    role: "Todo",
    problem: "Problema.",
    contribution: "Contribución.",
    decision: "La única decisión.",
    technologies: ["React", "Django"],
    highlights: ["Uno"],
    featuredImage: { src: "/media/projects/x/00.png", alt: "Portada mínima", caption: "La portada." },
    seoTitle: "t",
    seoDescription: "d",
    body: "",
    path: "es/projects/minima",
    ...overrides,
  } as unknown as Project["prose"];
  const project: Project = { id: "network", order: 9, phase: "f1a", kind: "brief", status: "ready-for-production", prose };
  return tableProject(project, "/es/proyectos");
}

function renderTable(projects: TableProject[]) {
  return render(
    <EngineeringTable
      head={{ kicker: "Endurance / Mesa de ingeniería", title: "Proyectos", motto: "Divisa" }}
      projects={projects}
    />,
  );
}

afterEach(() => {
  settings.motion = true;
  window.history.replaceState(null, "", window.location.pathname);
});

/* ── La página ────────────────────────────────────────────────────────────── */

describe("ProjectsPage", () => {
  /*
    Garantiza la lectura de cada proyecto: su nombre como h2, qué es, su
    estado (con la etiqueta completa como nombre accesible), su stack como
    lista y la salida al caso completo. Evita perder el texto real de la mesa
    (regla 7) o la salida al caso (A20).
  */
  it("el h1 es el destino y cada proyecto es una sección con nombre, qué es, estado, stack y salida al caso", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    expect(screen.getByRole("heading", { level: 1, name: "Proyectos" })).toBeInTheDocument();
    const projects = table();
    expect(document.querySelectorAll("section.table-project")).toHaveLength(projects.length);
    for (const project of projects) {
      const scope = within(section(project.id));
      expect(scope.getByRole("heading", { level: 2, name: project.name })).toBeInTheDocument();
      expect(section(project.id).querySelector(".table-read__descriptor")).toHaveTextContent(project.descriptor);
      const status = scope.getByTitle(project.statusLabel);
      expect(status).toHaveTextContent(statusReadout(project.status));
      const stack = scope.getByRole("list", { name: "Tecnologías" });
      expect(within(stack).getAllByRole("listitem").map((item) => item.textContent)).toEqual(project.technologies);
      expect(scope.getByRole("link", { name: /Explorar proyecto/ })).toHaveAttribute("href", project.href);
    }
    // Los cinco nombres cortos, cortados en la raya del título.
    expect(projects.map((project) => project.name)).toEqual([
      "OMSTA",
      "Izak's Photos",
      "Wiki Universe",
      "Network 3.0",
      "Delicaté 4.0",
    ]);
  });

  /*
    Garantiza que la columna enseña «Visitar el sitio» sólo cuando el MDX trae
    un enlace `kind: demo`, «Código» sólo con `kind: repository`, y que los
    enlaces de contacto ya no se pintan aquí. Evita un botón ámbar inventado
    (regla 8) o un enlace de contacto duplicado.
  */
  it("«Visitar el sitio» sólo con demo, «Código» sólo con repositorio, y el contacto no se pinta", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    for (const project of table()) {
      const scope = within(section(project.id));
      const demo = project.links.find((link) => link.kind === "demo");
      const repository = project.links.find((link) => link.kind === "repository");
      if (demo) expect(scope.getByRole("link", { name: new RegExp(demo.label) })).toHaveAttribute("href", demo.href);
      else expect(section(project.id).querySelector(".table-cta--site"), project.id).toBeNull();
      if (repository) expect(scope.getByRole("link", { name: /Código/ })).toHaveAttribute("href", repository.href);
      else expect(scope.queryByRole("link", { name: /Código/ }), project.id).toBeNull();
      for (const contact of project.links.filter((link) => link.kind === "contact")) {
        expect(scope.queryByRole("link", { name: contact.label }), project.id).toBeNull();
      }
      // Lo único que sale de la sección hacia el sitio es el caso, la demo y el código.
      expect(section(project.id).querySelectorAll(".table-read a")).toHaveLength(1 + Number(Boolean(demo)) + Number(Boolean(repository)));
    }
  });

  /*
    Garantiza que las cifras de la ficha técnica y de las tarjetas del sistema
    se cuentan del MDX de cada proyecto, con dos cifras. Evita el «8
    radiadores» otra vez (O4, P11).
  */
  it("las cifras de cada proyecto salen de su MDX (P11)", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    for (const { id, prose } of catalog()) {
      const nodes = prose.architecture?.nodes ?? [];
      const decisions = nodes.filter((node) => node.decision).length;
      expect(readout(id), id).toEqual({
        Pantallas: pad(1 + (prose.gallery?.length ?? 0)),
        Módulos: pad(nodes.length),
        Decisiones: pad(decisions),
      });
      expect(section(id).querySelector(".holo-diagram .holo-card__meta"), id).toHaveTextContent(
        `${pad(nodes.length)} módulos · ${pad(prose.architecture?.edges.length ?? 0)} conexiones`,
      );
      expect(section(id).querySelector(".holo-inspector .holo-card__meta"), id).toHaveTextContent(`${pad(decisions)} decisiones`);
    }
  });

  /* Garantiza que la prosa del mundo sigue entera al pie y que los vecinos siguen ahí (regla 7). */
  it("la prosa del mundo baja al pie entera y los vecinos siguen ahí", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    expect(screen.getByText(world.prose.closing)).toBeInTheDocument();
    expect(screen.getByText(world.prose.introduction)).toBeInTheDocument();
    for (const fact of world.prose.facts) {
      expect(screen.getByText(fact.label)).toBeInTheDocument();
    }
    const neighbours = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(neighbours).toHaveTextContent("Formación");
    expect(neighbours).toHaveTextContent("Creatividad");
  });

  /* Garantiza que la mesa es CSS y SVG: ningún canvas propio en esta ruta (P6, en jsdom). */
  it("esta ruta no monta ningún canvas: la mesa es CSS y SVG", () => {
    const { container } = render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  /*
    Garantiza que el HTML SERVIDO no elige proyecto ni capa: sin
    `data-enhanced`, sin `data-state`, sin `tabpanel` ni `inert`, de modo que
    decide `:target` (o el primero). Y que cada sección trae la ficha de texto
    —pantallas con su nota y sistema con sus decisiones— que se pinta con
    `scripting: none`. Evita la mesa convertida en el contenido (P5, regla 7) y
    que el servidor pinte OMSTA antes de que `#wikiverse` lo sustituya.
  */
  it("el HTML servido no decide el proyecto y cada sección lleva su ficha de texto (P5)", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    const root = host.querySelector(".table") as HTMLElement;
    expect(root).not.toHaveAttribute("data-enhanced");
    expect(root).toHaveAttribute("data-boot", "off");
    // Ninguna sección se oculta ni se inertiza desde el servidor: `:target` decide.
    // (Los mandos de Diseño e Ingeniería sí van `inert`: la capa servida es Resultado.)
    expect(host.querySelectorAll("section.table-project[data-state], section.table-project[inert], [role='tabpanel']")).toHaveLength(0);
    expect(host.querySelectorAll("section.table-project")).toHaveLength(catalog().length);
    expect(host.querySelectorAll('nav[aria-label="Proyectos"] [aria-current]')).toHaveLength(0);
    expect(host.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();

    for (const { id, prose } of catalog()) {
      const sectionHtml = host.querySelector(`section#${id}`) as HTMLElement;
      expect(sectionHtml, id).not.toBeNull();
      const images = [prose.featuredImage, ...(prose.gallery ?? [])];
      // Todas las pantallas, con su alt entero, están en el HTML.
      expect([...sectionHtml.querySelectorAll(".holo-screen img")].map((img) => img.getAttribute("alt"))).toEqual(
        images.map((image) => image.alt),
      );
      const fallback = sectionHtml.querySelector(".table-fallback") as HTMLElement;
      expect([...fallback.querySelectorAll("ol > li")].map((item) => item.textContent)).toEqual(
        images.map((image) => image.caption),
      );
      const nodes = prose.architecture?.nodes ?? [];
      expect(fallback.querySelectorAll("dl dt"), id).toHaveLength(nodes.length);
      expect([...fallback.querySelectorAll("dl dd")].map((dd) => dd.textContent), id).toEqual(
        nodes.flatMap((node) => (node.decision ? [node.decision] : [])),
      );
      expect(host.querySelector(`nav[aria-label="Proyectos"] a[href="#${id}"]`), id).not.toBeNull();
    }
  });
});

/* ── La mesa ─────────────────────────────────────────────────────────────── */

describe("EngineeringTable · capas (P4)", () => {
  /*
    Garantiza el patrón de pestañas: un `tablist` con tres `tab`, la elegida
    con `aria-selected`, todas controlando el escenario del proyecto a la
    vista, y ese escenario como `tabpanel` etiquetado por la capa. Evita un
    selector que el lector de pantalla no reconoce como tal.
  */
  it("tres pestañas que controlan el escenario del proyecto a la vista", () => {
    renderTable(table());
    const list = screen.getByRole("tablist", { name: "Profundidad de lectura" });
    const tabs = within(list).getAllByRole("tab");
    expect(tabs.map((entry) => entry.textContent)).toEqual(["Resultado", "Diseño", "Ingeniería"]);
    expect(tabs.map((entry) => entry.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((entry) => entry.tabIndex)).toEqual([0, -1, -1]);
    for (const entry of tabs) expect(entry).toHaveAttribute("aria-controls", "omsta-stage");
    const stage = document.getElementById("omsta-stage") as HTMLElement;
    expect(stage).toHaveAttribute("role", "tabpanel");
    expect(stage).toHaveAttribute("aria-labelledby", "table-tab-resultado");
    expect(document.querySelector(".table")).toHaveAttribute("data-layer", "resultado");

    fireEvent.click(tab(/Ingeniería/));
    expect(tab(/Ingeniería/)).toHaveAttribute("aria-selected", "true");
    expect(stage).toHaveAttribute("aria-labelledby", "table-tab-ingenieria");
    expect(document.querySelector(".table")).toHaveAttribute("data-layer", "ingenieria");
  });

  /*
    Garantiza que sólo los mandos de la capa elegida del proyecto a la vista
    son operables: las pantallas en Diseño, los nodos en Ingeniería, la nota
    de Diseño sólo en Diseño, y nada de un proyecto oculto. Evita mandos de
    una capa plegada alcanzables por tabulador o por rol.
  */
  it("sólo la capa activa del proyecto a la vista es operable; el resto va inert", () => {
    renderTable(table());
    const nodes = () => [...section("omsta").querySelectorAll(".holo-node__box")];
    const note = () => section("omsta").querySelector(".holo-note");
    const inert = (elements: Element[]) => elements.map((element) => element.hasAttribute("inert"));
    const all = (value: boolean, elements: Element[]) => inert(elements).every((flag) => flag === value);
    expect(nodes().length).toBeGreaterThan(0);

    // Resultado: nada de la mesa se opera; se lee.
    expect(all(true, frames("omsta"))).toBe(true);
    expect(all(true, nodes())).toBe(true);
    expect(note()).toHaveAttribute("inert");

    fireEvent.click(tab(/Diseño/));
    expect(all(false, frames("omsta"))).toBe(true);
    expect(all(true, nodes())).toBe(true);
    expect(note()).not.toHaveAttribute("inert");
    // Un proyecto oculto no se opera en ninguna capa.
    expect(all(true, frames("wikiverse"))).toBe(true);
    expect(section("wikiverse").querySelector(".holo-note")).toHaveAttribute("inert");

    fireEvent.click(tab(/Ingeniería/));
    expect(all(true, frames("omsta"))).toBe(true);
    expect(all(false, nodes())).toBe(true);
    expect(note()).toHaveAttribute("inert");
    expect(all(true, [...section("wikiverse").querySelectorAll(".holo-node__box")])).toBe(true);

    fireEvent.click(tab(/Resultado/));
    expect(all(true, nodes())).toBe(true);
  });

  /*
    Garantiza el teclado del selector: flechas, Inicio y Fin cambian de capa,
    dan la vuelta y el foco se queda en el selector; la región viva lo dice.
    Evita un selector que pierde el foco al cambiar de capa (P7).
  */
  it("el selector se recorre con flechas, Inicio y Fin, y el foco no se pierde", () => {
    const omsta = table()[0];
    renderTable(table());
    const resultado = tab(/Resultado/);
    act(() => resultado.focus());
    fireEvent.keyDown(resultado, { key: "ArrowRight" });
    expect(tab(/Diseño/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/Diseño/)).toHaveFocus();
    fireEvent.keyDown(tab(/Diseño/), { key: "End" });
    expect(tab(/Ingeniería/)).toHaveFocus();
    expect(live()).toHaveTextContent(`OMSTA · Ingeniería · ${omsta.counts.modules} módulos`);
    fireEvent.keyDown(tab(/Ingeniería/), { key: "ArrowRight" });
    expect(resultado).toHaveAttribute("aria-selected", "true");
    expect(resultado).toHaveFocus();
    fireEvent.keyDown(resultado, { key: "ArrowLeft" });
    expect(tab(/Ingeniería/)).toHaveFocus();
    fireEvent.keyDown(tab(/Ingeniería/), { key: "Home" });
    expect(resultado).toHaveFocus();
    expect(resultado).toHaveAttribute("tabindex", "0");
    expect(live()).toHaveTextContent("OMSTA · Resultado");
  });
});

describe("EngineeringTable · proyectos y muelle", () => {
  /*
    Garantiza que el proyecto a la vista es el hash: el muelle lo escribe sin
    recargar ni apilar historia, el entrante se enciende, el saliente cae
    durante el cruce y después se oculta, y los ocultos van `inert`. Evita
    un muelle que navega de verdad o un proyecto oculto alcanzable.
  */
  it("el muelle cambia el hash sin historia; el saliente cae y se oculta; los ocultos van inert", async () => {
    renderTable(table());
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    expect(section("omsta")).not.toHaveAttribute("inert");
    for (const id of ["izaks-photos", "wikiverse", "network", "delicate"]) {
      expect(section(id)).toHaveAttribute("data-state", "hidden");
      expect(section(id)).toHaveAttribute("inert");
    }
    const dock = screen.getByRole("navigation", { name: "Proyectos" });
    expect(within(dock).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      table().map((project) => `#${project.id}`),
    );
    // El nombre accesible es el título entero; lo visible, el nombre corto.
    const wiki = within(dock).getByRole("link", { name: /Wiki Universe/ });
    expect(within(dock).getByRole("link", { name: "OMSTA — ERP para una agencia de viajes" })).toHaveAttribute("aria-current", "true");

    const depth = window.history.length;
    fireEvent.click(wiki);
    expect(window.location.hash).toBe("#wikiverse");
    expect(window.history.length).toBe(depth);
    expect(section("wikiverse")).toHaveAttribute("data-state", "active");
    expect(section("wikiverse")).not.toHaveAttribute("inert");
    expect(section("omsta")).toHaveAttribute("data-state", "leaving");
    expect(section("omsta")).toHaveAttribute("inert");
    expect(wiki).toHaveAttribute("aria-current", "true");
    expect(within(dock).getByRole("link", { name: /OMSTA/ })).not.toHaveAttribute("aria-current");
    expect(tab(/Resultado/)).toHaveAttribute("aria-controls", "wikiverse-stage");
    expect(live()).toHaveTextContent("Wiki Universe · Resultado");
    await waitFor(() => expect(section("omsta")).toHaveAttribute("data-state", "hidden"));
  });

  /*
    Garantiza que con el movimiento apagado no hay encendido ni cruce: el
    saliente se oculta en el acto y nunca pasa por `leaving`. Evita una
    coreografía forzada con el interruptor apagado (P10).
  */
  it("con el movimiento apagado no hay encendido ni cruce: el saliente se oculta en el acto (P10)", () => {
    settings.motion = false;
    renderTable(table());
    const root = document.querySelector(".table");
    expect(root).toHaveAttribute("data-boot", "off");
    expect(root).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("link", { name: /Network 3.0/ }));
    expect(section("network")).toHaveAttribute("data-state", "active");
    expect(section("omsta")).toHaveAttribute("data-state", "hidden");
    expect(document.querySelectorAll('[data-state="leaving"]')).toHaveLength(0);
  });

  /* Garantiza que con movimiento la mesa se enciende al hidratar. */
  it("con el movimiento encendido la mesa se enciende", () => {
    renderTable(table());
    const root = document.querySelector(".table");
    expect(root).toHaveAttribute("data-enhanced", "true");
    expect(root).toHaveAttribute("data-boot", "on");
    expect(root).toHaveAttribute("data-motion", "on");
  });

  /*
    Garantiza que un hash válido elige el proyecto al entrar y que uno
    desconocido cae en el primero. Evita una mesa vacía por un enlace viejo.
  */
  it("un hash válido elige el proyecto y uno desconocido cae en el primero", () => {
    const projects = table();
    window.history.replaceState(null, "", "#delicate");
    const { unmount } = renderTable(projects);
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    expect(tab(/Resultado/)).toHaveAttribute("aria-controls", "delicate-stage");
    unmount();
    window.history.replaceState(null, "", "#nada");
    renderTable(projects);
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    expect(document.querySelectorAll('.table-project[data-state="active"]')).toHaveLength(1);
  });

  /*
    Garantiza que la pantalla elegida del tambor y el módulo del inspector
    pertenecen al proyecto: al cambiarlo, el nuevo entra por su primera
    pantalla y por su primer módulo con decisión. Evita arrastrar el índice 7
    de OMSTA a un proyecto de cuatro pantallas (una nota vacía).
  */
  it("al cambiar de proyecto, el tambor y el inspector empiezan de nuevo", () => {
    const projects = table();
    renderTable(projects);
    fireEvent.click(tab(/Diseño/));
    fireEvent.click(frames("omsta")[6]);
    expect(noteText("omsta")).toMatch(/^07 \/ 08/);
    fireEvent.click(tab(/Ingeniería/));
    fireEvent.click(nodeButton("omsta", "redis"));
    expect(within(inspector("omsta")).getByRole("heading", { level: 3 })).toHaveTextContent("Redis");

    fireEvent.click(screen.getByRole("link", { name: /Izak's Photos/ }));
    const izaks = projects.find((project) => project.id === "izaks-photos") as TableProject;
    const first = izaks.architecture.nodes.find((node) => node.id === initialNode(izaks.architecture));
    expect(within(inspector("izaks-photos")).getByRole("heading", { level: 3 })).toHaveTextContent(first?.label as string);
    fireEvent.click(tab(/Diseño/));
    expect(noteText("izaks-photos")).toMatch(/^01 \/ 04/);
    expect(noteText("izaks-photos")).toContain(izaks.screens[0].caption);
  });

  /*
    Garantiza que la mesa física grabada sigue al proyecto y a la capa, con las
    cifras de sus carriles, y que no se lee dos veces (va `aria-hidden`).
    Evita una placa que se queda en OMSTA o cifras de carril escritas a mano.
  */
  it("la mesa grabada sigue al proyecto y a la capa, con las cifras de sus carriles", () => {
    const projects = table();
    renderTable(projects);
    const etched = document.querySelector(".console") as HTMLElement;
    expect(etched).toHaveAttribute("aria-hidden", "true");
    expect(etched.querySelector(".console__plate")).toHaveTextContent("OMSTA01 · Resultado");
    fireEvent.click(screen.getByRole("link", { name: /Izak's Photos/ }));
    fireEvent.click(tab(/Ingeniería/));
    const izaks = projects.find((project) => project.id === "izaks-photos") as TableProject;
    expect(etched.querySelector(".console__plate")).toHaveTextContent(`Izak's Photos${pad(izaks.order)} · Ingeniería`);
    expect(etched.querySelector(".console__spec")).toHaveTextContent(izaks.technologies[0]);
    const quadrants = Object.fromEntries(
      [...etched.querySelectorAll(".console__quadrant")].map((quadrant) => [
        quadrant.querySelector("span")?.textContent,
        quadrant.querySelector("small")?.textContent,
      ]),
    );
    const count = (lane: string) => izaks.architecture.lanes.find((entry) => entry.lane === lane)?.count ?? 0;
    expect(quadrants).toEqual({
      Cliente: `${pad(count("cliente"))} módulos`,
      Servicio: `${pad(count("servicio"))} módulos`,
      Datos: `${pad(count("datos"))} módulos`,
      Infraestructura: `${pad(count("infraestructura"))} módulos`,
    });
  });
});

describe("EngineeringTable · Resultado y Diseño", () => {
  /*
    Garantiza que los puestos de Resultado salen de los datos (P2 en el DOM) y
    que sólo la destacada del primer proyecto se pide sin pereza. Evita
    poses escritas a mano y cinco capturas compitiendo por el LCP.
  */
  it("cada pantalla lleva su puesto de los datos y sólo la primera destacada se pide sin pereza", () => {
    const projects = table();
    renderTable(projects);
    for (const project of projects) {
      const figures = [...section(project.id).querySelectorAll("figure.holo-screen")];
      expect(figures.map((figure) => figure.getAttribute("data-slot")), project.id).toEqual(
        project.screens.map((entry) => entry.slot ?? "none"),
      );
      expect(figures.map((figure) => figure.getAttribute("data-frame")), project.id).toEqual(
        project.screens.map((entry) => entry.frame),
      );
    }
    const eager = [...document.querySelectorAll(".holo-screen img")].filter((img) => !img.hasAttribute("loading"));
    expect(eager).toHaveLength(1);
    expect(eager[0]).toHaveAttribute("alt", projects[0].screens[0].alt);
  });

  /*
    Garantiza el tambor de Diseño con teclado: las flechas giran (y dan la
    vuelta), el foco viaja a la nueva elegida, que es la única tabulable y la
    que lleva `aria-current`; lo lejano se marca `data-far`; la nota dice
    índice y nota de la elegida, y la región viva lo anuncia. Evita un carrete
    que sólo se opera con el ratón o que deja el foco en una pantalla apagada.
  */
  it("Diseño: las flechas giran el tambor, el foco viaja con la elegida y la nota la lee", async () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Diseño/));
    const figures = () => [...section("omsta").querySelectorAll("figure.holo-screen")];
    const frontIndex = () => figures().findIndex((figure) => figure.hasAttribute("data-front"));

    expect(frontIndex()).toBe(0);
    expect(frames("omsta").map((frame) => frame.tabIndex)).toEqual(omsta.screens.map((_, i) => (i === 0 ? 0 : -1)));
    expect(frames("omsta")[0]).toHaveAttribute("aria-current", "true");
    // Ocho pantallas con la primera delante: las tres del fondo del tambor se apagan.
    expect(figures().map((figure) => figure.hasAttribute("data-far"))).toEqual([false, false, false, true, true, true, false, false]);
    expect(noteText("omsta")).toBe(`01 / 08${omsta.screens[0].caption}`);

    act(() => frames("omsta")[0].focus());
    fireEvent.keyDown(frames("omsta")[0], { key: "ArrowRight" });
    expect(frontIndex()).toBe(1);
    await waitFor(() => expect(frames("omsta")[1]).toHaveFocus());
    expect(frames("omsta")[1]).toHaveAttribute("aria-current", "true");
    expect(frames("omsta")[0]).not.toHaveAttribute("aria-current");
    expect(frames("omsta")[1].tabIndex).toBe(0);
    expect(frames("omsta")[0].tabIndex).toBe(-1);
    expect(noteText("omsta")).toBe(`02 / 08${omsta.screens[1].caption}`);
    expect(live()).toHaveTextContent(`OMSTA · Diseño · pantalla 2 de 8: ${omsta.screens[1].caption}`);

    fireEvent.keyDown(frames("omsta")[1], { key: "ArrowLeft" });
    fireEvent.keyDown(frames("omsta")[0], { key: "ArrowLeft" });
    expect(frontIndex()).toBe(7);
    await waitFor(() => expect(frames("omsta")[7]).toHaveFocus());
    expect(noteText("omsta")).toMatch(/^08 \/ 08/);
  });

  /*
    Garantiza los otros dos caminos del tambor: pulsar una pantalla la trae
    delante, y los botones de la nota avanzan y retroceden dando la vuelta.
    Cada pantalla se describe por su nota (figcaption). Evita un tambor sin
    mando visible y pantallas mudas para el lector de pantalla.
  */
  it("Diseño: pulsar una pantalla la trae delante y la nota avanza y retrocede", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Diseño/));
    fireEvent.click(frames("omsta")[3]);
    expect(frames("omsta")[3]).toHaveAttribute("aria-current", "true");
    expect(noteText("omsta")).toMatch(/^04 \/ 08/);

    const note = within(section("omsta").querySelector(".holo-note") as HTMLElement);
    fireEvent.click(note.getByRole("button", { name: "Pantalla siguiente" }));
    expect(noteText("omsta")).toMatch(/^05 \/ 08/);
    // De la quinta a la primera, y una más da la vuelta hasta la octava.
    for (let step = 0; step < 4; step++) fireEvent.click(note.getByRole("button", { name: "Pantalla anterior" }));
    expect(noteText("omsta")).toMatch(/^01 \/ 08/);
    fireEvent.click(note.getByRole("button", { name: "Pantalla anterior" }));
    expect(noteText("omsta")).toMatch(/^08 \/ 08/);
    expect(frames("omsta")[7]).toHaveAttribute("aria-current", "true");

    for (const [index, frame] of frames("omsta").entries()) {
      const caption = document.getElementById(frame.getAttribute("aria-describedby") as string);
      expect(caption?.tagName).toBe("FIGCAPTION");
      expect(caption).toHaveClass("visually-hidden");
      expect(caption).toHaveTextContent(omsta.screens[index].caption);
      // En Diseño la lámina lleva el nombre y la imagen calla: no se lee dos veces.
      expect(frame).toHaveAttribute("aria-label", omsta.screens[index].alt);
      const image = frame.parentElement?.querySelector("img");
      expect(image).toHaveAttribute("alt", omsta.screens[index].alt);
      expect(image).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("fuera de Diseño el alt de cada pantalla sigue en el árbol: la imagen no vive dentro de lo inerte", () => {
    renderTable(table());
    // Resultado, la capa de entrada (y la única sin JavaScript): láminas inertes…
    for (const frame of frames("omsta")) {
      expect(frame).toHaveAttribute("inert");
      const image = frame.parentElement?.querySelector("img") as HTMLImageElement;
      // …pero la imagen es hermana de la lámina, no hija, y no se esconde.
      expect(frame.contains(image)).toBe(false);
      expect(image.closest("[inert]")).toBeNull();
      expect(image).not.toHaveAttribute("aria-hidden");
    }
    fireEvent.click(tab(/Ingeniería/));
    for (const frame of frames("omsta")) {
      expect((frame.parentElement?.querySelector("img") as HTMLImageElement).closest("[inert]")).toBeNull();
    }
  });
});

describe("EngineeringTable · Ingeniería", () => {
  /*
    Garantiza que el esquema dibuja UNA línea por arista declarada, con el
    trazado y la forma que calcula la parte pura, y un nodo por módulo en su
    carril. Evita un esquema decorativo que no corresponde al MDX (P12).
  */
  it("una línea por arista y un nodo por módulo, en su carril", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    const lines = [...section("omsta").querySelectorAll("svg.holo-diagram__lines path.holo-line")];
    expect(lines).toHaveLength(omsta.architecture.edges.length);
    expect(lines.map((line) => [line.getAttribute("d"), line.getAttribute("data-shape")])).toEqual(
      omsta.architecture.edges.map((edge) => [edge.d, edge.shape]),
    );
    for (const { lane, count } of omsta.architecture.lanes) {
      const group = section("omsta").querySelector(`.holo-lane[data-lane="${lane}"]`) as HTMLElement;
      expect(group.querySelectorAll(".holo-node"), lane).toHaveLength(count);
    }
    expect(section("omsta").querySelectorAll(".holo-node")).toHaveLength(omsta.counts.modules);
  });

  /*
    Garantiza la entrada al sistema: el inspector abre en el primer módulo con
    decisión (Pagos, en OMSTA) y enseña su carril, su nombre, su decisión y de
    quién recibe y a quién entrega; las líneas que tocan ese módulo se
    encienden y sus vecinos se marcan. Evita un inspector que entra en blanco o
    un foco que no dice con qué se conecta.
  */
  it("el inspector abre en el primer módulo con decisión y enciende sus conexiones", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    const focus = omsta.architecture.nodes.find((node) => node.id === initialNode(omsta.architecture))!;
    expect(focus.id).toBe("pagos");

    const card = within(inspector("omsta"));
    expect(section("omsta").querySelector(".holo-inspector__lane")).toHaveTextContent("Servicio");
    expect(card.getByRole("heading", { level: 3 })).toHaveTextContent(focus.label);
    expect(inspector("omsta").querySelector("blockquote")).toHaveTextContent(focus.decision as string);
    const link = (term: string) => card.getByText(term).nextElementSibling;
    expect(link("Recibe de")).toHaveTextContent(focus.inputs.join(" · "));
    expect(link("Entrega a")).toHaveTextContent(focus.outputs.join(" · "));

    const on = [...section("omsta").querySelectorAll("path.holo-line[data-on]")];
    const touching = omsta.architecture.edges.filter((edge) => edge.from === focus.id || edge.to === focus.id);
    expect(on.map((line) => line.getAttribute("d"))).toEqual(touching.map((edge) => edge.d));
    const linked = [...section("omsta").querySelectorAll(".holo-node[data-linked]")].map((node) => node.getAttribute("data-node-id"));
    expect(linked.sort()).toEqual(touching.map((edge) => (edge.from === focus.id ? edge.to : edge.from)).sort());
    expect([...section("omsta").querySelectorAll(".holo-node[data-selected]")].map((node) => node.getAttribute("data-node-id"))).toEqual(["pagos"]);
  });

  /*
    Garantiza el tabulador itinerante del esquema: sólo el módulo elegido es
    tabulable; flechas, Inicio y Fin mueven el foco, y enfocar ELIGE (el
    inspector sigue al foco). Evita un esquema de quince paradas de tabulador
    o un foco que no cambia lo que se lee.
  */
  it("sólo el elegido es tabulable; las flechas mueven el foco y enfocar elige", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    const buttons = () => [...section("omsta").querySelectorAll<HTMLButtonElement>(".holo-node__box")];
    const heading = () => within(inspector("omsta")).getByRole("heading", { level: 3 });
    const order = buttons().map((button) => button.closest(".holo-node")?.getAttribute("data-node-id"));
    expect(order).toEqual(omsta.architecture.nodes.map((node) => node.id));
    expect(buttons().filter((button) => button.tabIndex === 0)).toEqual([nodeButton("omsta", "pagos")]);
    expect(nodeButton("omsta", "pagos")).toHaveAttribute("aria-pressed", "true");

    const pagos = order.indexOf("pagos");
    act(() => nodeButton("omsta", "pagos").focus());
    fireEvent.keyDown(nodeButton("omsta", "pagos"), { key: "ArrowDown" });
    const next = omsta.architecture.nodes[pagos + 1];
    expect(buttons()[pagos + 1]).toHaveFocus();
    expect(heading()).toHaveTextContent(next.label);
    expect(buttons()[pagos + 1]).toHaveAttribute("aria-pressed", "true");
    expect(nodeButton("omsta", "pagos")).toHaveAttribute("aria-pressed", "false");
    expect(buttons().filter((button) => button.tabIndex === 0)).toEqual([buttons()[pagos + 1]]);

    fireEvent.keyDown(buttons()[pagos + 1], { key: "ArrowUp" });
    expect(nodeButton("omsta", "pagos")).toHaveFocus();
    fireEvent.keyDown(nodeButton("omsta", "pagos"), { key: "End" });
    expect(buttons().at(-1)).toHaveFocus();
    expect(heading()).toHaveTextContent(omsta.architecture.nodes.at(-1)!.label);
    fireEvent.keyDown(buttons().at(-1)!, { key: "ArrowRight" });
    expect(buttons()[0]).toHaveFocus();
    fireEvent.keyDown(buttons()[0], { key: "ArrowLeft" });
    expect(buttons().at(-1)).toHaveFocus();
    fireEvent.keyDown(buttons().at(-1)!, { key: "Home" });
    expect(buttons()[0]).toHaveFocus();
    expect(heading()).toHaveTextContent(omsta.architecture.nodes[0].label);
    expect(live()).toHaveTextContent(`OMSTA · Ingeniería · ${omsta.counts.modules} módulos`);
  });

  /*
    Garantiza que apuntar un módulo lo PREVISUALIZA —inspector, marca y
    líneas— sin mover la parada de tabulador ni el módulo elegido, y que al
    salir del esquema vuelve el elegido. Evita que el ratón le quite al
    teclado su sitio en el esquema.
  */
  it("apuntar un módulo lo previsualiza sin mover el elegido; al salir vuelve el elegido", () => {
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    const heading = () => within(inspector("omsta")).getByRole("heading", { level: 3 });
    fireEvent.pointerEnter(nodeButton("omsta", "redis"));
    expect(heading()).toHaveTextContent("Redis");
    expect(section("omsta").querySelector('.holo-node[data-node-id="redis"]')).toHaveAttribute("data-selected", "true");
    expect(nodeButton("omsta", "pagos")).toHaveAttribute("aria-pressed", "true");
    expect(nodeButton("omsta", "pagos").tabIndex).toBe(0);
    expect(nodeButton("omsta", "redis").tabIndex).toBe(-1);
    fireEvent.pointerLeave(section("omsta").querySelector(".holo-diagram__field") as HTMLElement);
    expect(heading()).toHaveTextContent("Pagos y cobros");
  });

  /*
    Garantiza que el TECLADO manda sobre un ratón en reposo: enfocar un módulo
    mientras el puntero sigue sobre otro lleva el enfocado al inspector, con
    su decisión. Evita el fallo medido a 375 px: el scroll del foco deja un
    nodo bajo el ratón quieto y la mesa se queda en él mientras el foco
    recorre los demás (P7, P12).
  */
  it("enfocar un módulo lo lleva al inspector aunque el puntero repose sobre otro", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    fireEvent.pointerEnter(nodeButton("omsta", "redis"));
    const target = omsta.architecture.nodes.filter((node) => node.decision).at(-1)!;
    act(() => nodeButton("omsta", target.id).focus());
    expect(nodeButton("omsta", target.id)).toHaveAttribute("aria-pressed", "true");
    expect(within(inspector("omsta")).getByRole("heading", { level: 3 })).toHaveTextContent(target.label);
    expect(inspector("omsta").querySelector("blockquote")).toHaveTextContent(target.decision as string);
  });

  /*
    Garantiza que cada decisión va pegada a SU nodo y se anuncia por
    `aria-describedby`, que un nodo sin decisión no promete ninguna, y que
    pulsar un módulo lo lleva al inspector (sin decisión, sin cita). Evita
    decisiones huérfanas o un `aria-describedby` hacia la nada (P12).
  */
  it("cada decisión va pegada a su nodo por aria-describedby y pulsar elige", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Ingeniería/));
    for (const node of omsta.architecture.nodes) {
      const button = nodeButton("omsta", node.id);
      const described = button.getAttribute("aria-describedby");
      if (!node.decision) {
        expect(described, node.id).toBeNull();
        expect(button.closest(".holo-node")?.querySelector(".holo-node__decision"), node.id).toBeNull();
        continue;
      }
      const decision = document.getElementById(described as string);
      expect(decision, node.id).toHaveClass("holo-node__decision");
      expect(decision?.parentElement, node.id).toBe(button.closest(".holo-node"));
      expect(decision, node.id).toHaveTextContent(node.decision);
    }
    expect(section("omsta").querySelectorAll(".holo-node__decision")).toHaveLength(omsta.counts.decisions);

    fireEvent.click(nodeButton("omsta", "redis"));
    expect(within(inspector("omsta")).getByRole("heading", { level: 3 })).toHaveTextContent("Redis");
    expect(inspector("omsta").querySelector("blockquote")).toBeNull();
    expect(nodeButton("omsta", "redis")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("EngineeringTable · fichas incompletas (P3)", () => {
  /*
    Garantiza que una ficha sin galería, sin enlaces y sin arquitectura se
    pinta entera: nombre, qué es, salida al caso, una pantalla, cifras en cero
    donde toca, y un sistema derivado del stack sin líneas ni decisiones
    pegadas, cuyo inspector lee la decisión de la ficha. Evita un componente
    roto por un dato ausente (A18).
  */
  it("sin galería, sin enlaces y sin arquitectura se pinta con dignidad", () => {
    renderTable([bare()]);
    expect(screen.getByRole("heading", { level: 2, name: "Mínima" })).toBeInTheDocument();
    expect(section("network").querySelector(".table-read__descriptor")).toHaveTextContent("Ficha");
    expect(screen.getByRole("link", { name: /Explorar proyecto/ })).toHaveAttribute("href", "/es/proyectos/minima");
    expect(screen.queryByRole("link", { name: /Visitar/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Código/ })).toBeNull();
    expect(readout("network")).toEqual({ Pantallas: "01", Módulos: "02", Decisiones: "00" });
    // Una sola pantalla, la destacada, con su alt entero.
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByAltText("Portada mínima").closest("figure")).toHaveAttribute("data-slot", "main");

    // Diseño con una sola pantalla: el tambor no tiene a dónde ir y no se rompe.
    fireEvent.click(tab(/Diseño/));
    fireEvent.click(screen.getByRole("button", { name: "Pantalla siguiente" }));
    expect(noteText("network")).toBe("01 / 01La portada.");

    // Ingeniería derivada del stack: un nodo por tecnología, sin líneas ni decisiones.
    fireEvent.click(tab(/Ingeniería/));
    expect(document.querySelectorAll(".holo-node")).toHaveLength(2);
    expect(document.querySelectorAll(".holo-line")).toHaveLength(0);
    expect(document.querySelectorAll(".holo-node__decision")).toHaveLength(0);
    for (const button of document.querySelectorAll(".holo-node__box")) {
      expect(button).not.toHaveAttribute("aria-describedby");
    }
    const card = within(inspector("network"));
    expect(card.getByRole("heading", { level: 3 })).toHaveTextContent("React");
    expect(inspector("network").querySelector("blockquote")).toHaveTextContent("La única decisión.");
    expect(card.queryByText("Recibe de")).toBeNull();
    expect(card.queryByText("Entrega a")).toBeNull();
    // La ficha de texto también: una pantalla y dos módulos sin decisión.
    const fallback = section("network").querySelector(".table-fallback") as HTMLElement;
    expect(fallback.querySelectorAll("ol > li")).toHaveLength(1);
    expect(fallback.querySelectorAll("dl dt")).toHaveLength(2);
    expect(fallback.querySelectorAll("dl dd")).toHaveLength(0);
  });

  /*
    Garantiza que un sistema DECLARADO sin ninguna decisión no finge una: el
    inspector no cita nada (la decisión de la ficha es sólo para el esquema
    derivado) y ningún nodo lleva `aria-describedby`. Evita que la página
    atribuya a un módulo lo que la ficha dice del proyecto.
  */
  it("un sistema declarado sin decisiones no cita ninguna", () => {
    const silent = bare({
      architecture: {
        nodes: [
          { id: "web", label: "Web", lane: "cliente" },
          { id: "api", label: "API", lane: "servicio" },
        ],
        edges: [["web", "api"]],
      },
    });
    renderTable([silent]);
    fireEvent.click(tab(/Ingeniería/));
    expect(document.querySelectorAll(".holo-line")).toHaveLength(1);
    expect(within(inspector("network")).getByRole("heading", { level: 3 })).toHaveTextContent("Web");
    expect(inspector("network").querySelector("blockquote")).toBeNull();
    expect(within(inspector("network")).getByText("Entrega a").nextElementSibling).toHaveTextContent("API");
    expect(readout("network").Decisiones).toBe("00");
  });

  /*
    Garantiza que «Visitar el sitio» aparece en cuanto el MDX trae `kind:
    demo`, se abre aparte y sin `opener`; que «Código» hace lo mismo con el
    repositorio; y que un enlace de contacto no se pinta. Evita un botón ámbar
    que no abre nada o que expone la ventana de origen.
  */
  it("«Visitar el sitio» y «Código» salen de los enlaces del MDX y se abren aparte", () => {
    const linked = {
      ...bare(),
      links: [
        { label: "Visitar el sitio", href: "https://ejemplo.test", kind: "demo" as const },
        { label: "Ver repositorio", href: "https://github.test/minima", kind: "repository" as const },
        { label: "Hablemos", href: "/es/contacto", kind: "contact" as const },
      ],
    };
    renderTable([linked]);
    const site = screen.getByRole("link", { name: /Visitar el sitio/ });
    expect(site).toHaveAttribute("href", "https://ejemplo.test");
    expect(site).toHaveClass("table-cta--site");
    const code = screen.getByRole("link", { name: /Código/ });
    expect(code).toHaveAttribute("href", "https://github.test/minima");
    for (const external of [site, code]) {
      expect(external).toHaveAttribute("target", "_blank");
      expect(external).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.queryByRole("link", { name: /Hablemos/ })).toBeNull();
  });
});
