import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * LA MESA DE INGENIERÍA — `/es/proyectos` (docs/design/endurance-proyectos.md §11).
 *
 * P5  sin JavaScript: cinco proyectos, `:target`, la ficha de texto
 *     (`scripting: none`) y ningún enlace muerto.
 * P6  la ruta no crea contexto WebGL y la escena persistente no dibuja.
 * P7  sólo teclado: muelle → capa → nodo → decisión → «Explorar proyecto»,
 *     con el foco siempre en su sitio; hero → Endurance → OMSTA en dos (A20).
 * P8  375/768/1440 y las tres capas: sin desbordamiento, blancos de 44 px
 *     (con la excepción documentada de las filas del esquema) y el scroll gana.
 * P9  cada pantalla pintada sirve un archivo ≥ 1,2× su tamaño pintado.
 * P10 con el movimiento apagado: sin transición, sin encendido, sin cruce, y
 *     todo sigue operable.
 * P12 en Ingeniería el SVG tiene tantas líneas como aristas del MDX y cada
 *     decisión se muestra al enfocar su nodo (inspector en escritorio, bajo
 *     el nodo en móvil).
 *
 * Las cifras esperadas salen del MDX compilado por Velite (`.velite/`, que
 * `npm run build` regenera antes de construir), no de números escritos aquí:
 * si Jonás corrige una arquitectura, el test sigue midiendo lo mismo.
 */

const MESA = "/es/proyectos";
const PROJECT_IDS = ["omsta", "izaks-photos", "wikiverse", "network", "delicate"];
const LAYERS = ["resultado", "diseno", "ingenieria"] as const;

interface MdxProject {
  id: string;
  locale: string;
  slug: string;
  featuredImage: { alt: string; caption: string };
  gallery?: { alt: string; caption: string }[];
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
  await expect(page.locator(".table")).toHaveAttribute("data-enhanced", "true");
}

async function chooseLayer(page: Page, layer: (typeof LAYERS)[number]) {
  await page.locator(`[data-layer-tab="${layer}"]`).click();
  await expect(page.locator(".table")).toHaveAttribute("data-layer", layer);
  await settle(page);
}

test("P5 · sin JavaScript la mesa es el contenido: cinco proyectos, :target, ficha de texto y enlaces vivos", async ({ browser, baseURL, request }) => {
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

  // Todas las pantallas de los cinco proyectos, con su alt, están en el HTML.
  const alts = await page.locator(".holo-screen img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt") ?? ""));
  expect(alts).toEqual(PROJECT_IDS.flatMap((id) => [mdx(id).featuredImage, ...(mdx(id).gallery ?? [])].map((image) => image.alt)));

  // Sin hash se lee el primero, y su ficha de texto se pinta porque no hay
  // guion (`@media (scripting: none)`): pantallas y sistema con decisiones.
  await expect(page.locator("#omsta")).toBeVisible();
  for (const id of PROJECT_IDS.slice(1)) await expect(page.locator(`#${id}`)).toBeHidden();
  const omsta = mdx("omsta");
  const sheet = page.locator("#omsta .table-fallback");
  await expect(sheet, "la ficha sin JS no se pinta: ¿Chromium no casa `scripting: none` con javaScriptEnabled: false?").toBeVisible();
  await expect(sheet.locator("ol > li")).toHaveText([omsta.featuredImage, ...(omsta.gallery ?? [])].map((image) => image.caption));
  await expect(sheet.locator("dl dt")).toHaveCount(omsta.architecture.nodes.length);
  await expect(sheet.locator("dl dd")).toHaveCount(omsta.architecture.nodes.filter((node) => node.decision).length);
  // Los mandos que sólo sirven con guion no se enseñan.
  await expect(page.locator(".table-tabs")).toBeHidden();
  await expect(page.locator("#omsta .holo-note")).toBeHidden();

  // `#wikiverse` selecciona por :target desde el muelle, que es un enlace real.
  await page.locator('.table-dock a[href="#wikiverse"]').click();
  await expect(page).toHaveURL(/#wikiverse$/);
  await expect(page.locator("#wikiverse")).toBeVisible();
  await expect(page.locator("#omsta")).toBeHidden();
  await expect(page.locator("#wikiverse").getByRole("heading", { level: 2 })).toHaveText("Wiki Universe");
  await expect(page.locator("#wikiverse .table-fallback")).toBeVisible();
  await expect(page.locator("#wikiverse .table-fallback dl dt")).toHaveCount(mdx("wikiverse").architecture.nodes.length);

  // «Explorar proyecto» en cada sección, y ningún enlace interno muerto.
  const explore = await page.locator(".table-read a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  expect(explore.filter((href) => href.startsWith("/es/proyectos/")).sort()).toEqual(PROJECT_IDS.map((id) => `/es/proyectos/${mdx(id).slug}`).sort());
  const internal = await page.locator(".projects-page a[href^='/']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  for (const href of new Set(internal)) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
  await page.locator("#wikiverse").getByRole("link", { name: /Explorar proyecto/ }).click();
  await expect(page).toHaveURL(/\/es\/proyectos\/wikiverse$/);
  await context.close();
});

test("P6 · la ruta no crea contexto WebGL y la escena persistente duerme", async ({ page }) => {
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
  // El caso completo NO se cubre: es una página editorial con la escena detrás,
  // y es el MISMO canvas —Endurance cubre sólo su portada, no el mundo entero—.
  // (Ahí la escena no tiene por qué dibujar: la pose es la del mundo y un cuadro
  // quieto no se repinta; que vuelve a dibujar al descubrirse lo prueba
  // `miller.spec.ts` con el mismo molde.)
  await canvas.evaluate((node) => { node.setAttribute("data-persistence-marker", "same-canvas"); });
  await page.getByRole("link", { name: /Explorar proyecto/ }).first().click();
  await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "same-canvas");
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

  // El selector: flechas entre capas, el foco se queda en el selector.
  await page.getByRole("tab", { name: /Resultado/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const ingenieria = page.getByRole("tab", { name: /Ingeniería/ });
  await expect(ingenieria).toBeFocused();
  await expect(ingenieria).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".table")).toHaveAttribute("data-layer", "ingenieria");
  await expect(ingenieria).toHaveAttribute("aria-controls", "delicate-stage");

  // Tab: la salida al caso y, después, el módulo elegido del esquema. Las
  // pantallas no son parada: en Ingeniería van inert.
  const explore = section.getByRole("link", { name: /Explorar proyecto/ });
  await page.keyboard.press("Tab");
  await expect(explore).toBeFocused();
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

  // «Explorar proyecto» sigue a mano en cualquier capa: una tabulación atrás.
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
        Blancos: todo mando operable y visible de la mesa (muelle, selector,
        lectura, pantallas de Diseño, nota y nodos) mide ≥ 44 × 44 px.

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
        .map(({ el, box }) => `${el.className} «${el.textContent?.trim().slice(0, 24)}» ${Math.round(box.width)}×${Math.round(box.height)}`), desktopStage);
      expect(small, where).toEqual([]);
    }
  }
});

test("P9 · cada pantalla pintada sirve un archivo ≥ 1,2× su tamaño pintado", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await openTable(page, viewport);
    for (const layer of ["resultado", "diseno"] as const) {
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
  // Cero segundos en pantallas, líneas y tarjetas del sistema.
  const durations = await page.locator('.table-project[data-state="active"] :is(.holo-screen, .holo-line, .holo-card)').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transitionDuration));
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.filter((duration) => duration.split(",").some((part) => parseFloat(part) !== 0))).toEqual([]);
  // Sin encendido: ni la subida de las pantallas ni la de la lectura.
  const animated = await page.locator('.table-project[data-state="active"] :is(.holo-screen__frame, .table-read, .table-readout), .console__grid').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName));
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
});

test("P12 · en Ingeniería el SVG tiene una línea por arista del MDX y cada decisión se muestra al enfocar su nodo", async ({ page }) => {
  test.setTimeout(90_000);
  await openTable(page, { width: 1440, height: 900 }, `${MESA}#omsta`);
  await chooseLayer(page, "ingenieria");
  // El ratón, fuera del esquema: aquí se mide el foco; el choque entre el
  // foco y un ratón en reposo sobre un nodo tiene su propio test.
  await page.mouse.move(0, 0);
  const omsta = mdx("omsta");
  const lines = page.locator("#omsta svg.holo-diagram__lines path.holo-line");
  await expect(lines).toHaveCount(omsta.architecture.edges.length);
  await expect(page.locator("#omsta .holo-node")).toHaveCount(omsta.architecture.nodes.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute("data-shape")).filter((shape) => !["cross", "adjacent", "arc"].includes(shape ?? "")))).toEqual([]);
  // Trazadas: el guion de cada línea ha llegado a cero y se ven.
  expect(await lines.evaluateAll((paths) => paths.every((path) => parseFloat(getComputedStyle(path).strokeDashoffset) === 0))).toBe(true);
  await expect(page.locator("#omsta svg.holo-diagram__lines")).toBeVisible();

  // Cada nodo al enfocarse: el inspector lee su decisión (la misma de su
  // `aria-describedby`) o no cita ninguna, y se encienden SUS líneas.
  const inspector = page.locator("#omsta").getByRole("region", { name: "Inspector del módulo" });
  for (const node of omsta.architecture.nodes) {
    const box = page.locator(`#omsta .holo-node[data-node-id="${node.id}"] .holo-node__box`);
    await box.focus();
    await expect(page.locator(`#omsta .holo-node[data-node-id="${node.id}"]`)).toHaveAttribute("data-selected", "true");
    await expect(inspector.getByRole("heading", { level: 3 })).toHaveText(node.label);
    if (node.decision) {
      await expect(inspector.locator("blockquote"), node.id).toBeVisible();
      await expect(inspector.locator("blockquote"), node.id).toHaveText(node.decision);
      await expect(page.locator(`#${await box.getAttribute("aria-describedby")}`), node.id).toHaveText(node.decision);
    } else {
      await expect(inspector.locator("blockquote"), node.id).toHaveCount(0);
      await expect(box, node.id).not.toHaveAttribute("aria-describedby");
    }
    const touching = omsta.architecture.edges.filter(([from, to]) => from === node.id || to === node.id).length;
    await expect(page.locator("#omsta path.holo-line[data-on]"), node.id).toHaveCount(touching);
  }

  // Cambiar de proyecto rehace el esquema con SUS aristas, no las del anterior.
  const izaks = mdx("izaks-photos");
  await page.getByRole("navigation", { name: "Proyectos" }).getByRole("link", { name: /Izak/ }).click();
  await expect(page.locator("#izaks-photos svg.holo-diagram__lines path.holo-line")).toHaveCount(izaks.architecture.edges.length);
  await expect(page.locator("#izaks-photos .holo-node")).toHaveCount(izaks.architecture.nodes.length);
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
