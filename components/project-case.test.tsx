import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/projects";
import { getF1AProjects, getProject } from "@/lib/projects";
import { ProjectCase } from "./project-case";

/**
 * El caso completo (`/es/proyectos/[slug]`, endurance-proyectos.md §17).
 *
 * Lo que se comprueba es lo que el HTML servido tiene que decir sin
 * JavaScript: nombre, qué es, estado, alcance, decisiones, sistema,
 * resultados, cuerpo y las salidas a la mesa y al contacto. Todo sale del
 * MDX: los tests leen los valores de la propia ficha, no los copian.
 */

const projects = getF1AProjects("es");

function renderCase(project: Project) {
  return render(
    <ProjectCase contactHref="/es/contacto" project={project} projects={projects} projectsHref="/es/proyectos" />,
  );
}

beforeAll(() => {
  // jsdom no trae el diálogo modal: el visor sólo necesita abrir y cerrar.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

describe("ProjectCase — primer pantallazo", () => {
  it("nombra el proyecto con el título entero y lo pinta cortado en la raya", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveAccessibleName(omsta.prose.title);
    expect(title.querySelector(".case-title__name")).toHaveTextContent(/^OMSTA$/);
    expect(title.querySelector(".case-title__descriptor")).toHaveTextContent("ERP y app móvil para una agencia de viajes");
    expect(screen.getByText(omsta.prose.summary)).toBeInTheDocument();
    // El nombre dice su longitud a la hoja de estilo: el cuerpo se adapta.
    expect((document.querySelector(".case") as HTMLElement).style.getPropertyValue("--len")).toBe("5");
  });

  it("sin raya en el título, el descriptor es la antetitular de la ficha", () => {
    const izak = getProject("izaks-photos", "es");
    renderCase(izak);

    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(izak.prose.title);
    expect(document.querySelector("p.case-title__descriptor")).toHaveTextContent(izak.prose.eyebrow);
  });

  it("dice qué pieza es de cuántas y si es caso de estudio o ficha", () => {
    const { unmount } = renderCase(getProject("omsta", "es"));
    expect(screen.getByText(`01 / ${String(projects.length).padStart(2, "0")}`)).toBeInTheDocument();
    expect(screen.getByText("Caso de estudio")).toBeInTheDocument();
    unmount();

    renderCase(getProject("wikiverse", "es"));
    expect(screen.getByText("Ficha")).toBeInTheDocument();
  });

  it("vuelve a la mesa con el proyecto elegido y ofrece código sólo si hay repositorio", () => {
    const { unmount } = renderCase(getProject("omsta", "es"));
    expect(screen.getByRole("link", { name: /Proyectos/ })).toHaveAttribute("href", "/es/proyectos#omsta");
    // OMSTA es de un cliente: ni repositorio ni demo publicados. La salida
    // del primer pantallazo son entonces sus decisiones.
    expect(screen.queryByRole("link", { name: /Ver código/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Visitar el sitio/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver las decisiones/ })).toHaveAttribute("href", "#decisiones");
    expect(screen.getByRole("link", { name: /Ver el sistema/ })).toHaveAttribute("href", "#sistema");
    unmount();

    const wiki = getProject("wikiverse", "es");
    renderCase(wiki);
    const repository = wiki.prose.links?.find((link) => link.kind === "repository");
    expect(screen.getByRole("link", { name: /Ver código/ })).toHaveAttribute("href", repository?.href);
  });

  it("la ficha rápida dice papel, stack y el estado entero con su LED", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const facts = document.querySelector(".case-facts") as HTMLElement;
    expect(within(facts).getByText(omsta.prose.role)).toBeInTheDocument();
    expect(within(facts).getByText(omsta.prose.technologies.join(" · "))).toBeInTheDocument();
    expect(within(facts).getByText(omsta.prose.statusLabel)).toBeInTheDocument();
    expect(facts.querySelector(".case-led")).toHaveAttribute("data-state", omsta.status);
  });

  it("la destacada es la imagen prioritaria y el teléfono la acompaña si existe", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const stage = document.querySelector(".case-hero__stage") as HTMLElement;
    const [featured, phone] = within(stage).getAllByRole("img");
    expect(featured).toHaveAccessibleName(omsta.prose.featuredImage.alt);
    expect(featured).toHaveAttribute("fetchpriority", "high");
    expect(featured).not.toHaveAttribute("loading", "lazy");
    expect(phone.closest(".case-frame")).toHaveAttribute("data-frame", "mobile");
  });
});

describe("ProjectCase — el caso", () => {
  it("afirma el alcance del MDX, nada más", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const scope = screen.getByRole("region", { name: "Alcance" });
    for (const entry of omsta.prose.scope ?? []) {
      expect(within(scope).getByText(entry.value)).toBeInTheDocument();
      expect(within(scope).getByText(entry.label)).toBeInTheDocument();
    }
    // Cifras cortas: la fila no lleva palabras y su cuerpo puede ser grande.
    const list = within(scope).getByRole("list");
    expect(list).not.toHaveAttribute("data-words");
    const longest = Math.max(...(omsta.prose.scope ?? []).map((entry) => entry.value.length));
    expect(list.style.getPropertyValue("--vlen")).toBe(String(longest));
  });

  it("una fila de alcance con palabras lo dice a la hoja de estilo", () => {
    const wiki = getProject("wikiverse", "es");
    renderCase(wiki);

    const list = within(screen.getByRole("region", { name: "Alcance" })).getByRole("list");
    const longest = Math.max(...(wiki.prose.scope ?? []).map((entry) => entry.value.length));
    expect(list).toHaveAttribute("data-words", "true");
    expect(list.style.getPropertyValue("--vlen")).toBe(String(longest));
  });

  it("cuenta el reto: problema, lo que construyó y la decisión técnica", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const brief = screen.getByRole("region", { name: "El reto" });
    expect(within(brief).getByText(omsta.prose.problem)).toBeInTheDocument();
    expect(within(brief).getByText(omsta.prose.contribution)).toBeInTheDocument();
    expect(within(brief).getByText(omsta.prose.decision)).toBeInTheDocument();
  });

  it("recorre las decisiones de diseño en su orden, problema → decisión", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const section = screen.getByRole("region", { name: "Decisiones de diseño" });
    const items = within(section).getAllByRole("listitem");
    const decisions = omsta.prose.designDecisions ?? [];
    expect(items).toHaveLength(decisions.length);
    decisions.forEach((decision, index) => {
      expect(within(items[index]).getByText(decision.problem)).toBeInTheDocument();
      expect(within(items[index]).getByText(decision.decision)).toBeInTheDocument();
      // La pantalla que resuelve la decisión, en su marco.
      const image = within(items[index]).getByRole("img");
      expect(image.getAttribute("src")).toContain(decision.screen.replace(/\.png$/, ""));
    });
  });

  it("sin decisiones declaradas, recorre las capturas con su pie", () => {
    const source = getProject("wikiverse", "es");
    const project: Project = { ...source, prose: { ...source.prose, designDecisions: undefined } };
    renderCase(project);

    const section = screen.getByRole("region", { name: "El producto, pantalla a pantalla" });
    expect(within(section).getByText(source.prose.featuredImage.caption)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Decisiones de diseño" })).not.toBeInTheDocument();
    // El recorrido ya enseña todas las capturas: no hay rejilla que las repita.
    expect(screen.queryByRole("region", { name: "Más pantallas" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver el producto/ })).toHaveAttribute("href", "#decisiones");
  });

  it("el sistema es operable y sale servido con su módulo de entrada", () => {
    renderCase(getProject("omsta", "es"));

    const system = screen.getByRole("region", { name: "Sistema" });
    expect(within(system).getByRole("group", { name: "Sistema de OMSTA" })).toBeInTheDocument();
    expect(within(system).getByRole("region", { name: "Inspector del módulo" })).toBeInTheDocument();
    expect(within(system).getByText("Elige un módulo: se enciende su ruta.")).toBeInTheDocument();
    // En el teléfono el esquema no dibuja líneas: la guía dice lo que pasa allí.
    expect(within(system).getByText("Elige un módulo: debajo, su decisión.")).toBeInTheDocument();
  });

  it("lista los resultados verificables del MDX", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const results = screen.getByRole("region", { name: "Resultados verificables" });
    for (const highlight of omsta.prose.highlights) {
      expect(within(results).getByText(highlight)).toBeInTheDocument();
    }
  });

  it("sin módulos, cada pantalla se enseña una vez y todas abren su captura", () => {
    const delicate = getProject("delicate", "es");
    renderCase(delicate);

    const total = 1 + (delicate.prose.gallery?.length ?? 0);
    const shots = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-case-shot]"));
    // Sin JavaScript, cada aparato abre su captura (el peldaño WebP), y entre
    // el primer pantallazo, las decisiones y la rejilla están todas.
    shots.forEach((shot) => expect(shot).toHaveAttribute("href", expect.stringMatching(/\.webp$/)));
    expect(new Set(shots.map((shot) => shot.dataset.caseShot)).size).toBe(total);

    // La rejilla sólo lleva las que no salieron antes, con su pie a la vista.
    const shown = new Set([
      delicate.prose.featuredImage.src,
      ...(delicate.prose.gallery ?? []).filter((image) => image.frame === "mobile").slice(0, 1).map((image) => image.src),
      ...(delicate.prose.designDecisions ?? []).map((decision) => decision.screen),
    ]);
    const rest = (delicate.prose.gallery ?? []).filter((image) => !shown.has(image.src));
    expect(rest.length).toBeGreaterThan(0);
    const more = screen.getByRole("region", { name: "Más pantallas" });
    expect(within(more).getAllByRole("link")).toHaveLength(rest.length);
    rest.forEach((image) => expect(within(more).getByText(image.caption)).toBeInTheDocument());
  });

  it("con módulos, las pantallas se recorren por módulo, cada módulo entero y con su índice", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);
    const images = [omsta.prose.featuredImage, ...(omsta.prose.gallery ?? [])];
    const modules = [...new Set(images.map((image) => image.module))];

    const tour = screen.getByRole("region", { name: "Recorrido por módulos" });
    expect(screen.queryByRole("region", { name: "Más pantallas" })).not.toBeInTheDocument();
    expect(within(tour).getByText(`${images.length} pantallas en ${modules.length} módulos.`)).toBeInTheDocument();
    // El índice lleva a cada módulo, en el orden de la ficha.
    const index = within(tour).getByRole("navigation", { name: "Módulos" });
    const entries = within(index).getAllByRole("link");
    expect(entries).toHaveLength(modules.length);
    modules.forEach((module, position) => {
      const images_ = images.filter((image) => image.module === module);
      // El número del módulo es decorado: el nombre accesible empieza por el módulo.
      const region = within(tour).getByRole("region", { name: new RegExp(`^${module}`) });
      expect(entries[position]).toHaveAttribute("href", `#${region.id}`);
      // Cada módulo entero: también las que ya salieron arriba.
      expect(within(region).getAllByRole("link")).toHaveLength(images_.length);
      images_.forEach((image) => expect(within(region).getByRole("img", { name: image.alt })).toBeInTheDocument());
    });
  });

  it("las tecnologías del proyecto, por áreas y con su versión aparte", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);
    const stack = omsta.prose.stack ?? [];
    const section = screen.getByRole("region", { name: "Tecnologías" });
    const total = stack.reduce((sum, group) => sum + group.items.length, 0);
    expect(within(section).getByText(new RegExp(`^${total} herramientas en ${stack.length} áreas`))).toBeInTheDocument();
    for (const group of stack) {
      const area = within(section).getByRole("region", { name: new RegExp(`^${group.group}`) });
      expect(within(area).getAllByRole("listitem")).toHaveLength(group.items.length);
    }
    // «Django 5.2»: el nombre y, aparte, la versión.
    const django = within(section).getByText("Django");
    expect(django.nextElementSibling).toHaveTextContent("5.2");
    expect(document.querySelector('.case-localnav a[href="#tecnologias"]')).not.toBeNull();
  });

  it("el visor recorre todas las pantallas y devuelve el foco", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);
    const captions = [omsta.prose.featuredImage.caption, ...(omsta.prose.gallery ?? []).map((image) => image.caption)];
    const viewer = document.querySelector("dialog.case-viewer") as HTMLDialogElement;

    // Desde el recorrido: la flecha avanza y, al cerrar, el foco cae en la
    // miniatura de la pantalla que se estaba mirando.
    const tour = screen.getByRole("region", { name: "Recorrido por módulos" });
    const grid = within(tour.querySelector(".case-tour__stop") as HTMLElement).getAllByRole("link");
    const first = Number(grid[0].dataset.caseShot);
    fireEvent.click(grid[0]);
    expect(viewer).toHaveAttribute("open");
    expect(within(viewer).getByText(captions[first])).toBeInTheDocument();
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    expect(within(viewer).getByText(captions[first + 1])).toBeInTheDocument();
    // Mientras baja la grande se pinta una que ya existe: nunca un marco vacío.
    expect(within(viewer).getByRole("img").style.backgroundImage).toMatch(/\.webp/);
    fireEvent.click(within(viewer).getByRole("button", { name: /Cerrar/ }));
    expect(viewer).not.toHaveAttribute("open");
    expect(grid[1]).toHaveFocus();

    // Desde una decisión: el visor abre en su pantalla y el foco vuelve a ella.
    const decisions = screen.getByRole("region", { name: "Decisiones de diseño" });
    const opener = within(decisions).getAllByRole("link")[0];
    fireEvent.click(opener);
    expect(within(viewer).getByText(captions[Number(opener.dataset.caseShot)])).toBeInTheDocument();
    fireEvent.keyDown(viewer, { key: "ArrowLeft" });
    fireEvent.click(within(viewer).getByRole("button", { name: /Cerrar/ }));
    expect(opener).toHaveFocus();
  });

  it("sirve el cuerpo entero con un índice de anclas estables", () => {
    const omsta = getProject("omsta", "es");
    renderCase(omsta);

    const longread = screen.getByRole("region", { name: "El caso completo" });
    const chapter = within(longread).getByRole("heading", { level: 3, name: /Contexto/ });
    expect(chapter).toHaveAttribute("id", "contexto");
    const index = within(longread).getByRole("navigation", { name: "Índice del caso" });
    expect(within(index).getByRole("link", { name: /Contexto/ })).toHaveAttribute("href", "#contexto");
    expect(within(index).getAllByRole("link")).toHaveLength(15);
    expect(within(longread).getByText(/min de lectura/)).toBeInTheDocument();
  });

  it("dos apartados con el mismo título reciben cada uno su ancla", () => {
    // Un cuerpo compilado mínimo, con la forma de los de Velite: sus `h2`
    // pasan por los componentes que recibe.
    const body = `const{Fragment:e,jsx:a,jsxs:n}=arguments[0];return{default:function(p){const c={h2:"h2",...(p&&p.components)};return n(e,{children:[a(c.h2,{children:"Notas"}),a("p",{children:"uno"}),a(c.h2,{children:"Notas"}),a("p",{children:"dos"})]})}};`;
    const source = getProject("network", "es");
    renderCase({ ...source, prose: { ...source.prose, body } });

    const longread = screen.getByRole("region", { name: "El caso completo" });
    const chapters = within(longread).getAllByRole("heading", { level: 3, name: /Notas/ });
    expect(chapters.map((chapter) => chapter.id)).toEqual(["notas", "notas-2"]);
    const links = within(within(longread).getByRole("navigation", { name: "Índice del caso" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["#notas", "#notas-2"]);
  });

  it("cierra con los vecinos de la mesa y el contacto", () => {
    renderCase(getProject("omsta", "es"));

    const neighbours = screen.getByRole("navigation", { name: "Otros proyectos" });
    const [previous, next] = within(neighbours).getAllByRole("link");
    // OMSTA abre la mesa: su anterior es el último (el recorrido da la vuelta).
    expect(previous).toHaveAttribute("href", `/es/proyectos/${projects[projects.length - 1].prose.slug}`);
    expect(next).toHaveAttribute("href", `/es/proyectos/${projects[1].prose.slug}`);

    expect(screen.getByRole("heading", { level: 2, name: "¿Tienes un sistema difícil de ordenar?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Trabajemos juntos/ })).toHaveAttribute("href", "/es/contacto");
  });

  it("mantiene un estado digno cuando la galería opcional no existe", () => {
    const source = getProject("network", "es");
    const project: Project = { ...source, prose: { ...source.prose, gallery: undefined } };
    renderCase(project);

    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(project.prose.title);
    // Una sola captura, ya enseñada arriba: no hay rejilla ni entrada en la barra.
    expect(screen.queryByRole("region", { name: "Más pantallas" })).not.toBeInTheDocument();
    expect(document.querySelector('.case-localnav a[href="#pantallas"]')).toBeNull();
    const shots = Array.from(document.querySelectorAll<HTMLElement>("a[data-case-shot]"));
    expect(new Set(shots.map((shot) => shot.dataset.caseShot))).toEqual(new Set(["0"]));
    // Sin teléfono no hay composición de dos aparatos.
    expect(document.querySelector(".case-hero__stage")).not.toHaveAttribute("data-phone");
  });
});
