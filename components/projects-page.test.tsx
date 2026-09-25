import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { Project } from "@/lib/projects";
import { getF1AProjects } from "@/lib/projects";
import { initialNode, nodePath, statusReadout, tableProject, type TableProject } from "@/lib/engineering-table";
import { getWorld } from "@/lib/worlds";
import { EngineeringTable } from "./engineering-table";
import { ProjectsPage } from "./projects-page";
import { LANE_LABEL } from "./system-diagram";

const settings = vi.hoisted(() => ({ motion: true }));
vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => settings.motion }));

/**
 * LA MESA DE INGENIERÍA, en jsdom (`docs/design/endurance-proyectos.md` §11,
 * §16 y §17).
 *
 * Lo que se prueba aquí es el CONTRATO del DOM, no la coreografía: que el
 * HTML servido no decida el proyecto (P5, en su parte de servidor), que sólo
 * la capa elegida del proyecto a la vista sea operable (P4, por atributo
 * porque jsdom no implementa `inert`), que una ficha sin galería, sin enlaces
 * y sin decisiones se pinte con dignidad (P3), que las cifras salgan de los
 * datos (P11), que con el movimiento apagado no haya cruce (P10, lo que jsdom
 * puede ver), que la salida al caso completo esté siempre a mano (A20) y, del
 * tercer pase, que la mesa cambie de función con la capa —alcance, decisión,
 * mapa del sistema— y que el muelle se opere con clic, teclado y rueda.
 */

const world = getWorld("endurance", "es");
const catalog = () => getF1AProjects("es");
const table = () => catalog().map((project) => tableProject(project, "/es/proyectos"));
const pad = (value: number) => String(value).padStart(2, "0");
const section = (id: string) => document.getElementById(id) as HTMLElement;
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const live = () => document.querySelector('[aria-live="polite"]') as HTMLElement;
const dock = () => screen.getByRole("navigation", { name: "Proyectos" });
const dockLink = (id: string) => dock().querySelector(`a[href="#${id}"]`) as HTMLAnchorElement;
const inspector = (id: string) =>
  within(section(id)).getByRole("region", { name: "Inspector del módulo" });
const nodeButton = (id: string, nodeId: string) =>
  section(id).querySelector(`.holo-node[data-node-id="${nodeId}"] .holo-node__box`) as HTMLButtonElement;
const frames = (id: string) => [...section(id).querySelectorAll<HTMLButtonElement>(".holo-screen__pick")];
const noteText = (id: string) => section(id).querySelector(".holo-note__text")?.textContent;
/** La nota de Diseño de un paso con decisión, tal como se lee en el DOM. */
const decisionNote = (project: TableProject, step: number) =>
  `${pad(step + 1)} / ${pad(project.reel.length)}Problema${project.reel[step].problem}Decisión${project.reel[step].note}`;
/** El alcance de un proyecto, como pares rótulo → cifra. */
const scope = (root: ParentNode) =>
  Object.fromEntries(
    [...root.querySelectorAll(".holo-scope dl > div")].map((row) => [
      row.querySelector("dt")?.textContent,
      row.querySelector("dd")?.textContent,
    ]),
  );
/** Un proyecto del catálogo sin sus decisiones de diseño: el carrete vuelve a los pies. */
function withoutDecisions(id: string): TableProject {
  const project = catalog().find((entry) => entry.id === id) as Project;
  return tableProject({ ...project, prose: { ...project.prose, designDecisions: undefined } }, "/es/proyectos");
}

/**
 * Una ficha mínima INVENTADA: sin galería, sin enlaces, sin alcance, sin
 * decisiones y sin arquitectura declarada —el esquema se deriva de su stack—.
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
    <EngineeringTable head={{ kicker: "Endurance / Mesa de ingeniería", title: "Proyectos" }} projects={projects} />,
  );
}

afterEach(() => {
  settings.motion = true;
  window.history.replaceState(null, "", window.location.pathname);
});

/* ── La página ────────────────────────────────────────────────────────────── */

describe("ProjectsPage", () => {
  /*
    Garantiza la lectura de cada proyecto: su nombre como h2 (con su longitud
    para dimensionarlo), qué es, su estado (con la etiqueta completa como
    nombre accesible), su stack como lista y la salida al caso completo. Evita
    perder el texto real de la mesa (regla 7) o la salida al caso (A20).
  */
  it("el h1 es el destino y cada proyecto es una sección con nombre, qué es, estado, stack y salida al caso", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    expect(screen.getByRole("heading", { level: 1, name: "Proyectos" })).toBeInTheDocument();
    const projects = table();
    expect(document.querySelectorAll("section.table-project")).toHaveLength(projects.length);
    for (const project of projects) {
      const scoped = within(section(project.id));
      const title = scoped.getByRole("heading", { level: 2, name: project.name });
      // El tamaño del nombre sale de su longitud (§17), no de un caso por proyecto.
      expect(title.style.getPropertyValue("--len"), project.id).toBe(String(Math.max(project.name.length, 5)));
      expect(section(project.id).querySelector(".table-read__descriptor")).toHaveTextContent(project.descriptor);
      // Se ve la lectura corta; el lector de pantalla lee la etiqueta entera del
      // MDX, como texto y no como `title` (que ni el tacto ni el teclado ven).
      const status = section(project.id).querySelector(".table-read__status") as HTMLElement;
      expect(status).toHaveTextContent(statusReadout(project.status));
      expect(status.querySelector(".visually-hidden")).toHaveTextContent(project.statusLabel);
      expect(status.querySelector("[title]")).toBeNull();
      const stack = scoped.getByRole("list", { name: "Tecnologías" });
      expect(within(stack).getAllByRole("listitem").map((item) => item.textContent)).toEqual(project.technologies);
      expect(scoped.getByRole("link", { name: /Explorar proyecto/ })).toHaveAttribute("href", project.href);
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
    un enlace `kind: demo`, «Ver código» sólo con `kind: repository`, y que los
    enlaces de contacto ya no se pintan aquí. Evita un botón ámbar inventado
    (regla 8) o un enlace de contacto duplicado.
  */
  it("«Visitar el sitio» sólo con demo, «Ver código» sólo con repositorio, y el contacto no se pinta", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    for (const project of table()) {
      const scoped = within(section(project.id));
      const demo = project.links.find((link) => link.kind === "demo");
      const repository = project.links.find((link) => link.kind === "repository");
      if (demo) expect(scoped.getByRole("link", { name: new RegExp(demo.label) })).toHaveAttribute("href", demo.href);
      else expect(section(project.id).querySelector(".table-cta--site"), project.id).toBeNull();
      if (repository) expect(scoped.getByRole("link", { name: /Ver código/ })).toHaveAttribute("href", repository.href);
      else expect(scoped.queryByRole("link", { name: /Ver código/ }), project.id).toBeNull();
      for (const contact of project.links.filter((link) => link.kind === "contact")) {
        expect(scoped.queryByRole("link", { name: contact.label }), project.id).toBeNull();
      }
      // Lo único que sale de la sección hacia el sitio es el caso, la demo y el código.
      expect(section(project.id).querySelectorAll(".table-read a")).toHaveLength(1 + Number(Boolean(demo)) + Number(Boolean(repository)));
    }
  });

  /*
    Garantiza el ALCANCE de Producto (§17): tres cifras de cada MDX con su
    rótulo, bajo el título «Alcance», en el HTML servido (se lee sin JS y en
    móvil), con la longitud de la más larga para que las tres compartan un
    tamaño que quepa en su columna. Y que se retiraron la ficha «pantallas /
    módulos / decisiones» y la divisa del canto, que no se entendían. Evita
    cifras escritas a mano, «Markdown» desbordando hacia «OpenAPI» en móvil y
    elementos que no hacen nada.
  */
  it("el alcance de cada proyecto sale de su MDX y se sirve en el HTML; sin ficha técnica ni divisa", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    for (const { id, prose } of catalog()) {
      const sectionHtml = host.querySelector(`section#${id}`) as HTMLElement;
      const block = sectionHtml.querySelector(".holo-scope") as HTMLElement;
      expect(block, id).not.toBeNull();
      expect(block.querySelector(".holo-scope__title"), id).toHaveTextContent("Alcance");
      expect(block.querySelector("dl")?.getAttribute("aria-labelledby"), id).toBe(`${id}-scope`);
      expect(scope(sectionHtml), id).toEqual(Object.fromEntries((prose.scope ?? []).map((entry) => [entry.label, entry.value])));
      const longest = Math.max(3, ...(prose.scope ?? []).map((entry) => entry.value.length));
      expect(block.style.getPropertyValue("--vlen"), id).toBe(String(longest));
    }
    expect(host.querySelector(".table-readout")).toBeNull();
    expect(host.querySelector(".table-motto")).toBeNull();
    expect(host.querySelector(".console__plate")).toBeNull();
  });

  /*
    Garantiza que las cifras de las tarjetas del sistema se cuentan del MDX
    de cada proyecto, con dos cifras. Evita el «8 radiadores» otra vez (O4,
    P11).
  */
  it("las cifras del sistema de cada proyecto salen de su MDX (P11)", () => {
    render(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    for (const { id, prose } of catalog()) {
      const nodes = prose.architecture?.nodes ?? [];
      const decisions = nodes.filter((node) => node.decision).length;
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
    decide `:target` (o el primero); el muelle es una lista de enlaces `#id`
    sin `aria-current`, sin la luz que se desliza (nace al hidratar) y sin
    vista previa. Y que cada sección trae la ficha de texto —pantallas con su
    nota y sistema con sus decisiones— que se pinta con `scripting: none`.
    Evita la mesa convertida en el contenido (P5, regla 7) y que el servidor
    pinte OMSTA antes de que `#wikiverse` lo sustituya.
  */
  it("el HTML servido no decide el proyecto y cada sección lleva su ficha de texto (P5)", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ProjectsPage locale="es" projects={catalog()} world={world} />);
    const root = host.querySelector(".table") as HTMLElement;
    expect(root).not.toHaveAttribute("data-enhanced");
    // El encendido es CSS desde el primer pintado: ningún atributo lo arranca
    // al hidratar, que es lo que escondía algo ya pintado.
    expect(root).not.toHaveAttribute("data-boot");
    // Ninguna sección se oculta ni se inertiza desde el servidor: `:target` decide.
    // (Los mandos de Diseño e Ingeniería sí van `inert`: la capa servida es Producto.)
    expect(host.querySelectorAll("section.table-project[data-state], section.table-project[inert], [role='tabpanel']")).toHaveLength(0);
    expect(host.querySelectorAll("section.table-project")).toHaveLength(catalog().length);
    const nav = host.querySelector('nav[aria-label="Proyectos"]') as HTMLElement;
    expect(nav.querySelectorAll("[aria-current], li[data-dist]")).toHaveLength(0);
    expect(nav.querySelector(".table-dock__glow")).toBeNull();
    expect(nav.querySelector(".table-dock__peek")).toBeNull();
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
      expect(nav.querySelector(`a[href="#${id}"]`), id).not.toBeNull();
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
    expect(tabs.map((entry) => entry.textContent)).toEqual(["Producto", "Diseño", "Ingeniería"]);
    expect(tabs.map((entry) => entry.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs.map((entry) => entry.tabIndex)).toEqual([0, -1, -1]);
    for (const entry of tabs) expect(entry).toHaveAttribute("aria-controls", "omsta-stage");
    const stage = document.getElementById("omsta-stage") as HTMLElement;
    expect(stage).toHaveAttribute("role", "tabpanel");
    expect(stage).toHaveAttribute("aria-labelledby", "table-tab-producto");
    expect(document.querySelector(".table")).toHaveAttribute("data-layer", "producto");

    fireEvent.click(tab(/Ingeniería/));
    expect(tab(/Ingeniería/)).toHaveAttribute("aria-selected", "true");
    expect(stage).toHaveAttribute("aria-labelledby", "table-tab-ingenieria");
    expect(document.querySelector(".table")).toHaveAttribute("data-layer", "ingenieria");
  });

  /*
    Garantiza que el escenario de cada proyecto trae lo que el par esquema +
    inspector necesita para medirse (§17): sus columnas —carriles ocupados— y
    sus filas. Evita un esquema de ancho fijo lleno de vacío.
  */
  it("el escenario lleva las columnas y filas del sistema de su proyecto", () => {
    renderTable(table());
    for (const project of table()) {
      const stage = document.getElementById(`${project.id}-stage`) as HTMLElement;
      expect(stage.style.getPropertyValue("--cols"), project.id).toBe(String(project.architecture.cols));
      expect(stage.style.getPropertyValue("--rows"), project.id).toBe(String(project.architecture.rows));
    }
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

    // Producto: nada de la mesa se opera; se lee.
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

    fireEvent.click(tab(/Producto/));
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
    const producto = tab(/Producto/);
    act(() => producto.focus());
    fireEvent.keyDown(producto, { key: "ArrowRight" });
    expect(tab(/Diseño/)).toHaveAttribute("aria-selected", "true");
    expect(tab(/Diseño/)).toHaveFocus();
    fireEvent.keyDown(tab(/Diseño/), { key: "End" });
    expect(tab(/Ingeniería/)).toHaveFocus();
    expect(live()).toHaveTextContent(`OMSTA · Ingeniería · ${omsta.counts.modules} módulos`);
    fireEvent.keyDown(tab(/Ingeniería/), { key: "ArrowRight" });
    expect(producto).toHaveAttribute("aria-selected", "true");
    expect(producto).toHaveFocus();
    fireEvent.keyDown(producto, { key: "ArrowLeft" });
    expect(tab(/Ingeniería/)).toHaveFocus();
    fireEvent.keyDown(tab(/Ingeniería/), { key: "Home" });
    expect(producto).toHaveFocus();
    expect(producto).toHaveAttribute("tabindex", "0");
    expect(live()).toHaveTextContent("OMSTA · Producto");
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
    expect(within(dock()).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      table().map((project) => `#${project.id}`),
    );
    // El nombre accesible es el título entero; lo visible, el índice y el nombre corto.
    const wiki = within(dock()).getByRole("link", { name: /Wiki Universe/ });
    const omstaLink = within(dock()).getByRole("link", { name: "OMSTA — ERP para una agencia de viajes" });
    expect(omstaLink).toHaveAttribute("aria-current", "true");
    expect(omstaLink.querySelector(".table-dock__index")).toHaveTextContent("01");
    expect(omstaLink.querySelector(".table-dock__name")).toHaveTextContent("OMSTA");

    const depth = window.history.length;
    fireEvent.click(wiki);
    expect(window.location.hash).toBe("#wikiverse");
    expect(window.history.length).toBe(depth);
    expect(section("wikiverse")).toHaveAttribute("data-state", "active");
    expect(section("wikiverse")).not.toHaveAttribute("inert");
    expect(section("omsta")).toHaveAttribute("data-state", "leaving");
    expect(section("omsta")).toHaveAttribute("inert");
    expect(wiki).toHaveAttribute("aria-current", "true");
    expect(within(dock()).getByRole("link", { name: /OMSTA/ })).not.toHaveAttribute("aria-current");
    expect(tab(/Producto/)).toHaveAttribute("aria-controls", "wikiverse-stage");
    expect(live()).toHaveTextContent("Wiki Universe · Producto");
    await waitFor(() => expect(section("omsta")).toHaveAttribute("data-state", "hidden"));
  });

  /*
    Garantiza la luz del activo: nace al hidratar ya en su sitio y se coloca
    por el índice del proyecto (`--active`, sobre `--n` columnas iguales), y
    los vecinos se marcan más presentes que los lejanos. Evita una luz que
    viaja desde el primero en cada carga o que hay que medir en el DOM.
  */
  it("la luz del muelle sigue al activo por su índice y los vecinos se marcan", () => {
    renderTable(table());
    const nav = dock();
    expect(nav.querySelectorAll(".table-dock__glow")).toHaveLength(1);
    expect(nav.style.getPropertyValue("--n")).toBe("5");
    expect(nav.style.getPropertyValue("--active")).toBe("0");
    const distances = () => [...nav.querySelectorAll("li")].map((item) => item.getAttribute("data-dist"));
    expect(distances()).toEqual(["0", "1", "2", "2", "2"]);
    fireEvent.click(dockLink("wikiverse"));
    expect(nav.style.getPropertyValue("--active")).toBe("2");
    expect(distances()).toEqual(["2", "1", "0", "1", "2"]);
  });

  /*
    Garantiza los mandos del muelle: «Proyecto anterior» y «Proyecto
    siguiente» dan la vuelta; con el foco en el muelle, ← → pasan de proyecto
    y el foco viaja con el activo; Inicio y Fin van a los extremos. Evita un
    selector que sólo se opera con el ratón (P7).
  */
  it("el muelle se recorre con sus flechas y con el teclado, y el foco viaja con el activo", () => {
    renderTable(table());
    const nav = within(dock());
    fireEvent.click(nav.getByRole("button", { name: "Proyecto anterior" }));
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    fireEvent.click(nav.getByRole("button", { name: "Proyecto siguiente" }));
    expect(section("omsta")).toHaveAttribute("data-state", "active");

    act(() => dockLink("omsta").focus());
    fireEvent.keyDown(dockLink("omsta"), { key: "ArrowRight" });
    expect(section("izaks-photos")).toHaveAttribute("data-state", "active");
    expect(dockLink("izaks-photos")).toHaveFocus();
    expect(dockLink("izaks-photos")).toHaveAttribute("aria-current", "true");
    fireEvent.keyDown(dockLink("izaks-photos"), { key: "End" });
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    expect(dockLink("delicate")).toHaveFocus();
    fireEvent.keyDown(dockLink("delicate"), { key: "ArrowRight" });
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    expect(dockLink("omsta")).toHaveFocus();
    fireEvent.keyDown(dockLink("omsta"), { key: "ArrowLeft" });
    expect(dockLink("delicate")).toHaveFocus();
    fireEvent.keyDown(dockLink("delicate"), { key: "Home" });
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    expect(live()).toHaveTextContent("OMSTA · Producto");
  });

  /*
    Garantiza las flechas GLOBALES: con el foco en `body`, ← → pasan de
    proyecto; con el foco en el selector de capa (que ya usa flechas), no; y
    con un modificador, tampoco. Evita secuestrar las flechas de un mando o un
    atajo del navegador.
  */
  it("← → globales cambian de proyecto sólo con el foco en body", () => {
    renderTable(table());
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(section("izaks-photos")).toHaveAttribute("data-state", "active");
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    fireEvent.keyDown(document.body, { key: "ArrowRight", altKey: true });
    expect(section("delicate")).toHaveAttribute("data-state", "active");

    // En el selector de capa las flechas son de las capas, no de los proyectos.
    act(() => tab(/Producto/).focus());
    fireEvent.keyDown(tab(/Producto/), { key: "ArrowRight" });
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    expect(tab(/Diseño/)).toHaveAttribute("aria-selected", "true");
  });

  /*
    Garantiza la rueda HORIZONTAL sobre el muelle: un gesto pasa un proyecto
    (acumulado con umbral y descanso, para que la inercia de un trackpad no se
    lleve tres), y la rueda vertical nunca se toca: es el scroll de la página.
  */
  it("la rueda horizontal sobre el muelle pasa un proyecto por gesto; la vertical no se toca", () => {
    renderTable(table());
    const wheel = (deltaX: number, deltaY = 0) => {
      const event = new WheelEvent("wheel", { deltaX, deltaY, bubbles: true, cancelable: true });
      act(() => {
        dock().dispatchEvent(event);
      });
      return event;
    };
    const vertical = wheel(0, 240);
    expect(vertical.defaultPrevented).toBe(false);
    expect(section("omsta")).toHaveAttribute("data-state", "active");

    // Por debajo del umbral no pasa nada, pero el gesto ya es del muelle.
    expect(wheel(30).defaultPrevented).toBe(true);
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    wheel(40);
    expect(section("izaks-photos")).toHaveAttribute("data-state", "active");
    // La inercia que sigue cae en el descanso.
    wheel(120);
    wheel(120);
    expect(section("izaks-photos")).toHaveAttribute("data-state", "active");
  });

  /*
    Garantiza que la cola de inercia de un trackpad —eventos seguidos durante
    más de un segundo— es UN gesto: el descanso se alarga mientras llegan, y
    el muelle sólo se rearma tras un silencio. Evita el «omsta > izaks >
    wikiverse» de un solo deslizamiento que midió la crítica.
  */
  it("una inercia larga de trackpad sigue siendo un gesto; tras un silencio, el siguiente pasa", () => {
    renderTable(table());
    // Cada evento con su marca de tiempo: la inercia es la cadencia, no el reloj del test.
    const at = (timeStamp: number, deltaX: number) => {
      const event = new WheelEvent("wheel", { deltaX, deltaY: 0, bubbles: true, cancelable: true });
      Object.defineProperty(event, "timeStamp", { value: timeStamp });
      act(() => {
        dock().dispatchEvent(event);
      });
    };
    const start = 10_000;
    // 1,4 s de inercia decreciente, un evento cada 16 ms: más de 1.000 px en total.
    for (let index = 0; index < 88; index++) at(start + index * 16, 40 * 0.97 ** index);
    expect(section("izaks-photos")).toHaveAttribute("data-state", "active");
    // Tras un silencio, un gesto nuevo sí pasa el siguiente.
    at(start + 88 * 16 + 400, 80);
    expect(section("wikiverse")).toHaveAttribute("data-state", "active");
  });

  /*
    Garantiza la vista previa del muelle: apuntar con el ratón un proyecto que
    no es el activo enseña su pantalla destacada en miniatura, su nombre y qué
    es; salir la apaga; y el activo no se previsualiza. Es decorado para quien
    ya lee el enlace: `aria-hidden`. Evita una vista previa que repite lo que
    ya está en la mesa o que se lee dos veces.
  */
  it("apuntar un proyecto del muelle lo previsualiza; el activo no; Escape la cierra", () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const projects = table();
    renderTable(projects);
    const peek = () => dock().querySelector(".table-dock__peek");
    expect(peek()).toBeNull();
    fireEvent.pointerEnter(dockLink("delicate"), { pointerType: "mouse" });
    const delicate = projects.find((project) => project.id === "delicate") as TableProject;
    expect(peek()).toHaveAttribute("data-open", "true");
    expect(peek()).toHaveAttribute("aria-hidden", "true");
    expect(peek()?.querySelector("img")).toHaveAttribute("src", delicate.screens[0].sources.thumb);
    expect(peek()).toHaveTextContent(delicate.name);
    expect(peek()).toHaveTextContent(delicate.descriptor);
    // Salir del enlace la apaga con un respiro: da tiempo a llevar el puntero
    // a la vista previa, que mientras se apunta se queda.
    fireEvent.pointerLeave(dockLink("delicate"), { pointerType: "mouse" });
    expect(peek()).toHaveAttribute("data-open", "true");
    fireEvent.pointerEnter(peek() as Element, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(peek()).toHaveAttribute("data-open", "true");
    fireEvent.pointerLeave(peek() as Element, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(peek()).not.toHaveAttribute("data-open");

    // Escape la cierra siempre, esté donde esté el puntero (WCAG 1.4.13).
    fireEvent.pointerEnter(dockLink("wikiverse"), { pointerType: "mouse" });
    expect(peek()).toHaveAttribute("data-open", "true");
    expect(peek()).toHaveTextContent("Wiki Universe");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(peek()).not.toHaveAttribute("data-open");

    fireEvent.pointerEnter(dockLink("omsta"), { pointerType: "mouse" });
    expect(peek()).not.toHaveAttribute("data-open");
    // Con el dedo no hay vista previa: tocar ya elige.
    fireEvent.pointerEnter(dockLink("network"), { pointerType: "touch" });
    expect(peek()).not.toHaveAttribute("data-open");
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
    expect(root).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("link", { name: /Network 3.0/ }));
    expect(section("network")).toHaveAttribute("data-state", "active");
    expect(section("omsta")).toHaveAttribute("data-state", "hidden");
    expect(document.querySelectorAll('[data-state="leaving"]')).toHaveLength(0);
  });

  /*
    Garantiza que hidratar no es un cambio: la región viva calla al entrar y
    sólo habla cuando el visitante cambia algo. Evita un anuncio en cada carga.
  */
  it("con el movimiento encendido la mesa se marca viva, y hidratar no se anuncia", () => {
    const omsta = table()[0];
    renderTable(table());
    const root = document.querySelector(".table");
    expect(root).toHaveAttribute("data-enhanced", "true");
    expect(root).toHaveAttribute("data-motion", "on");
    expect(root).not.toHaveAttribute("data-boot");
    expect(live()).toBeEmptyDOMElement();
    fireEvent.click(tab(/Diseño/));
    expect(live()).toHaveTextContent(`OMSTA · Diseño · decisión 1 de ${omsta.reel.length}: ${omsta.reel[0].note}`);
  });

  /*
    Garantiza que un ancla que no nombra un proyecto («Saltar al contenido»,
    «Volver arriba»: `#main-content`) no cambia el proyecto a la vista. Evita
    volver a OMSTA por subir al principio de la página.
  */
  it("un ancla que no es un proyecto conserva el proyecto elegido", () => {
    renderTable(table());
    fireEvent.click(screen.getByRole("link", { name: /Delicaté/ }));
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    act(() => {
      window.location.hash = "#main-content";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(section("delicate")).toHaveAttribute("data-state", "active");
    expect(section("omsta")).not.toHaveAttribute("data-state", "active");
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
    expect(tab(/Producto/)).toHaveAttribute("aria-controls", "delicate-stage");
    unmount();
    window.history.replaceState(null, "", "#nada");
    renderTable(projects);
    expect(section("omsta")).toHaveAttribute("data-state", "active");
    expect(document.querySelectorAll('.table-project[data-state="active"]')).toHaveLength(1);
  });

  /*
    Garantiza que el paso del carrete y el módulo del inspector pertenecen al
    proyecto: al cambiarlo, el nuevo entra por su primera decisión y por su
    primer módulo con decisión. Evita arrastrar la cuarta decisión de OMSTA a
    un proyecto de tres (una nota vacía).
  */
  it("al cambiar de proyecto, el carrete y el inspector empiezan de nuevo", () => {
    const projects = table();
    const omsta = projects[0];
    renderTable(projects);
    fireEvent.click(tab(/Diseño/));
    const last = omsta.reel.length - 1;
    fireEvent.click(frames("omsta")[omsta.reel[last].screen]);
    expect(noteText("omsta")).toBe(decisionNote(omsta, last));
    fireEvent.click(tab(/Ingeniería/));
    fireEvent.click(nodeButton("omsta", "redis"));
    expect(within(inspector("omsta")).getByRole("heading", { level: 3 })).toHaveTextContent("Redis");

    fireEvent.click(screen.getByRole("link", { name: /Izak's Photos/ }));
    const izaks = projects.find((project) => project.id === "izaks-photos") as TableProject;
    const first = izaks.architecture.nodes.find((node) => node.id === initialNode(izaks.architecture));
    expect(within(inspector("izaks-photos")).getByRole("heading", { level: 3 })).toHaveTextContent(first?.label as string);
    fireEvent.click(tab(/Diseño/));
    expect(noteText("izaks-photos")).toBe(decisionNote(izaks, 0));
  });
});

describe("EngineeringTable · la mesa física", () => {
  /*
    Garantiza el MAPA GLOBAL de Ingeniería (§17): el anillo grabado dibuja un
    segmento por módulo del proyecto a la vista y un filo por carril; sigue al
    foco del esquema y al cambiar de proyecto, con dos lecturas que no se
    pisan —el filo y el trazo dicen el CARRIL del módulo en foco; el relleno,
    su RUTA, sea del carril que sea—; en el centro, sólo el carril encendido
    con su cifra. No se lee dos veces (`aria-hidden`), ya no hay placa ni
    plano de la nave, y el stack grabado es el del proyecto, una pieza por
    tecnología. Evita un anillo decorativo que no corresponde al sistema, un
    carril que tapa la ruta (Nómina encendida como si Pagos la usara) y los
    rótulos de carril repetidos bajo el esquema.
  */
  it("el anillo es el sistema del proyecto a la vista y sigue al foco del esquema", () => {
    const projects = table();
    renderTable(projects);
    const etched = document.querySelector(".console") as HTMLElement;
    expect(etched).toHaveAttribute("aria-hidden", "true");
    expect(etched.querySelector(".console__plate, .console__quadrant, .console__etching, .console__arc")).toBeNull();
    /** Los módulos en el orden del anillo: por carril y, dentro, por fila. */
    const order = (project: TableProject) =>
      project.architecture.lanes.flatMap(({ lane: entry }) =>
        project.architecture.nodes
          .filter((node) => node.lane === entry)
          .sort((left, right) => left.row - right.row)
          .map((node) => node.id),
      );
    const segments = () => [...etched.querySelectorAll(".console__seg")];
    const segment = (project: TableProject, id: string) => segments()[order(project).indexOf(id)];
    const states = () =>
      Object.fromEntries(
        segments().map((path, index) => [index, [path.getAttribute("data-state"), path.getAttribute("data-lane-on")]]),
      );
    const expected = (project: TableProject, focus: string) => {
      const path = nodePath(project.architecture.edges, focus);
      const lane = project.architecture.nodes.find((node) => node.id === focus)?.lane;
      return Object.fromEntries(
        order(project).map((id, index) => {
          const node = project.architecture.nodes.find((entry) => entry.id === id)!;
          const state = id === focus ? "focus" : path.upstream.has(id) || path.downstream.has(id) ? "path" : null;
          return [index, [state, node.lane === lane ? "true" : null]];
        }),
      );
    };
    const readout = () => etched.querySelector(".console__readout")?.textContent;
    const omsta = projects[0];
    expect(segments()).toHaveLength(omsta.counts.modules);

    // OMSTA con Pagos y cobros en foco: Nómina es de su carril, pero no de su
    // ruta; PostgreSQL es de otro carril, y sí de su ruta.
    expect(initialNode(omsta.architecture)).toBe("pagos");
    expect(segment(omsta, "pagos")).toHaveAttribute("data-state", "focus");
    expect(segment(omsta, "nomina")).toHaveAttribute("data-lane-on", "true");
    expect(segment(omsta, "nomina")).not.toHaveAttribute("data-state");
    expect(segment(omsta, "postgresql")).toHaveAttribute("data-state", "path");
    expect(segment(omsta, "postgresql")).not.toHaveAttribute("data-lane-on");
    const servicio = omsta.architecture.lanes.find(({ lane }) => lane === "servicio")!;
    expect(readout()).toBe(`${pad(servicio.count)}${LANE_LABEL.servicio}`);
    expect(etched.querySelectorAll(".console__lane")).toHaveLength(omsta.architecture.lanes.length);
    expect(etched.querySelectorAll('.console__lane[data-on="true"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("link", { name: /Izak's Photos/ }));
    fireEvent.click(tab(/Ingeniería/));
    const izaks = projects.find((project) => project.id === "izaks-photos") as TableProject;
    expect(segments()).toHaveLength(izaks.counts.modules);
    expect([...etched.querySelectorAll(".console__spec > span")].map((item) => item.textContent)).toEqual(
      izaks.technologies,
    );
    const chosen = initialNode(izaks.architecture) as string;
    expect(states()).toEqual(expected(izaks, chosen));
    const focusLane = izaks.architecture.nodes.find((node) => node.id === chosen)!.lane;
    const lit = izaks.architecture.lanes.find(({ lane }) => lane === focusLane)!;
    expect(readout()).toBe(`${pad(lit.count)}${LANE_LABEL[focusLane]}`);

    // Apuntar otro módulo del esquema mueve el foco del anillo con él.
    const other = izaks.architecture.nodes.find((node) => node.lane !== focusLane)!;
    fireEvent.pointerEnter(nodeButton("izaks-photos", other.id));
    expect(states()).toEqual(expected(izaks, other.id));
    expect(segment(izaks, other.id)).toHaveAttribute("data-state", "focus");
    expect(readout()).toContain(LANE_LABEL[other.lane]);
  });
});

describe("EngineeringTable · Producto y Diseño", () => {
  /*
    Garantiza que los puestos de Producto salen de los datos (P2 en el DOM),
    que cada pantalla lleva su luma medida para exponerse (§17) y que sólo la
    destacada del primer proyecto se pide sin pereza. Evita poses escritas a
    mano, una interfaz blanca que ilumina la sala y cinco capturas compitiendo
    por el LCP.
  */
  it("cada pantalla lleva su puesto y su luma de los datos, y sólo la primera destacada se pide sin pereza", () => {
    const projects = table();
    renderTable(projects);
    for (const project of projects) {
      const figures = [...section(project.id).querySelectorAll<HTMLElement>("figure.holo-screen")];
      expect(figures.map((figure) => figure.getAttribute("data-slot")), project.id).toEqual(
        project.screens.map((entry) => entry.slot ?? "none"),
      );
      expect(figures.map((figure) => figure.getAttribute("data-frame")), project.id).toEqual(
        project.screens.map((entry) => entry.frame),
      );
      expect(figures.map((figure) => figure.style.getPropertyValue("--luma")), project.id).toEqual(
        project.screens.map((entry) => String(entry.sources.luma)),
      );
    }
    const eager = [...document.querySelectorAll(".holo-screen img")].filter((img) => !img.hasAttribute("loading"));
    expect(eager).toHaveLength(1);
    expect(eager[0]).toHaveAttribute("alt", projects[0].screens[0].alt);
  });

  /*
    Garantiza el carrete de DECISIONES con teclado: arranca en la pantalla de
    la primera decisión; las flechas giran (y dan la vuelta) por las pantallas
    que tienen decisión, el foco viaja a la nueva elegida, que es la única
    tabulable y la que lleva `aria-current`; lo que no es una decisión (o cae
    lejos) se marca `data-far`; la nota dice índice, problema y decisión, y la
    región viva lo anuncia sin repetir lo que el foco ya lleva. Evita un
    carrete que sólo se opera con el ratón o que vuelve a ser la galería.
  */
  it("Diseño: el carrete recorre las decisiones con las flechas y la nota dice problema y decisión", async () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Diseño/));
    const figures = () => [...section("omsta").querySelectorAll("figure.holo-screen")];
    const frontIndex = () => figures().findIndex((figure) => figure.hasAttribute("data-front"));
    const reelScreens = omsta.reel.map((step) => step.screen);

    expect(frontIndex()).toBe(reelScreens[0]);
    expect(frames("omsta").map((frame) => frame.tabIndex)).toEqual(omsta.screens.map((_, i) => (i === reelScreens[0] ? 0 : -1)));
    expect(frames("omsta")[reelScreens[0]]).toHaveAttribute("aria-current", "true");
    // Sólo las pantallas con decisión están en el carrete; el resto espera lejos.
    expect(figures().map((figure) => figure.hasAttribute("data-far"))).toEqual(
      omsta.screens.map((_, i) => !reelScreens.includes(i)),
    );
    expect(noteText("omsta")).toBe(decisionNote(omsta, 0));

    act(() => frames("omsta")[reelScreens[0]].focus());
    fireEvent.keyDown(frames("omsta")[reelScreens[0]], { key: "ArrowRight" });
    expect(frontIndex()).toBe(reelScreens[1]);
    await waitFor(() => expect(frames("omsta")[reelScreens[1]]).toHaveFocus());
    expect(frames("omsta")[reelScreens[1]]).toHaveAttribute("aria-current", "true");
    expect(frames("omsta")[reelScreens[0]]).not.toHaveAttribute("aria-current");
    expect(frames("omsta")[reelScreens[1]].tabIndex).toBe(0);
    expect(frames("omsta")[reelScreens[0]].tabIndex).toBe(-1);
    expect(noteText("omsta")).toBe(decisionNote(omsta, 1));
    // El foco ya lleva la decisión (aria-describedby): el anuncio no la repite.
    expect(live()).toHaveTextContent(`OMSTA · Diseño · decisión 2 de ${omsta.reel.length}`);
    expect(live()).not.toHaveTextContent(omsta.reel[1].note);

    fireEvent.keyDown(frames("omsta")[reelScreens[1]], { key: "ArrowLeft" });
    fireEvent.keyDown(frames("omsta")[reelScreens[0]], { key: "ArrowLeft" });
    const last = omsta.reel.length - 1;
    expect(frontIndex()).toBe(reelScreens[last]);
    await waitFor(() => expect(frames("omsta")[reelScreens[last]]).toHaveFocus());
    expect(noteText("omsta")).toBe(decisionNote(omsta, last));
  });

  /*
    Garantiza los otros dos caminos del carrete: pulsar una pantalla la trae
    delante y los botones de la nota avanzan y retroceden dando la vuelta. Cada
    pantalla con decisión se describe por su problema y su decisión; la que no
    la tiene, por su pie (figcaption). Evita un carrete sin mando visible y
    pantallas mudas para el lector de pantalla.
  */
  it("Diseño: pulsar una pantalla la trae delante, la nota avanza y retrocede, y cada pantalla se describe", () => {
    const omsta = table()[0];
    renderTable(table());
    fireEvent.click(tab(/Diseño/));
    fireEvent.click(frames("omsta")[omsta.reel[2].screen]);
    expect(frames("omsta")[omsta.reel[2].screen]).toHaveAttribute("aria-current", "true");
    expect(noteText("omsta")).toBe(decisionNote(omsta, 2));

    const note = within(section("omsta").querySelector(".holo-note") as HTMLElement);
    fireEvent.click(note.getByRole("button", { name: "Decisión siguiente" }));
    expect(noteText("omsta")).toBe(decisionNote(omsta, 3));
    // De la cuarta a la primera, y una más da la vuelta hasta la cuarta.
    for (let step = 0; step < 3; step++) fireEvent.click(note.getByRole("button", { name: "Decisión anterior" }));
    expect(noteText("omsta")).toBe(decisionNote(omsta, 0));
    fireEvent.click(note.getByRole("button", { name: "Decisión anterior" }));
    expect(noteText("omsta")).toBe(decisionNote(omsta, 3));
    expect(frames("omsta")[omsta.reel[3].screen]).toHaveAttribute("aria-current", "true");

    for (const [index, frame] of frames("omsta").entries()) {
      const description = document.getElementById(frame.getAttribute("aria-describedby") as string);
      const step = omsta.reel.find((entry) => entry.screen === index);
      expect(description).toHaveClass("visually-hidden");
      if (step) {
        expect(description).toHaveTextContent(`Problema: ${step.problem} Decisión: ${step.note}`);
      } else {
        expect(description?.tagName).toBe("FIGCAPTION");
        expect(description).toHaveTextContent(omsta.screens[index].caption);
      }
      // La lámina lleva el nombre y la imagen calla: no se lee dos veces.
      expect(frame).toHaveAttribute("aria-label", omsta.screens[index].alt);
      const image = frame.parentElement?.querySelector("img");
      expect(image).toHaveAttribute("alt", omsta.screens[index].alt);
      expect(image).toHaveAttribute("aria-hidden", "true");
    }
  });

  /*
    Garantiza que sin decisiones declaradas el carrete vuelve a los pies de
    foto: recorre todas las pantallas, la nota sólo dice el pie (sin rótulos
    de problema ni decisión) y los mandos hablan de pantallas. Evita una nota
    con «Problema» vacío.
  */
  it("Diseño sin decisiones: todas las pantallas con su pie, sin rótulos de problema ni decisión", () => {
    const wiki = withoutDecisions("wikiverse");
    renderTable([wiki]);
    fireEvent.click(tab(/Diseño/));
    const note = section("wikiverse").querySelector(".holo-note") as HTMLElement;
    expect(note).toHaveAttribute("data-kind", "captions");
    expect(noteText("wikiverse")).toBe(`01 / ${pad(wiki.screens.length)}${wiki.screens[0].caption}`);
    expect(note.querySelector(".holo-note__label")).toBeNull();
    fireEvent.click(within(note).getByRole("button", { name: "Pantalla siguiente" }));
    expect(noteText("wikiverse")).toBe(`02 / ${pad(wiki.screens.length)}${wiki.screens[1].caption}`);
    expect(live()).toHaveTextContent(`Wiki Universe · Diseño · pantalla 2 de ${wiki.screens.length}: ${wiki.screens[1].caption}`);
    expect(section("wikiverse").querySelectorAll("figure.holo-screen[data-far]")).toHaveLength(Math.max(0, wiki.screens.length - 5));
  });

  it("fuera de Diseño el alt de cada pantalla sigue en el árbol: la imagen no vive dentro de lo inerte", () => {
    renderTable(table());
    // Producto, la capa de entrada (y la única sin JavaScript): láminas inertes…
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
    quién recibe y a quién entrega; se enciende su RUTA entera —las líneas por
    las que pasa y los módulos aguas arriba y abajo— (§17). Evita un inspector
    que entra en blanco o un foco que no dice por dónde pasa el dato.
  */
  it("el inspector abre en el primer módulo con decisión y enciende su ruta", () => {
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

    const path = nodePath(omsta.architecture.edges, focus.id);
    const on = [...section("omsta").querySelectorAll("path.holo-line[data-on]")];
    expect(on.map((line) => line.getAttribute("d"))).toEqual(
      omsta.architecture.edges.filter((edge) => path.edges.has(`${edge.from}>${edge.to}`)).map((edge) => edge.d),
    );
    const marked = (value: string) =>
      [...section("omsta").querySelectorAll(`.holo-node[data-path="${value}"]`)].map((node) => node.getAttribute("data-node-id")).sort();
    expect(marked("up")).toEqual([...path.upstream].sort());
    expect(marked("down")).toEqual([...path.downstream].sort());
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
    expect(nodeButton("omsta", "pagos")).toHaveAttribute("aria-current", "true");

    const pagos = order.indexOf("pagos");
    act(() => nodeButton("omsta", "pagos").focus());
    fireEvent.keyDown(nodeButton("omsta", "pagos"), { key: "ArrowDown" });
    const next = omsta.architecture.nodes[pagos + 1];
    expect(buttons()[pagos + 1]).toHaveFocus();
    expect(heading()).toHaveTextContent(next.label);
    expect(buttons()[pagos + 1]).toHaveAttribute("aria-current", "true");
    expect(nodeButton("omsta", "pagos")).not.toHaveAttribute("aria-current");
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
    expect(nodeButton("omsta", "pagos")).toHaveAttribute("aria-current", "true");
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
    expect(nodeButton("omsta", target.id)).toHaveAttribute("aria-current", "true");
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
    expect(nodeButton("omsta", "redis")).toHaveAttribute("aria-current", "true");
  });
});

describe("EngineeringTable · fichas incompletas (P3)", () => {
  /*
    Garantiza que una ficha sin galería, sin enlaces, sin alcance, sin
    decisiones y sin arquitectura se pinta entera: nombre, qué es, salida al
    caso, una pantalla, un Diseño con su pie, y un sistema derivado del stack
    sin líneas ni decisiones pegadas, cuyo inspector lee la decisión de la
    ficha. Evita un componente roto por un dato ausente (A18).
  */
  it("sin galería, sin enlaces, sin alcance y sin arquitectura se pinta con dignidad", () => {
    renderTable([bare()]);
    expect(screen.getByRole("heading", { level: 2, name: "Mínima" })).toBeInTheDocument();
    expect(section("network").querySelector(".table-read__descriptor")).toHaveTextContent("Ficha");
    expect(screen.getByRole("link", { name: /Explorar proyecto/ })).toHaveAttribute("href", "/es/proyectos/minima");
    expect(screen.queryByRole("link", { name: /Visitar/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Ver código/ })).toBeNull();
    // Sin alcance declarado, no se pinta un alcance vacío.
    expect(section("network").querySelector(".holo-scope")).toBeNull();
    // Una sola pantalla, la destacada, con su alt entero.
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByAltText("Portada mínima").closest("figure")).toHaveAttribute("data-slot", "main");

    // Diseño con una sola pantalla: el carrete no tiene a dónde ir y no se rompe.
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
    // El anillo también: dos segmentos, sin ruta que encender.
    expect(document.querySelectorAll(".console__seg")).toHaveLength(2);
    expect(document.querySelectorAll('.console__seg[data-state="path"]')).toHaveLength(0);
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
    expect(silent.counts.decisions).toBe(0);
  });

  /*
    Garantiza que «Visitar el sitio» aparece en cuanto el MDX trae `kind:
    demo`, se abre aparte y sin `opener`; que «Ver código» hace lo mismo con
    el repositorio (con su marca, sin que el icono se lea); y que un enlace de
    contacto no se pinta. Evita un botón ámbar que no abre nada o que expone
    la ventana de origen.
  */
  it("«Visitar el sitio» y «Ver código» salen de los enlaces del MDX y se abren aparte", () => {
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
    const code = screen.getByRole("link", { name: "Ver código" });
    expect(code).toHaveAttribute("href", "https://github.test/minima");
    expect(code.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    for (const external of [site, code]) {
      expect(external).toHaveAttribute("target", "_blank");
      expect(external).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
    expect(screen.queryByRole("link", { name: /Hablemos/ })).toBeNull();
  });
});
