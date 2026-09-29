import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { skipWithoutWebGL2 } from "./capability-fixtures";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { F1A_PROJECT_IDS, projectsData } from "../content/projects.data";

/**
 * EL CASO COMPLETO — `/es/proyectos/[slug]` (docs/design/endurance-proyectos.md §17.4).
 *
 * C1 sin JavaScript se lee entero —nombre, alcance, reto, cada decisión de
 *    diseño (problema y decisión), sistema, resultados y el cuerpo con su
 *    índice— y ningún enlace interno está muerto. En un caso sin demo ni
 *    repositorio (OMSTA) y en uno con los dos (Wikiverse).
 * C2 la escena persistente duerme en el caso: el mismo canvas, cubierto, sin
 *    dibujar; y vuelve a dibujar al salir al mapa.
 * C3 el visor de pantallas (`<dialog>`) abre desde cualquier pantalla,
 *    recorre todas con ← →, cierra con Escape y devuelve el foco.
 * C4 «← Proyectos» vuelve a la mesa, arriba, con ese proyecto elegido.
 * C5 sin desbordamiento horizontal a 375 y 1440 en los cinco casos.
 * C6 con el movimiento apagado nada queda oculto ni en marcha.
 * C7 el sistema del caso se opera: enfocar un módulo lo lleva al inspector
 *    y enciende su ruta.
 *
 * Lo esperado sale del MDX compilado por Velite (`.velite/`, que `npm run
 * build` regenera) y de la identidad estructural de los proyectos: si Jonás
 * corrige una decisión o un alcance, el test mide lo mismo.
 */

interface MdxImage {
  src: string;
  alt: string;
  caption: string;
  frame?: "desktop" | "mobile";
  module?: string;
}

interface MdxProject {
  id: string;
  locale: string;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  role: string;
  statusLabel: string;
  problem: string;
  contribution: string;
  decision: string;
  technologies: string[];
  highlights: string[];
  links?: { label: string; href: string; kind: string }[];
  body: string;
  featuredImage: MdxImage;
  gallery?: MdxImage[];
  scope?: { value: string; label: string }[];
  designDecisions?: { screen: string; problem: string; decision: string }[];
  architecture?: {
    nodes: { id: string; label: string; lane: string; decision?: string }[];
    edges: [string, string][];
  };
}

const mdxCatalog: MdxProject[] = JSON.parse(readFileSync(join(__dirname, "..", ".velite", "projectProse.json"), "utf8"));
function mdx(id: string) {
  const entry = mdxCatalog.find((project) => project.id === id && project.locale === "es");
  if (!entry?.architecture) throw new Error(`El MDX de "${id}" no declara architecture: ¿falta npm run content?`);
  return { ...entry, architecture: entry.architecture };
}
/** Las pantallas en el orden del caso y del visor: la destacada y la galería. */
const screensOf = (project: MdxProject) => [project.featuredImage, ...(project.gallery ?? [])];
const nameOf = (project: MdxProject) => project.title.split(/\s+—\s+/)[0].trim();
const descriptorOf = (project: MdxProject) => (project.title.split(/\s+—\s+/)[1] ?? project.eyebrow).trim();
const pad = (value: number) => String(value).padStart(2, "0");
const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const caseHref = (id: string) => `/es/proyectos/${mdx(id).slug}`;

/**
 * Los apartados y el primer párrafo del cuerpo, leídos del MISMO árbol que
 * pinta la página: el cuerpo llega compilado (una función de MDX), así que
 * se ejecuta con el runtime de React y se recorre. Sin un segundo parser.
 */
function bodyOutline(code: string) {
  const Body = new Function(code)({ ...runtime }).default as (props: object) => ReactNode;
  const text = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(text).join("");
    return isValidElement<{ children?: ReactNode }>(node) ? text(node.props.children) : "";
  };
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const visit = (node: ReactNode) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isValidElement<{ children?: ReactNode }>(node)) return;
    // El caso pinta cada apartado sin el numeral con el que lo abre el MDX.
    if (node.type === "h2") headings.push(squash(text(node.props.children)).replace(/^\d+[.)]\s+/, ""));
    if (node.type === "p") paragraphs.push(squash(text(node.props.children)));
    visit(node.props.children);
  };
  visit(Body({}));
  return { headings, paragraphs };
}

/** La ruta de un módulo, desde la definición (§17), como en `proyectos.spec.ts`. */
function route(edges: readonly [string, string][], id: string) {
  const reach = (forward: boolean) => {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const [from, to] of edges) {
        const [near, far] = forward ? [from, to] : [to, from];
        if (near === current && far !== id && !seen.has(far)) {
          seen.add(far);
          queue.push(far);
        }
      }
    }
    return seen;
  };
  const upstream = reach(false);
  const downstream = reach(true);
  const lines = edges.map(([from, to]) => {
    if ((from === id || downstream.has(from)) && downstream.has(to)) return "down";
    if (upstream.has(from) && (to === id || upstream.has(to))) return "up";
    return null;
  });
  return { upstream, downstream, lines };
}

/**
 * Las pantallas del final del caso. Con módulos declarados es el RECORRIDO:
 * todas, por módulo, cada módulo donde aparece por primera vez (§18). Sin
 * ellos, las que no salieron ya arriba —la destacada, el teléfono del primer
 * pantallazo y las de las decisiones—: «Más pantallas» lleva el resto.
 */
function moreScreens(project: MdxProject) {
  const screens = screensOf(project);
  if (screens.some((image) => image.module)) {
    const modules = [...new Set(screens.map((image) => image.module))];
    return modules.flatMap((module) => screens.flatMap((image, index) => (image.module === module ? [index] : [])));
  }
  const phone = screens.findIndex((image) => image.frame === "mobile");
  const decided = (project.designDecisions ?? []).map((entry) => screens.findIndex((image) => image.src === entry.screen));
  const shown = new Set([0, phone, ...decided]);
  return screens.map((_, index) => index).filter((index) => !shown.has(index));
}

/**
 * Abre el caso ya desplazado a una sección y espera a que esté vivo: la barra
 * local aparece cuando han corrido sus efectos, y con ellos los del visor, que
 * se montan en el mismo pintado. Antes de eso, pulsar una pantalla abriría el
 * archivo en vez del visor.
 */
async function openCase(page: Page, id: string, section: string) {
  await page.goto(`${caseHref(id)}#${section}`);
  // Hidratar con la suite entera en paralelo (y SwiftShader) pasa de 5 s.
  await expect(page.locator(".case-localnav")).toHaveAttribute("data-shown", "true", { timeout: 20_000 });
}

async function systemDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { systemDraws: number };
    const before = state.systemDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.systemDraws - before;
  });
}

for (const id of ["omsta", "wikiverse"]) {
  test(`C1 · sin JavaScript el caso se lee entero y sus enlaces viven: ${id}`, async ({ browser, baseURL, request }) => {
    // Muchas rutas servidas: con la suite entera en paralelo el servidor de
    // pruebas va cargado y los 30 s por defecto no bastan.
    test.setTimeout(90_000);
    const project = mdx(id);
    const identity = projectsData[id as keyof typeof projectsData];
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(caseHref(id));

    // Primer pantallazo: el nombre (el `h1` lleva el título entero como
    // nombre accesible), qué es, dónde está en la mesa y el resumen.
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(project.title);
    await expect(page.locator(".case-hero .case-title__name")).toHaveText(nameOf(project));
    await expect(page.locator(".case-hero .case-title__descriptor")).toHaveText(descriptorOf(project));
    await expect(page.locator(".case-hero__index")).toHaveText(
      `${pad(identity.order)} / ${pad(F1A_PROJECT_IDS.length)} · ${identity.kind === "case-study" ? "Caso de estudio" : "Ficha"}`,
    );
    await expect(page.locator(".case-hero__summary")).toHaveText(squash(project.summary));
    await expect(page.locator(".case-facts dd")).toHaveText([project.role, project.technologies.join(" · "), project.statusLabel]);
    // Sin demo, la salida clara son las decisiones; el código, si hay repositorio.
    const repository = project.links?.find((link) => link.kind === "repository");
    const demo = project.links?.find((link) => link.kind === "demo");
    if (!demo) await expect(page.locator('.case-hero__actions a[href="#decisiones"]')).toHaveText(/Ver las decisiones/);
    if (repository) await expect(page.locator(".case-hero__actions a.case-code")).toHaveAttribute("href", repository.href);
    else await expect(page.locator(".case-hero__actions a.case-code")).toHaveCount(0);

    // Alcance y reto.
    const scope = project.scope ?? [];
    expect(scope).toHaveLength(3);
    await expect(page.locator(".case-scope .case-scope__value")).toHaveText(scope.map((entry) => entry.value));
    await expect(page.locator(".case-scope .case-scope__label")).toHaveText(scope.map((entry) => entry.label));
    await expect(page.locator(".case-brief__statement")).toHaveText(squash(project.problem));
    await expect(page.locator(".case-brief__answer dd")).toHaveText([squash(project.contribution), squash(project.decision)]);

    // Cada decisión de diseño, en su orden: su pantalla, su problema y su decisión.
    const decisions = project.designDecisions ?? [];
    expect(decisions.length).toBeGreaterThanOrEqual(3);
    const screens = screensOf(project);
    const items = page.locator("#decisiones .case-decision");
    await expect(items).toHaveCount(decisions.length);
    await expect(items.locator(".case-decision__problem dd")).toHaveText(decisions.map((entry) => entry.problem));
    await expect(items.locator(".case-decision__choice dd")).toHaveText(decisions.map((entry) => entry.decision));
    expect(await items.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("alt")))).toEqual(
      decisions.map((entry) => screens.find((image) => image.src === entry.screen)?.alt),
    );

    // El sistema: todos los módulos y todas sus decisiones están en el HTML.
    const { nodes } = project.architecture;
    await expect(page.locator("#sistema .holo-node")).toHaveCount(nodes.length);
    expect((await page.locator("#sistema .holo-node__decision").allTextContents()).map(squash).sort()).toEqual(
      nodes.flatMap((node) => (node.decision ? [squash(node.decision)] : [])).sort(),
    );

    // Resultados verificables.
    await expect(page.locator("#resultados .case-results__list li")).toHaveText(project.highlights);

    // Al final, el recorrido por módulos (todas) o «Más pantallas» (sólo las
    // que no salieron arriba), con su pie; si no queda ninguna, no existe.
    const more = moreScreens(project);
    if (more.length > 0) {
      expect(await page.locator("#pantallas a[data-case-shot]").evaluateAll((links) => links.map((link) => Number(link.getAttribute("data-case-shot"))))).toEqual(more);
      await expect(page.locator("#pantallas .case-shot__caption")).toHaveText(more.map((index) => screens[index].caption));
    } else {
      await expect(page.locator("#pantallas")).toHaveCount(0);
    }

    // El cuerpo: cada apartado del MDX, su índice lateral y el texto.
    const outline = bodyOutline(project.body);
    expect(outline.headings.length).toBeGreaterThan(0);
    const chapters = await page.locator("#caso-cuerpo h3.case-chapter").evaluateAll((headings) => headings.map((heading) =>
      [...heading.childNodes].filter((child) => !(child instanceof Element && child.getAttribute("aria-hidden"))).map((child) => child.textContent).join("").trim()));
    expect(chapters).toEqual(outline.headings);
    await expect(page.getByRole("navigation", { name: "Índice del caso" }).getByRole("link")).toHaveCount(outline.headings.length);
    await expect(page.locator("#caso-cuerpo")).toContainText(outline.paragraphs[0]);

    // Cierre: el anterior y el siguiente en el orden de la mesa, y el contacto.
    const at = (offset: number) => F1A_PROJECT_IDS[(F1A_PROJECT_IDS.indexOf(id as (typeof F1A_PROJECT_IDS)[number]) + offset + F1A_PROJECT_IDS.length) % F1A_PROJECT_IDS.length];
    expect(await page.getByRole("navigation", { name: "Otros proyectos" }).getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([caseHref(at(-1)), caseHref(at(1))]);
    await expect(page.getByRole("link", { name: /Trabajemos juntos/ })).toHaveAttribute("href", "/es/contacto");
    // Sin guion la barra local no aparece: el HTML ya se lee de arriba abajo.
    await expect(page.locator(".case-localnav")).toBeHidden();

    // Cada ancla de la página lleva a algo que existe…
    const anchors = await page.locator(".case a[href^='#']").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(anchors.length).toBeGreaterThan(0);
    const missing = await page.evaluate((hrefs) => hrefs.filter((href) => !document.getElementById(decodeURIComponent(href.slice(1)))), [...new Set(anchors)]);
    expect(missing).toEqual([]);
    // …y ningún enlace interno está muerto: la mesa, los vecinos, el contacto
    // y el archivo de cada pantalla (lo que se abre sin visor).
    const internal = await page.locator(".case a[href^='/']").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(internal).toContain(`/es/proyectos#${id}`);
    for (const href of new Set(internal.map((entry) => entry.split("#")[0]))) {
      // El servidor de pruebas, cargado, a veces corta la conexión: eso no es
      // un enlace muerto. Se reintenta el corte (ECONNRESET), no un 404.
      const response = await request.get(href, { maxRetries: 2 });
      expect(response.status(), href).toBe(200);
    }
    await context.close();
  });
}

test("C2 · la escena persistente duerme en el caso y vuelve a dibujar en el mapa", async ({ page }) => {
  await skipWithoutWebGL2(page);
  // La escena sube sobre SwiftShader: montarla cuesta más que el presupuesto
  // por defecto. Ventana pequeña, como Miller, para que dibuje ligera.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addInitScript(() => {
    // Encendido a propósito: sólo eso monta la escena sobre una GPU por software.
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
    const state = window as unknown as { systemDraws: number; __contextos: string[] };
    state.systemDraws = 0;
    state.__contextos = [];
    for (const name of ["drawArrays", "drawElements"] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      Object.defineProperty(WebGL2RenderingContext.prototype, name, { configurable: true, value: function (this: WebGL2RenderingContext, ...args: number[]) {
        if (this.canvas instanceof HTMLCanvasElement && this.canvas.classList.contains("system-canvas")) state.systemDraws++;
        return Reflect.apply(original, this, args);
      } });
    }
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (this.isConnected && !this.classList.contains("system-canvas")) state.__contextos.push(kind);
      return Reflect.apply(getContext, this, [kind, ...rest]);
    } });
  });
  await page.goto(caseHref("omsta"));
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toHaveAttribute("data-covered", "true", { timeout: 30000 });
  expect(await systemDrawsOverFrames(page)).toBe(0);
  // El caso no pide WebGL propio: es HTML, imágenes y el SVG del sistema.
  const contextos = await page.evaluate(() => (window as unknown as { __contextos: string[] }).__contextos);
  expect(contextos.filter((kind) => kind.startsWith("webgl"))).toHaveLength(0);
  // Es el mismo canvas, dormido: al salir al mapa se descubre y dibuja.
  await canvas.evaluate((node) => { node.setAttribute("data-persistence-marker", "same-canvas"); });
  await page.getByRole("link", { name: "Jonás Orbit, inicio", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "same-canvas");
  await expect.poll(() => page.evaluate(() => (window as unknown as { systemDraws: number }).systemDraws)).toBeGreaterThan(0);
});

test("C3 · el visor abre desde una pantalla, recorre todas con → ←, cierra con Escape y devuelve el foco", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const omsta = mdx("omsta");
  const screens = screensOf(omsta);
  const total = screens.length;
  await openCase(page, "omsta", "decisiones");
  const viewer = page.locator("dialog.case-viewer");
  await expect(viewer).not.toHaveAttribute("open");

  const expectShot = async (index: number) => {
    const where = `pantalla ${index + 1}`;
    await expect(viewer, where).toHaveAttribute("open");
    await expect(viewer, where).toHaveAccessibleName(`${nameOf(omsta)}: pantalla ${index + 1} de ${total}`);
    await expect(viewer.locator(".case-viewer__count"), where).toHaveText(`${pad(index + 1)} / ${pad(total)}`);
    await expect(viewer.locator(".case-viewer__stage img"), where).toHaveAttribute("alt", screens[index].alt);
    await expect(viewer.locator("figcaption"), where).toHaveText(squash(screens[index].caption));
  };
  const at = (index: number) => ((index % total) + total) % total;

  // Desde la pantalla de la primera decisión, con el teclado. El visor
  // intercepta el enlace: la página no navega al archivo.
  const first = screens.findIndex((image) => image.src === omsta.designDecisions?.[0].screen);
  const decisionShot = page.locator(`#decisiones a[data-case-shot="${first}"]`);
  await decisionShot.focus();
  await page.keyboard.press("Enter");
  await expectShot(first);
  await expect(viewer.getByRole("button", { name: "Cerrar" })).toBeFocused();
  await expect(page).toHaveURL(/\/es\/proyectos\/omsta#decisiones$/);
  // → avanza; ← retrocede y da la vuelta: recorre TODAS las del proyecto.
  await page.keyboard.press("ArrowRight");
  await expectShot(at(first + 1));
  for (let step = 0; step <= first + 1; step++) await page.keyboard.press("ArrowLeft");
  await expectShot(at(-1));
  await viewer.getByRole("button", { name: "Pantalla siguiente" }).click();
  await expectShot(0);
  await page.keyboard.press("Escape");
  await expect(viewer).not.toHaveAttribute("open");
  await expect(decisionShot).toBeFocused();

  // Desde el primer pantallazo, con el ratón; «Cerrar» también devuelve el foco.
  const heroShot = page.locator('.case-hero__stage a[data-case-shot="0"]');
  await heroShot.click();
  await expectShot(0);
  await viewer.getByRole("button", { name: "Cerrar" }).click();
  await expect(viewer).not.toHaveAttribute("open");
  await expect(heroShot).toBeFocused();

  /*
    Desde el recorrido del final: al cerrar, el foco vuelve a la miniatura de
    la pantalla que se estaba mirando si está en el mismo módulo (no a la que
    abrió el visor, que ya quedó atrás), y si no, a la que lo abrió.
  */
  const more = moreScreens(omsta);
  expect(more.length, "OMSTA tiene pantallas al final del caso").toBeGreaterThan(0);
  const opened = more[0];
  const gridShot = (index: number) => page.locator(`#pantallas a[data-case-shot="${index}"]`);
  await gridShot(opened).focus();
  await page.keyboard.press("Enter");
  await expectShot(opened);
  await page.keyboard.press("ArrowRight");
  await expectShot(at(opened + 1));
  await page.keyboard.press("Escape");
  await expect(viewer).not.toHaveAttribute("open");
  await expect(more.includes(at(opened + 1)) ? gridShot(at(opened + 1)) : gridShot(opened)).toBeFocused();
});

test("C4 · «← Proyectos» vuelve a la mesa, arriba, con ese proyecto elegido", async ({ page }) => {
  // Sin tamaño propio: corre al de cada proyecto de Playwright, escritorio y 375 px.
  test.setTimeout(90_000);
  // Desde una sección de más abajo: la vuelta también tiene que subir.
  await openCase(page, "wikiverse", "resumen");
  const back = page.locator(".case-hero").getByRole("link", { name: "Proyectos", exact: true });
  await expect(back).toHaveAttribute("href", "/es/proyectos#wikiverse");
  await back.click();
  await expect(page).toHaveURL(/\/es\/proyectos#wikiverse$/);
  await expect(page.locator(".table")).toHaveAttribute("data-enhanced", "true", { timeout: 20_000 });
  await expect(page.locator("#wikiverse")).toHaveAttribute("data-state", "active");
  await expect(page.locator('.table-dock a[href="#wikiverse"]')).toHaveAttribute("aria-current", "true");
  // Los `#id` de la mesa eligen proyecto, no son puntos de lectura: la mesa
  // se ve desde arriba, no desplazada hasta la sección.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 100))));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("C5 · los cinco casos, sin desbordamiento horizontal a 375 y 1440", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const id of F1A_PROJECT_IDS) {
      await page.goto(caseHref(id));
      const overflow = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= width) return [];
        // Para el mensaje: lo que asoma por la derecha fuera de una tira que
        // se desplaza por su cuenta.
        return [...document.querySelectorAll<HTMLElement>(".case *")]
          .filter((el) => el.getBoundingClientRect().right > width + 1)
          .filter((el) => !el.parentElement?.closest("ol, ul, nav"))
          .slice(0, 8)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className} → ${Math.round(el.getBoundingClientRect().right)}`);
      });
      expect(overflow, `${id} a ${viewport.width}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${id} a ${viewport.width}`).toBe(true);
    }
  }
});

test("C6 · con el movimiento apagado nada queda oculto ni en marcha", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(caseHref("omsta"));
  // El interruptor publica su estado al hidratar: antes, pulsarlo no haría nada.
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on", { timeout: 20_000 });
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");

  /*
    Los revelados van ligados al scroll (`animation-timeline: view()`): con el
    movimiento encendido, lo que aún no ha entrado en vista está a opacidad
    cero. Apagado, todo está ya en su sitio y entero, también lo de muy abajo,
    sin desplazar la página.
  */
  const reveals = await page.locator(".case .case-reveal").evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    return { name: `${node.className}`, opacity: style.opacity, animation: style.animationName, translate: style.translate };
  }));
  expect(reveals.length).toBeGreaterThan(0);
  expect(reveals.filter((entry) => entry.opacity !== "1" || entry.animation !== "none" || (entry.translate !== "none" && entry.translate !== "0px"))).toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    return target instanceof Element && target.closest(".case") && animation.playState === "running";
  }).length)).toBe(0);

  // La barra local aparece en el acto al pasar el primer pantallazo.
  await page.locator(".case-hero__actions").getByRole("link", { name: /Ver el sistema/ }).click();
  await expect(page).toHaveURL(/#sistema$/);
  const localNav = page.locator(".case-localnav");
  await expect(localNav).toHaveAttribute("data-shown", "true");
  await expect(localNav).toHaveCSS("opacity", "1");
  await expect(localNav.locator('a[aria-current="location"]')).toHaveText("Sistema");

  // Y el visor abre sin fundido.
  const shot = page.locator("#decisiones a[data-case-shot]").first();
  await shot.focus();
  await page.keyboard.press("Enter");
  const viewer = page.locator("dialog.case-viewer");
  await expect(viewer).toHaveAttribute("open");
  await expect(viewer.locator(".case-viewer__body")).toHaveCSS("animation-name", "none");
  await expect(viewer.locator(".case-viewer__body")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(viewer).not.toHaveAttribute("open");
});

test("C7 · el sistema del caso: enfocar un módulo lo lleva al inspector y enciende su ruta", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCase(page, "omsta", "sistema");
  // El ratón, fuera del esquema: aquí se mide el foco.
  await page.mouse.move(0, 0);
  const { nodes, edges } = mdx("omsta").architecture;
  const system = page.locator("#sistema");
  const lines = system.locator("svg.holo-diagram__lines path.holo-line");
  await expect(lines).toHaveCount(edges.length);
  await expect(system.locator(".holo-lane")).toHaveCount(new Set(nodes.map((node) => node.lane)).size);
  const inspector = system.getByRole("region", { name: "Inspector del módulo" });
  // Una sola parada de tabulador en el esquema: el módulo elegido.
  await expect(system.locator('.holo-node__box[tabindex="0"]')).toHaveCount(1);

  for (const node of nodes) {
    await system.locator(`.holo-node[data-node-id="${node.id}"] .holo-node__box`).focus();
    await expect(system.locator(`.holo-node[data-node-id="${node.id}"]`)).toHaveAttribute("data-selected", "true");
    await expect(inspector.getByRole("heading", { level: 3 }), node.id).toHaveText(node.label);
    if (node.decision) await expect(inspector.locator("blockquote"), node.id).toHaveText(squash(node.decision));
    else await expect(inspector.locator("blockquote"), node.id).toHaveCount(0);

    const expected = route(edges, node.id);
    const pathOf = (id: string) => (expected.upstream.has(id) ? "up" : expected.downstream.has(id) ? "down" : null);
    await expect.poll(() => system.locator(".holo-node").evaluateAll((all) => all.map((entry) => `${entry.getAttribute("data-node-id")}:${entry.getAttribute("data-path")}`).sort()), `${node.id}: módulos de la ruta`)
      .toEqual(nodes.map((entry) => `${entry.id}:${pathOf(entry.id)}`).sort());
    await expect.poll(() => lines.evaluateAll((paths) => paths.map((path) => (path.getAttribute("data-on") ? path.getAttribute("data-dir") : null))), `${node.id}: aristas de la ruta`)
      .toEqual(expected.lines);
  }
});
