import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * LA MESA DE INGENIERÍA — `/es/proyectos` (docs/design/endurance-proyectos.md
 * §11, y §17 para lo que cambió en el tercer pase).
 *
 * P5  sin JavaScript: cinco proyectos, `:target`, el alcance y la ficha de
 *     texto (`scripting: none`) y ningún enlace muerto.
 * P5  Producto: el alcance son las tres cifras del MDX, y sólo en Producto.
 * P6  la ruta no crea contexto WebGL y la escena persistente no dibuja, ni en
 *     la mesa ni en el caso completo al que lleva.
 * P7  sólo teclado: muelle → capa → nodo → decisión → «Explorar proyecto»,
 *     con el foco siempre en su sitio; hero → Endurance → OMSTA en dos (A20).
 * P7  el muelle: ← → dentro de él, botones anterior/siguiente, flechas
 *     globales con el foco en `body`, rueda horizontal y vista previa.
 * P7  Diseño: el carrete recorre sólo las pantallas con decisión y la nota es
 *     el problema y la decisión de ese paso.
 * P8  375/768/1440 y las tres capas: sin desbordamiento, blancos de 44 px
 *     (con la excepción documentada de las filas del esquema) y el scroll gana.
 * P9  cada pantalla pintada sirve un archivo ≥ 1,2× su tamaño pintado.
 * P10 con el movimiento apagado: sin transición, sin encendido, sin cruce, y
 *     todo sigue operable.
 * P12 en Ingeniería el SVG tiene tantas líneas como aristas del MDX, sólo los
 *     carriles ocupados, y enfocar un nodo enseña su decisión y enciende su
 *     RUTA —en el esquema y en el anillo de la mesa— (inspector en
 *     escritorio, bajo el nodo en móvil).
 *
 * Las cifras esperadas salen del MDX compilado por Velite (`.velite/`, que
 * `npm run build` regenera antes de construir), no de números escritos aquí:
 * si Jonás corrige una arquitectura o un alcance, el test sigue midiendo lo
 * mismo.
 */

const MESA = "/es/proyectos";
const PROJECT_IDS = ["omsta", "izaks-photos", "wikiverse", "network", "delicate"];
const LAYERS = ["producto", "diseno", "ingenieria"] as const;

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
/** Las pantallas del proyecto en el orden de la mesa: la destacada y la galería. */
const screensOf = (project: MdxProject) => [project.featuredImage, ...(project.gallery ?? [])];
/**
 * Las que la mesa MONTA, calculadas aquí desde la definición (§18): las tres
 * de Producto —la destacada; a su izquierda el primer teléfono o, sin él, la
 * segunda de escritorio; a su derecha la primera de escritorio— y las del
 * carrete de Diseño (las de las decisiones o, sin ellas, todas).
 */
function onTableOf(project: MdxProject) {
  const [featured, ...rest] = screensOf(project);
  const desktops = rest.filter((image) => image.frame !== "mobile");
  const left = rest.find((image) => image.frame === "mobile") ?? desktops[1];
  const right = desktops[0];
  const decisions = new Set((project.designDecisions ?? []).map((entry) => entry.screen));
  return screensOf(project).filter(
    (image) => image === featured || image === left || image === right || decisions.size === 0 || decisions.has(image.src),
  );
}
/** El nombre que pinta la mesa: el título cortado en la raya («OMSTA»). */
const nameOf = (project: MdxProject) => project.title.split(/\s+—\s+/)[0].trim();
/** Qué es: la cola del título o, si no la hay, la `eyebrow`. */
const descriptorOf = (project: MdxProject) => (project.title.split(/\s+—\s+/)[1] ?? project.eyebrow).trim();
const pad = (value: number) => String(value).padStart(2, "0");

/**
 * LA RUTA de un módulo (§17): lo que llega a él y lo que sale de él siguiendo
 * las aristas del MDX en su sentido. Una arista entra en la ruta sólo si va
 * por ella —de un antecesor hacia el nodo, o del nodo hacia un sucesor—: un
 * atajo que salta el nodo no se enciende. Se calcula aquí, desde la
 * definición, y no con `nodePath` de la página: si la página se equivoca, el
 * test no se equivoca con ella.
 */
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
  // Cada arista del MDX, en su orden: `down` si sale del nodo aguas abajo,
  // `up` si llega a él desde aguas arriba, `null` si no está en la ruta.
  const lines = edges.map(([from, to]) => {
    if ((from === id || downstream.has(from)) && downstream.has(to)) return "down";
    if (upstream.has(from) && (to === id || upstream.has(to))) return "up";
    return null;
  });
  return { upstream, downstream, lines };
}

async function systemDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { systemDraws: number };
    const before = state.systemDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.systemDraws - before;
  });
}

/**
 * Espera a que la mesa quede quieta: ninguna transición ni animación finita
 * en marcha dentro de `.table`. Sondea por tiempo y no por rAF, que en
 * Chromium headless puede pararse si nada fuerza un pintado.
 */
async function settle(page: Page) {
  await page.waitForFunction(
    () => {
      const table = document.querySelector(".table");
      if (!table) return false;
      return table
        .getAnimations({ subtree: true })
        .every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity);
    },
    undefined,
    { polling: 100, timeout: 10_000 },
  );
}

async function openTable(page: Page, viewport: { width: number; height: number }, path = MESA) {
  await page.setViewportSize(viewport);
  await page.goto(path);
  // Hidratar con la suite entera en paralelo (y SwiftShader) pasa de 5 s.
  await expect(page.locator(".table")).toHaveAttribute("data-enhanced", "true", { timeout: 20_000 });
}

async function chooseLayer(page: Page, layer: (typeof LAYERS)[number]) {
  await page.locator(`[data-layer-tab="${layer}"]`).click();
  await expect(page.locator(".table")).toHaveAttribute("data-layer", layer);
  await settle(page);
}

/** El proyecto a la vista: el hash que la mesa escribe y la sección activa. */
async function expectActive(page: Page, id: string) {
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  await expect(page.locator(`#${id}`)).toHaveAttribute("data-state", "active");
  await expect(page.locator(`.table-dock a[href="#${id}"]`)).toHaveAttribute("aria-current", "true");
}

test("P5 · sin JavaScript la mesa es el contenido: cinco proyectos, :target, alcance, ficha de texto y enlaces vivos", async ({ browser, baseURL, request }) => {
  // Muchos pasos y varias rutas servidas: con la suite entera en paralelo el
  // servidor de pruebas va cargado y los 30 s por defecto no bastan.
  test.setTimeout(90_000);
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(MESA);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Proyectos");

  // El servidor no elige: sin `data-enhanced` ni `data-state`, decide el CSS.
  await expect(page.locator(".table[data-enhanced]")).toHaveCount(0);
  await expect(page.locator("section.table-project")).toHaveCount(PROJECT_IDS.length);
  await expect(page.locator("section.table-project[data-state]")).toHaveCount(0);
  expect(await page.locator("section.table-project").evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(PROJECT_IDS);

  // Las pantallas que la mesa levanta, de los cinco proyectos y con su alt,
  // están en el HTML; las demás son del caso completo.
  const alts = await page.locator(".holo-screen img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt") ?? ""));
  expect(alts).toEqual(PROJECT_IDS.flatMap((id) => onTableOf(mdx(id)).map((image) => image.alt)));

  // Sin hash se lee el primero, y su ficha de texto se pinta porque no hay
  // guion (`@media (scripting: none)`): lo que dice la capa Diseño —las
  // decisiones de diseño o, sin ellas, los pies— y el sistema con decisiones.
  await expect(page.locator("#omsta")).toBeVisible();
  for (const id of PROJECT_IDS.slice(1)) await expect(page.locator(`#${id}`)).toBeHidden();
  const omsta = mdx("omsta");
  const sheet = page.locator("#omsta .table-fallback");
  await expect(sheet, "la ficha sin JS no se pinta: ¿Chromium no casa `scripting: none` con javaScriptEnabled: false?").toBeVisible();
  const designDecisions = omsta.designDecisions ?? [];
  await expect(sheet.locator("ol > li")).toHaveText(
    designDecisions.length > 0
      ? designDecisions.map((entry) => `Problema: ${entry.problem} Decisión: ${entry.decision}`)
      : screensOf(omsta).map((image) => image.caption),
  );
  await expect(sheet.locator("dl dt")).toHaveCount(omsta.architecture.nodes.length);
  await expect(sheet.locator("dl dd")).toHaveCount(omsta.architecture.nodes.filter((node) => node.decision).length);
  // El alcance es HTML servido en la capa de entrada (Producto): se lee sin guion.
  const scope = page.locator("#omsta .holo-scope");
  await expect(scope).toBeVisible();
  await expect(scope.locator("dd")).toHaveText((omsta.scope ?? []).map((entry) => entry.value));
  await expect(scope.locator("dt")).toHaveText((omsta.scope ?? []).map((entry) => entry.label));
  // Los mandos que sólo sirven con guion no se enseñan.
  await expect(page.locator(".table-tabs")).toBeHidden();
  await expect(page.locator("#omsta .holo-note")).toBeHidden();
  for (const step of await page.locator(".table-dock__step").all()) await expect(step).toBeHidden();

  // `#wikiverse` selecciona por :target desde el muelle, que es un enlace real.
  await page.locator('.table-dock a[href="#wikiverse"]').click();
  await expect(page).toHaveURL(/#wikiverse$/);
  await expect(page.locator("#wikiverse")).toBeVisible();
  await expect(page.locator("#omsta")).toBeHidden();
  await expect(page.locator("#wikiverse").getByRole("heading", { level: 2 })).toHaveText("Wiki Universe");
  await expect(page.locator("#wikiverse .table-fallback")).toBeVisible();
  await expect(page.locator("#wikiverse .table-fallback dl dt")).toHaveCount(mdx("wikiverse").architecture.nodes.length);
  await expect(page.locator("#wikiverse .holo-scope dd")).toHaveText((mdx("wikiverse").scope ?? []).map((entry) => entry.value));

  // «Explorar proyecto» en cada sección, y ningún enlace interno muerto.
  const explore = await page.locator(".table-read a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  expect(explore.filter((href) => href.startsWith("/es/proyectos/")).sort()).toEqual(PROJECT_IDS.map((id) => `/es/proyectos/${mdx(id).slug}`).sort());
  const internal = await page.locator(".projects-page a[href^='/']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  for (const href of new Set(internal)) {
    // El servidor de pruebas, cargado, a veces corta la conexión: eso no es un
    // enlace muerto. Se reintenta el corte (ECONNRESET), no un 404.
    const response = await request.get(href, { maxRetries: 2 });
    expect(response.status(), href).toBe(200);
  }
  await page.locator("#wikiverse").getByRole("link", { name: /Explorar proyecto/ }).click();
  await expect(page).toHaveURL(/\/es\/proyectos\/wikiverse$/);
  await context.close();
});

test("P5 · Producto: el alcance son las tres cifras del MDX, caben en su columna y sólo se ven en Producto", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await openTable(page, viewport, `${MESA}#omsta`);
    // OMSTA son cifras; Wiki Universe, palabras («Markdown», «OpenAPI»), que
    // son las que desbordaban su columna.
    for (const id of ["omsta", "wikiverse"]) {
      const where = `${viewport.width}/${id}`;
      if (id !== "omsta") {
        await page.getByRole("navigation", { name: "Proyectos" }).getByRole("link", { name: new RegExp(nameOf(mdx(id))) }).click();
        await expectActive(page, id);
      }
      const expected = mdx(id).scope ?? [];
      expect(expected, where).toHaveLength(3);
      const scope = page.locator(`#${id} .holo-scope`);
      await expect(scope, where).toBeVisible();
      await expect(scope.locator("dd"), where).toHaveText(expected.map((entry) => entry.value));
      await expect(scope.locator("dt"), where).toHaveText(expected.map((entry) => entry.label));
      // Cada cifra cabe en su columna: medida por su texto, no por su caja.
      const spill = await scope.locator("dl > div").evaluateAll((cells) => cells.flatMap((cell) => {
        const value = cell.querySelector("dd");
        if (!value) return ["sin cifra"];
        const range = document.createRange();
        range.selectNodeContents(value);
        const text = range.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        return text.left < box.left - 1 || text.right > box.right + 1 ? [`«${value.textContent}» ${Math.round(text.width)} px en ${Math.round(box.width)} px`] : [];
      }));
      expect(spill, where).toEqual([]);
    }
    // En las otras capas la mesa cambia de función y el alcance se retira.
    for (const layer of ["diseno", "ingenieria"] as const) {
      await chooseLayer(page, layer);
      await expect(page.locator("#wikiverse .holo-scope"), `${viewport.width}/${layer}`).toBeHidden();
    }
    await chooseLayer(page, "producto");
    await expect(page.locator("#wikiverse .holo-scope")).toBeVisible();
  }
});

test("P6 · la ruta no crea contexto WebGL y la escena persistente duerme, también en el caso", async ({ page }) => {
  // La escena sube sobre SwiftShader: montarla cuesta más que el presupuesto
  // por defecto, y aquí se monta una vez y se navega dos.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await page.goto(MESA);
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toHaveAttribute("data-covered", "true", { timeout: 30000 });
  expect(await systemDrawsOverFrames(page)).toBe(0);
  // Ningún canvas de esta página pide WebGL: la mesa es CSS y SVG. (El cielo de
  // la cabecera y el pie son 2D.)
  const contextos = await page.evaluate(() => (window as unknown as { __contextos: string[] }).__contextos);
  expect(contextos.filter((kind) => kind.startsWith("webgl"))).toHaveLength(0);
  /*
    El caso completo TAMBIÉN se cubre (§17.4): tiene su fondo propio y opaco,
    y ningún planeta pasa por detrás del texto. Es el MISMO canvas, que sigue
    montado y quieto; que vuelve a dibujar al descubrirse lo prueban
    `proyecto-caso.spec.ts` y `miller.spec.ts` con el mismo molde.
  */
  await canvas.evaluate((node) => { node.setAttribute("data-persistence-marker", "same-canvas"); });
  await page.getByRole("link", { name: /Explorar proyecto/ }).first().click();
  await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(nameOf(mdx("omsta")));
  await expect(canvas).toHaveAttribute("data-covered", "true");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "same-canvas");
  expect(await systemDrawsOverFrames(page)).toBe(0);
});

test("P7 · sólo teclado: muelle, capa, nodo, decisión y salida; A20 en dos interacciones", async ({ page }) => {
  // Muchos pasos y varias rutas servidas: con la suite entera en paralelo el
  // servidor de pruebas va cargado y los 30 s por defecto no bastan.
  test.setTimeout(90_000);
  await openTable(page, { width: 1440, height: 900 });

  // El muelle: enlaces reales; Enter cambia el proyecto sin recargar ni apilar historia.
  const depth = await page.evaluate(() => {
    (window as unknown as { __mismaPagina: boolean }).__mismaPagina = true;
    return history.length;
  });
  const dockLink = page.getByRole("navigation", { name: "Proyectos" }).getByRole("link", { name: /Delicaté/ });
  await dockLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#delicate$/);
  const section = page.locator("#delicate");
  await expect(section).toHaveAttribute("data-state", "active");
  await expect(dockLink).toHaveAttribute("aria-current", "true");
  await expect(dockLink).toBeFocused();
  expect(await page.evaluate(() => [(window as unknown as { __mismaPagina?: boolean }).__mismaPagina, history.length])).toEqual([true, depth]);

  // El selector: flechas entre capas, el foco se queda en el selector. Las
  // flechas son suyas: no pasan de proyecto (eso sólo con el foco en `body`).
  await page.getByRole("tab", { name: /Producto/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const ingenieria = page.getByRole("tab", { name: /Ingeniería/ });
  await expect(ingenieria).toBeFocused();
  await expect(ingenieria).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".table")).toHaveAttribute("data-layer", "ingenieria");
  await expect(ingenieria).toHaveAttribute("aria-controls", "delicate-stage");
  await expectActive(page, "delicate");

  // Tab: la salida al caso, el producto vivo y el código (Delicaté tiene los
  // dos) y, después, el módulo elegido del esquema. Las pantallas no son
  // parada: en Ingeniería van inert.
  const explore = section.getByRole("link", { name: /Explorar proyecto/ });
  const site = section.getByRole("link", { name: /Visitar la tienda/ });
  const code = section.getByRole("link", { name: /Ver código/ });
  await page.keyboard.press("Tab");
  await expect(explore).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(site).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(code).toBeFocused();
  await page.keyboard.press("Tab");
  // La parada de tabulador del esquema es el módulo elegido (`aria-current`).
  const selected = section.locator('.holo-node__box[aria-current="true"]');
  await expect(selected).toBeFocused();
  expect(await section.locator(".holo-screen__pick").evaluateAll((nodes) => nodes.every((node) => (node as HTMLElement).inert))).toBe(true);

  // Nodo → decisión: el inspector lee la decisión del módulo enfocado, la
  // misma que su `aria-describedby`.
  const inspector = section.getByRole("region", { name: "Inspector del módulo" });
  const describedBy = await selected.getAttribute("aria-describedby");
  expect(describedBy, "el primer módulo elegido es el primero con decisión").toBeTruthy();
  const decision = (await page.locator(`#${describedBy}`).textContent())?.trim() ?? "";
  await expect(inspector.locator("blockquote")).toBeVisible();
  await expect(inspector.locator("blockquote")).toHaveText(decision);

  // Las flechas recorren el esquema y el foco nunca sale de él.
  const first = await selected.locator("xpath=..").getAttribute("data-node-id");
  await page.keyboard.press("ArrowDown");
  const moved = section.locator('.holo-node:has(.holo-node__box[aria-current="true"])');
  await expect(moved).not.toHaveAttribute("data-node-id", first ?? "");
  await expect(moved.locator(".holo-node__box")).toBeFocused();
  await expect(inspector.getByRole("heading", { level: 3 })).toHaveText((await moved.locator(".holo-node__label").textContent()) ?? "");
  await page.keyboard.press("ArrowUp");
  await expect(section.locator(`.holo-node[data-node-id="${first}"] .holo-node__box`)).toBeFocused();

  // «Explorar proyecto» sigue a mano en cualquier capa: tres tabulaciones
  // atrás, pasando por el código y el producto vivo.
  await page.keyboard.press("Shift+Tab");
  await expect(code).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(site).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(explore).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/es/proyectos/${mdx("delicate").slug}$`));

  // A20: hero → Endurance → OMSTA en dos interacciones.
  await page.goto("/es?no3d=1");
  await page.getByRole("link", { name: /Proyectos/ }).first().click();
  await expect(page).toHaveURL(/\/es\/proyectos$/);
  await page.getByRole("link", { name: /Explorar proyecto/ }).first().click();
  await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
});

test("P7 · el muelle: ← → dentro, botones anterior/siguiente, flechas globales, rueda horizontal y vista previa", async ({ page }) => {
  test.setTimeout(90_000);
  await openTable(page, { width: 1440, height: 900 }, `${MESA}#${PROJECT_IDS[0]}`);
  await expectActive(page, PROJECT_IDS[0]);
  const dock = page.getByRole("navigation", { name: "Proyectos" });
  const at = (offset: number) => PROJECT_IDS[(((offset % PROJECT_IDS.length) + PROJECT_IDS.length) % PROJECT_IDS.length)];
  const depth = await page.evaluate(() => history.length);

  // Los botones, por teclado: el anterior del primero es el último (el
  // muelle da la vuelta) y el foco se queda en el botón.
  const previous = dock.getByRole("button", { name: "Proyecto anterior" });
  const next = dock.getByRole("button", { name: "Proyecto siguiente" });
  await previous.focus();
  await page.keyboard.press("Enter");
  await expectActive(page, at(-1));
  await expect(previous).toBeFocused();
  await next.focus();
  await page.keyboard.press("Enter");
  await expectActive(page, at(0));
  await page.keyboard.press("Space");
  await expectActive(page, at(1));
  await expect(next).toBeFocused();

  // Dentro del muelle: ← → pasan de proyecto y el foco viaja con el enlace;
  // Inicio y Fin, al primero y al último.
  const link = (id: string) => page.locator(`.table-dock a[href="#${id}"]`);
  await link(at(1)).focus();
  await page.keyboard.press("ArrowRight");
  await expectActive(page, at(2));
  await expect(link(at(2))).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expectActive(page, at(1));
  await expect(link(at(1))).toBeFocused();
  await page.keyboard.press("End");
  await expectActive(page, at(-1));
  await expect(link(at(-1))).toBeFocused();
  await page.keyboard.press("Home");
  await expectActive(page, at(0));
  await expect(link(at(0))).toBeFocused();

  // Flechas globales: con el foco en `body`, ← → pasan de proyecto.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ArrowRight");
  await expectActive(page, at(1));
  await page.keyboard.press("ArrowLeft");
  await expectActive(page, at(0));
  // Ninguno de estos pasos apila historia: el muelle reescribe el hash.
  expect(await page.evaluate(() => history.length)).toBe(depth);

  /*
    La rueda sobre el muelle. La VERTICAL es el scroll de la página: ni pasa
    de proyecto ni se secuestra (se despacha a mano para leer, en el acto,
    si alguien la anuló). La HORIZONTAL pasa un proyecto por gesto, aunque el
    gesto traiga varios eventos, como la inercia de un trackpad.
  */
  const vertical = await dock.evaluate((nav) => {
    const event = new WheelEvent("wheel", { deltaY: 160, bubbles: true, cancelable: true });
    nav.dispatchEvent(event);
    return { prevented: event.defaultPrevented, hash: location.hash };
  });
  expect(vertical, "la rueda vertical es de la página").toEqual({ prevented: false, hash: `#${at(0)}` });
  const dockBox = await dock.boundingBox();
  if (!dockBox) throw new Error("El muelle no tiene caja");
  await page.mouse.move(dockBox.x + dockBox.width / 2, dockBox.y + dockBox.height / 2);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(120, 0);
  await expectActive(page, at(1));

  /*
    La vista previa: apuntar otro proyecto del muelle lo enseña —su nombre y
    qué es— sin elegirlo; Escape la cierra siempre (WCAG 1.4.13).
  */
  const peekId = at(3);
  const peekBox = await link(peekId).boundingBox();
  if (!peekBox) throw new Error(`El enlace de ${peekId} no tiene caja`);
  await page.mouse.move(peekBox.x + peekBox.width / 2, peekBox.y + peekBox.height / 2);
  const peek = page.locator(".table-dock__peek");
  await expect(peek).toHaveAttribute("data-open", "true");
  await expect(peek.locator(".table-dock__peek-name")).toHaveText(nameOf(mdx(peekId)));
  await expect(peek.locator(".table-dock__peek-what")).toHaveText(descriptorOf(mdx(peekId)));
  await expectActive(page, at(1));
  await page.keyboard.press("Escape");
  await expect(peek).not.toHaveAttribute("data-open", "true");
});

test("P7 · Diseño: el carrete recorre sólo las pantallas con decisión y la nota es la del paso", async ({ page }) => {
  test.setTimeout(90_000);
  await openTable(page, { width: 1440, height: 900 }, `${MESA}#omsta`);
  await chooseLayer(page, "diseno");
  const omsta = mdx("omsta");
  const decisions = omsta.designDecisions ?? [];
  expect(decisions.length, "OMSTA declara decisiones de diseño").toBeGreaterThanOrEqual(3);
  const altOf = (src: string) => screensOf(omsta).find((image) => image.src === src)?.alt ?? `¿${src}?`;
  const section = page.locator("#omsta");

  /*
    El carrete son las pantallas de las decisiones: a la vista, las que caen a
    dos puestos o menos de la elegida (con ocho, cinco: la elegida, dos a cada
    lado, dando la vuelta); el resto queda fuera (`data-far`).
  */
  const near = decisions.filter((_, index) => {
    let rel = index % decisions.length;
    if (rel > decisions.length / 2) rel -= decisions.length;
    return Math.abs(rel) <= 2;
  });
  const reel = section.locator("figure.holo-screen:not([data-far])");
  await expect(reel).toHaveCount(near.length);
  expect((await reel.locator("img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt") ?? ""))).sort()).toEqual(near.map((entry) => altOf(entry.screen)).sort());

  // Cada paso: su pantalla delante, y en la mesa su índice, su problema y su
  // decisión —lo mismo que la pantalla elegida lleva por `aria-describedby`—.
  const front = section.locator("figure.holo-screen[data-front]");
  const pick = section.locator('.holo-screen__pick[aria-current="true"]');
  const expectStep = async (index: number) => {
    const step = decisions[index];
    const where = `decisión ${index + 1}`;
    await expect(front.locator("img"), where).toHaveAttribute("alt", altOf(step.screen));
    await expect(section.locator(".holo-note__index"), where).toHaveText(`${pad(index + 1)} / ${pad(decisions.length)}`);
    await expect(section.locator(".holo-note__problem"), where).toHaveText(step.problem);
    await expect(section.locator(".holo-note__decision"), where).toHaveText(step.decision);
    await expect(page.locator(`#${await pick.getAttribute("aria-describedby")}`), where).toHaveText(`Problema: ${step.problem} Decisión: ${step.decision}`);
  };
  await expectStep(0);
  const nextDecision = section.getByRole("button", { name: "Decisión siguiente" });
  for (let index = 1; index < decisions.length; index++) {
    await nextDecision.click();
    await expectStep(index);
  }
  // Da la vuelta: tras la última, la primera. Y la región viva lo dice.
  await nextDecision.click();
  await expectStep(0);
  await expect(page.locator('.table [aria-live="polite"]')).toContainText(`decisión 1 de ${decisions.length}`);
  await section.getByRole("button", { name: "Decisión anterior" }).click();
  await expectStep(decisions.length - 1);

  // Con el teclado: ← → dentro del carrete, y el foco viaja con la elegida.
  await pick.focus();
  await page.keyboard.press("ArrowRight");
  await expectStep(0);
  await expect(pick).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expectStep(1);
  await expect(pick).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expectStep(0);
  await expect(pick).toBeFocused();
  // Las flechas del carrete son suyas: el proyecto no cambia.
  await expectActive(page, "omsta");
});

test("P8 · 375, 768 y 1440: sin desbordamiento, blancos de 44 px y el scroll de página gana", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await openTable(page, viewport);
    for (const layer of LAYERS) {
      await chooseLayer(page, layer);
      const where = `${viewport.width}/${layer}`;
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), where).toBe(true);
      // Ningún contenedor de la mesa desplaza por su cuenta.
      expect(await page.locator(".table").evaluate((table) => [...table.querySelectorAll<HTMLElement>("*")].filter((el) => {
        const style = getComputedStyle(el);
        return (style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight;
      }).map((el) => el.className)), where).toEqual([]);

      /*
        Blancos: todo mando operable y visible de la mesa (muelle y sus
        flechas, selector, lectura, pantallas de Diseño, nota y nodos) mide
        ≥ 44 × 44 px.

        La excepción es DECISIÓN DOCUMENTADA, no una holgura: en el escenario
        de escritorio (≥ 768 px) el botón de un nodo es la FILA ENTERA del
        esquema —la caja que se ve es el 70 % de ella—, y esa fila mide
        clamp(26px, 10,5cqh, 40px) con puntero fino. Cumple WCAG 2.5.8 AA
        (≥ 24 px) y no la AAA de 44: un esquema de nueve filas a 44 px no cabe
        en la mesa. Con `pointer: coarse` la fila sube a 44 px, y por debajo
        de 768 px cada nodo es una fila de lista de 44 px, así que ahí no hay
        excepción. Aquí se exige: alto ≥ 24 y ancho ≥ 44.

        Las cajas se redondean a la décima: una fila de 44 px colocada en una
        y fraccionaria mide 43,99994 en `getBoundingClientRect` (medido en
        móvil); una décima no esconde un blanco de 43 px.
      */
      const desktopStage = viewport.width >= 768;
      const small = await page.locator(".table").evaluate((table, stage) => [...table.querySelectorAll<HTMLElement>("a, button")]
        .filter((el) => !el.closest("[inert]") && getComputedStyle(el).visibility === "visible")
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return { el, box: { width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 } };
        })
        .filter(({ box }) => box.width > 0 && box.height > 0)
        .filter(({ el, box }) => stage && el.classList.contains("holo-node__box")
          ? box.height < 24 || box.width < 44
          : box.width < 44 || box.height < 44)
        .map(({ el, box }) => `${el.className} «${el.textContent?.trim().slice(0, 24) || el.getAttribute("aria-label")}» ${Math.round(box.width)}×${Math.round(box.height)}`), desktopStage);
      expect(small, where).toEqual([]);
    }
  }
});

test("P9 · cada pantalla pintada sirve un archivo ≥ 1,2× su tamaño pintado", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await openTable(page, viewport);
    for (const layer of ["producto", "diseno"] as const) {
      await chooseLayer(page, layer);
      const images = page.locator('.table-project[data-state="active"] figure.holo-screen img');
      // Sólo lo que se pinta: con caja, visible y encendido.
      const painted = await images.evaluateAll((nodes) => nodes.flatMap((img, index) => {
        const figure = img.closest("figure") as HTMLElement;
        const style = getComputedStyle(figure);
        const box = img.getBoundingClientRect();
        return box.width > 0 && style.visibility === "visible" && parseFloat(style.opacity) > 0 ? [index] : [];
      }));
      expect(painted.length, `${viewport.width}/${layer}`).toBeGreaterThan(0);
      for (const index of painted) {
        const image = images.nth(index);
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        const served = await image.evaluate((img: HTMLImageElement) => {
          const box = img.getBoundingClientRect();
          /*
            En Diseño las pantallas laterales giran sobre el eje vertical: su
            caja en pantalla se estrecha pero su canto cercano conserva el
            alto. El ancho que de verdad se pinta es el mayor de los dos: el
            de la caja, o su alto por la proporción de la captura.
          */
          const aspect = img.naturalWidth / img.naturalHeight;
          return { painted: Math.max(box.width, box.height * aspect) * devicePixelRatio, src: img.currentSrc };
        });
        /*
          El ancho REAL del archivo sale de su nombre (`-480.webp`), no de
          `naturalWidth`: con un `srcset` de descriptores `w` el navegador
          divide el ancho intrínseco por la densidad que él mismo calculó
          (candidato / `sizes`), así que `naturalWidth` devuelve casi el ancho
          pintado y la razón sale 1,0 aunque el archivo sea el correcto.
        */
        const step = Number(/-(\d+)\.webp$/.exec(served.src)?.[1]);
        expect(step, `${viewport.width}/${layer}: ${served.src}`).toBeGreaterThan(0);
        expect(step / served.painted, `${served.src} a ${viewport.width}/${layer} (${Math.round(served.painted)} px)`).toBeGreaterThanOrEqual(1.2);
      }
    }
  }
});

test("P10 · con el movimiento apagado: sin transición, sin encendido, sin cruce y operable", async ({ page }) => {
  await openTable(page, { width: 1440, height: 900 });
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  const table = page.locator(".table");
  await expect(table).toHaveAttribute("data-motion", "off");

  await page.locator('[data-layer-tab="ingenieria"]').click();
  await expect(table).toHaveAttribute("data-layer", "ingenieria");
  // Cero segundos en pantallas, líneas, tarjetas y nodos del sistema, en el
  // alcance y la nota, en el anillo de la mesa y en la luz del muelle.
  const durations = await page.locator([
    '.table-project[data-state="active"] :is(.holo-screen, .holo-line, .holo-card, .holo-node, .holo-scope, .holo-note)',
    ".console :is(.console__ring, .console__seg, .console__lane, .console__spec)",
    ".table-dock :is(.table-dock__glow, .table-dock__name, .table-dock__peek)",
  ].join(", ")).evaluateAll((nodes) => nodes.map((node) => `${(node as Element).getAttribute("class")}: ${getComputedStyle(node).transitionDuration}`));
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.filter((entry) => entry.split(": ")[1].split(",").some((part) => parseFloat(part) !== 0))).toEqual([]);
  // Sin encendido: ni la subida de las pantallas ni la de la lectura, ni el vidrio.
  const animated = await page.locator('.table-project[data-state="active"] :is(.holo-screen__frame, .table-read), .console__grid, .console__pool').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName));
  expect(animated.length).toBeGreaterThan(0);
  expect(animated.filter((name) => name !== "none")).toEqual([]);
  // Los estados cambian en el acto: nada en marcha dentro de la mesa.
  expect(await table.evaluate((root) => root.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length)).toBe(0);
  // Las líneas están trazadas sin esperar.
  expect(await page.locator("#omsta path.holo-line").evaluateAll((paths) => paths.every((path) => parseFloat(getComputedStyle(path).strokeDashoffset) === 0))).toBe(true);

  // Operable igual: pulsar un módulo lo lleva al inspector.
  await page.locator('#omsta .holo-node[data-node-id="redis"] .holo-node__box').click();
  await expect(page.locator('#omsta .holo-node[data-node-id="redis"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#omsta").getByRole("region", { name: "Inspector del módulo" }).getByRole("heading", { level: 3 })).toHaveText("Redis");

  // Y el muelle cambia sin cruce: el saliente nunca pasa por `leaving`.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __estados: string[] }).__estados = seen;
    const omsta = document.getElementById("omsta") as HTMLElement;
    new MutationObserver(() => seen.push(omsta.dataset.state ?? "")).observe(omsta, { attributes: true, attributeFilter: ["data-state"] });
  });
  await page.getByRole("navigation", { name: "Proyectos" }).getByRole("link", { name: /Network/ }).click();
  await expect(page.locator("#network")).toHaveAttribute("data-state", "active");
  await expect(page.locator("#omsta")).toHaveAttribute("data-state", "hidden");
  expect(await page.evaluate(() => (window as unknown as { __estados: string[] }).__estados)).not.toContain("leaving");
  // Los botones del muelle también, y nada queda en marcha tras el cambio.
  await page.getByRole("navigation", { name: "Proyectos" }).getByRole("button", { name: "Proyecto siguiente" }).click();
  await expect(page.locator("#delicate")).toHaveAttribute("data-state", "active");
  expect(await table.evaluate((root) => root.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length)).toBe(0);
});

test("P12 · en Ingeniería el SVG tiene una línea por arista del MDX, y enfocar un nodo enseña su decisión y enciende su ruta", async ({ page }) => {
  test.setTimeout(90_000);
  await openTable(page, { width: 1440, height: 900 }, `${MESA}#omsta`);
  await chooseLayer(page, "ingenieria");
  // El ratón, fuera del esquema: aquí se mide el foco; el choque entre el
  // foco y un ratón en reposo sobre un nodo tiene su propio test.
  await page.mouse.move(0, 0);
  const omsta = mdx("omsta");
  const { nodes, edges } = omsta.architecture;
  const section = page.locator("#omsta");
  const lines = section.locator("svg.holo-diagram__lines path.holo-line");
  await expect(lines).toHaveCount(edges.length);
  await expect(section.locator(".holo-node")).toHaveCount(nodes.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute("data-shape")).filter((shape) => !["cross", "adjacent", "arc"].includes(shape ?? "")))).toEqual([]);
  // Trazadas: el guion de cada línea ha llegado a cero y se ven.
  expect(await lines.evaluateAll((paths) => paths.every((path) => parseFloat(getComputedStyle(path).strokeDashoffset) === 0))).toBe(true);
  await expect(section.locator("svg.holo-diagram__lines")).toBeVisible();

  // El esquema tiene el tamaño del sistema: sólo los carriles que ocupa.
  const lanes = [...new Set(nodes.map((node) => node.lane))];
  const laneGroups = section.locator(".holo-lane");
  expect((await laneGroups.evaluateAll((groups) => groups.map((group) => group.getAttribute("data-lane") ?? ""))).sort()).toEqual([...lanes].sort());
  await expect(section.locator(".holo-diagram")).toHaveCSS("--cols", String(lanes.length));
  // Y el anillo de la mesa, un segmento por módulo.
  const ring = page.locator(".console__ring");
  await expect(ring.locator(".console__seg")).toHaveCount(nodes.length);

  /*
    Cada nodo al enfocarse: el inspector lee su decisión (la misma de su
    `aria-describedby`) o no cita ninguna, y se enciende SU RUTA entera —los
    módulos aguas arriba y aguas abajo, y sólo las aristas que corren por
    ella— en el esquema y en el anillo, cuyo centro dice su carril.
  */
  const inspector = section.getByRole("region", { name: "Inspector del módulo" });
  for (const node of nodes) {
    const box = section.locator(`.holo-node[data-node-id="${node.id}"] .holo-node__box`);
    await box.focus();
    await expect(section.locator(`.holo-node[data-node-id="${node.id}"]`)).toHaveAttribute("data-selected", "true");
    await expect(inspector.getByRole("heading", { level: 3 })).toHaveText(node.label);
    if (node.decision) {
      await expect(inspector.locator("blockquote"), node.id).toBeVisible();
      await expect(inspector.locator("blockquote"), node.id).toHaveText(node.decision);
      await expect(page.locator(`#${await box.getAttribute("aria-describedby")}`), node.id).toHaveText(node.decision);
    } else {
      await expect(inspector.locator("blockquote"), node.id).toHaveCount(0);
      await expect(box, node.id).not.toHaveAttribute("aria-describedby");
    }

    const expected = route(edges, node.id);
    const onPath = new Set([...expected.upstream, ...expected.downstream]);
    const pathOf = (id: string) => (expected.upstream.has(id) ? "up" : expected.downstream.has(id) ? "down" : null);
    await expect.poll(() => section.locator(".holo-node").evaluateAll((all) => all.map((entry) => `${entry.getAttribute("data-node-id")}:${entry.getAttribute("data-path")}`).sort()), `${node.id}: módulos de la ruta`)
      .toEqual(nodes.map((entry) => `${entry.id}:${pathOf(entry.id)}`).sort());
    // El SVG dibuja las aristas en el orden del MDX: cada una, encendida en
    // su sentido o apagada.
    await expect.poll(() => lines.evaluateAll((paths) => paths.map((path) => (path.getAttribute("data-on") ? path.getAttribute("data-dir") : null))), `${node.id}: aristas de la ruta`)
      .toEqual(expected.lines);

    const inLane = nodes.filter((entry) => entry.lane === node.lane).length;
    await expect(ring.locator('.console__seg[data-state="focus"]'), node.id).toHaveCount(1);
    await expect(ring.locator('.console__seg[data-state="path"]'), node.id).toHaveCount(onPath.size);
    await expect(ring.locator(".console__lane[data-on]"), node.id).toHaveCount(1);
    await expect(ring.locator(".console__seg[data-lane-on]"), node.id).toHaveCount(inLane);
    await expect(ring.locator(".console__readout-count"), node.id).toHaveText(pad(inLane));
    await expect(ring.locator(".console__readout-lane"), node.id).toHaveText((await inspector.locator(".holo-inspector__lane").textContent()) ?? "");
  }

  // Cambiar de proyecto rehace el esquema —y el anillo— con SU sistema, no el del anterior.
  const izaks = mdx("izaks-photos");
  await page.getByRole("navigation", { name: "Proyectos" }).getByRole("link", { name: /Izak/ }).click();
  await expect(page.locator("#izaks-photos svg.holo-diagram__lines path.holo-line")).toHaveCount(izaks.architecture.edges.length);
  await expect(page.locator("#izaks-photos .holo-node")).toHaveCount(izaks.architecture.nodes.length);
  await expect(page.locator("#izaks-photos .holo-lane")).toHaveCount(new Set(izaks.architecture.nodes.map((node) => node.lane)).size);
  await expect(ring.locator(".console__seg")).toHaveCount(izaks.architecture.nodes.length);
});

test("P7 · P12 · el foco del teclado elige aunque el ratón repose sobre otro nodo", async ({ page }) => {
  await openTable(page, { width: 1440, height: 900 }, `${MESA}#omsta`);
  await chooseLayer(page, "ingenieria");
  const nodes = mdx("omsta").architecture.nodes;
  const resting = nodes.find((entry) => !entry.decision)!;
  const decided = nodes.filter((entry) => entry.decision);
  const target = decided[decided.length - 1];
  const inspector = page.locator("#omsta").getByRole("region", { name: "Inspector del módulo" });
  const node = (id: string) => page.locator(`#omsta .holo-node[data-node-id="${id}"]`);

  // Apuntar un nodo lo previsualiza en el inspector. (El ratón se lleva por
  // coordenadas: con el movimiento encendido el holograma flota sin fin y
  // `hover()` esperaría para siempre a que el nodo se quedara quieto.)
  const restingBox = await node(resting.id).locator(".holo-node__box").boundingBox();
  if (!restingBox) throw new Error(`El nodo ${resting.id} no tiene caja`);
  await page.mouse.move(restingBox.x + restingBox.width / 2, restingBox.y + restingBox.height / 2);
  await expect(inspector.getByRole("heading", { level: 3 })).toHaveText(resting.label);

  /*
    Con el ratón quieto ahí, el teclado tiene que mandar: enfocar otro nodo lo
    elige y el inspector lee SU decisión (P12: «cada nodo con decisión la
    muestra al enfocar»). No es un caso rebuscado: a 375 px el scroll que
    provoca el foco deja un nodo bajo el ratón en reposo —el de la pestaña que
    se acaba de pulsar— y desde ahí la mesa se queda en ese nodo mientras el
    foco recorre los demás.
  */
  const focusedBox = node(target.id).locator(".holo-node__box");
  await focusedBox.focus();
  await expect(focusedBox).toHaveAttribute("aria-current", "true");
  await expect(inspector.getByRole("heading", { level: 3 })).toHaveText(target.label);
  await expect(inspector.locator("blockquote")).toHaveText(target.decision ?? "");
  // Y con las flechas igual: el inspector lee el nodo enfocado.
  await page.keyboard.press("ArrowUp");
  const arrived = page.locator("#omsta .holo-node:has(.holo-node__box:focus)");
  await expect(inspector.getByRole("heading", { level: 3 })).toHaveText((await arrived.locator(".holo-node__label").textContent()) ?? "");
});

test("P12 · en móvil la decisión se despliega bajo su nodo al enfocarlo", async ({ page }) => {
  await openTable(page, { width: 375, height: 812 }, `${MESA}#omsta`);
  await chooseLayer(page, "ingenieria");
  // El ratón, sobre la cabecera fija: si se quedara donde pulsó la pestaña,
  // el scroll que provoca cada foco le pondría un nodo debajo (ver el test
  // «el foco del teclado elige…»). Aquí se mide sólo el despliegue.
  await page.mouse.move(0, 0);
  const omsta = mdx("omsta");
  // En móvil no hay líneas (§15.2.6) ni inspector: la decisión va bajo el nodo.
  await expect(page.locator("#omsta svg.holo-diagram__lines")).toBeHidden();
  await expect(page.locator("#omsta .holo-inspector")).toBeHidden();
  for (const node of omsta.architecture.nodes.filter((entry) => entry.decision)) {
    const box = page.locator(`#omsta .holo-node[data-node-id="${node.id}"] .holo-node__box`);
    await box.focus();
    const decision = page.locator(`#${await box.getAttribute("aria-describedby")}`);
    await expect(decision, node.id).toHaveText(node.decision ?? "");
    // Desplegada de verdad, no el píxel del texto sólo para lectores de pantalla.
    await expect.poll(async () => (await decision.boundingBox())?.height ?? 0, node.id).toBeGreaterThan(16);
  }
  // La de un nodo no elegido vuelve a plegarse.
  const [firstDecided, secondDecided] = omsta.architecture.nodes.filter((entry) => entry.decision);
  const folded = page.locator(`#omsta .holo-node[data-node-id="${firstDecided.id}"] .holo-node__decision`);
  await page.locator(`#omsta .holo-node[data-node-id="${secondDecided.id}"] .holo-node__box`).focus();
  await expect.poll(async () => (await folded.boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
});
