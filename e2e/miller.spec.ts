import { expect, test, type Page } from "@playwright/test";
import { skipWithoutWebGL2 } from "./capability-fixtures";

/**
 * Seis fotogramas bastan para saber si algo dibuja o está parado, y la espera
 * es larga: el WebGL de WebKit sin GPU (CI) tarda ~0,4 s por fotograma con
 * densidad 2, y doce fotogramas agotaban el sondeo antes de la primera lectura.
 */
const SLOW_GL = { timeout: 20_000 };

async function oceanDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { oceanDraws: number };
    const before = state.oceanDraws;
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    return state.oceanDraws - before;
  });
}

test("navbar: el menú móvil permite explorar, cerrar con Escape y volver al contenido", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/es/formacion?no3d=1");
  const menu = page.getByRole("button", { name: "Explorar", exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  const nav = page.getByRole("navigation", { name: "Navegación de mundos" });
  await expect(nav.getByRole("link")).toHaveCount(6);
  await expect(nav.getByRole("link", { name: "Formación", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page).toHaveURL(/#certificados$/);
  await menu.click();
  await nav.getByRole("link", { name: "Proyectos", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/proyectos$/);
  await expect(page.getByRole("button", { name: "Explorar", exact: true })).toHaveAttribute("aria-expanded", "false");
});

test("Miller: filtros, teclado, documentos y destinos", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/es/formacion?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Formación.*sin punto final/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/formacion$/);
  const inProgress = page.getByRole("list", { name: "Aprendizaje en curso" });
  await expect(inProgress.getByRole("listitem")).toHaveCount(3);
  await expect(inProgress.getByText("En curso")).toHaveCount(3);
  await expect(inProgress.getByRole("link")).toHaveCount(0);
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page).toHaveURL(/#certificados$/);
  const code = page.getByRole("button", { name: "Código", exact: true });
  await code.focus();
  await page.keyboard.press("Enter");
  await expect(code).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("4 documentos", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver certificado: CS50x/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver certificado: UX Designer/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Todo", exact: true }).click();
  await expect(page.getByRole("link", { name: /Ver certificado:/ })).toHaveCount(6);
  const more = page.locator(".miller-archive-more > summary");
  await expect(more).toContainText("Ver los 23 documentos");
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /Ver certificado: Accesibilidad/ })).toBeVisible();
  const links = await page.locator('.miller-archive a[href$=".pdf"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  expect(links).toHaveLength(23);
  const previews = page.locator(".miller-certificate__preview img");
  await expect(previews).toHaveCount(23);
  for (const preview of await previews.all()) {
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  for (const href of links) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()["content-type"], href).toContain("application/pdf");
  }
  await more.click();
  await expect(page.getByRole("link", { name: /Ver certificado:/ })).toHaveCount(6);
  await expect(more).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const neighbours = page.getByRole("navigation", { name: "Destinos contiguos" });
  await expect(neighbours.locator("a").first()).toHaveAttribute("href", "/es/sobre-mi");
  /*
    En WebKit de CI (GPU por software) este clic fallaba a ratos de dos
    maneras: el desplazamiento de Playwright no terminaba nunca —el documento
    desplaza con `scroll-behavior: smooth`— o el clic entraba y la travesía,
    que navega por temporizador, no llegaba en los 5 s por defecto. El enlace
    se trae a la vista al instante y la llegada tiene el margen de la
    travesía en un runner lento.
  */
  const next = neighbours.locator("a").last();
  await next.evaluate((link) => link.scrollIntoView({ block: "center", behavior: "instant" }));
  await next.click();
  await expect(page).toHaveURL(/\/es\/proyectos$/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("Miller: el océano pausa, reanuda y deja de dibujar fuera de pantalla o en segundo plano", async ({ page }) => {
  await skipWithoutWebGL2(page);
  await page.addInitScript(() => {
    const state = window as unknown as { oceanDraws: number };
    state.oceanDraws = 0;
    // El océano vive en su propio contexto WebGL2: se cuentan sus draws, no los
    // de la escena persistente, que duerme cubierta detrás de Miller.
    const original = WebGL2RenderingContext.prototype.drawArrays;
    Object.defineProperty(WebGL2RenderingContext.prototype, "drawArrays", { configurable: true, value: function (this: WebGL2RenderingContext, ...args: number[]) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.closest(".miller-ocean")) state.oceanDraws++;
      return Reflect.apply(original, this, args);
    } });
  });
  await page.goto("/es/formacion");
  // El único interruptor: el icono de movimiento de la bandeja.
  const pause = page.getByRole("button", { name: "Desactivar movimiento", exact: true });
  await expect(pause).toBeVisible();
  await expect(page.getByRole("button", { name: /océano/ })).toHaveCount(0);
  await expect.poll(() => oceanDrawsOverFrames(page), SLOW_GL).toBeGreaterThan(0);
  await pause.click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  expect(await oceanDrawsOverFrames(page)).toBe(0);
  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await expect.poll(() => oceanDrawsOverFrames(page), SLOW_GL).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await oceanDrawsOverFrames(page)).toBe(0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => oceanDrawsOverFrames(page), SLOW_GL).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page.locator(".miller-ocean")).not.toBeInViewport();
  await expect.poll(() => oceanDrawsOverFrames(page), SLOW_GL).toBe(0);
});

test("Miller: con el movimiento apagado conserva la imagen y el contenido sin animación", async ({ page }) => {
  await skipWithoutWebGL2(page);
  // reduced-motion del sistema ya no apaga nada por sí solo: el defecto es
  // encendido y el icono de la bandeja es el consentimiento, en los dos sentidos.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/formacion");
  await expect(page.locator(".miller-ocean img")).toBeVisible();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await expect(page.getByText(/Cursé ocho meses/)).toBeVisible();
  await expect(page.locator('.miller-archive a[href$=".pdf"]')).toHaveCount(23);
  expect(await page.locator(".miller-proof .miller-currents__light").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("Miller: las corrientes comparten pausa con el océano y duermen fuera de vista", async ({ page }) => {
  await page.goto("/es/formacion?no3d=1");
  const currents = page.locator(".miller-proof .miller-currents__light");
  // Con el movimiento apagado el CSS retira la animación entera (`animation: none`), no la pausa.
  const state = () => currents.evaluate((element) => { const style = getComputedStyle(element); return style.animationName === "none" ? "paused" : style.animationPlayState; });
  await expect.poll(state).toBe("paused");
  await expect(page.getByRole("button", { name: /corrientes|océano/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect.poll(state).toBe("running");
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect.poll(state).toBe("paused");
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect.poll(state).toBe("running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(state).toBe("paused");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(state).toBe("running");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(state).toBe("paused");
  await expect(page.getByRole("button", { name: "Desactivar movimiento", exact: true })).toBeVisible();
});

test("Miller: formación y certificados funcionan sin JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "reduce", viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/es/formacion");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Formación");
  await expect(page.getByRole("list", { name: "Aprendizaje en curso" }).getByRole("listitem")).toHaveCount(3);
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page.getByRole("link", { name: /Ver certificado:/ })).toHaveCount(6);
  await page.locator(".miller-archive-more > summary").click();
  await expect(page.getByRole("link", { name: /Ver certificado: Accesibilidad/ })).toBeVisible();
  await expect(page.locator('.miller-archive a[href$=".pdf"]')).toHaveCount(23);
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await context.close();
});

test("Miller: la escena persistente duerme detrás del océano y vuelve al mapa", async ({ page }) => {
  await skipWithoutWebGL2(page);
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addInitScript(() => {
    // Encendido a propósito: sólo eso monta la escena sobre una GPU por software.
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
    const state = window as unknown as { systemDraws: number };
    state.systemDraws = 0;
    for (const name of ["drawArrays", "drawElements"] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      // The overloads differ, but forwarding the native arguments preserves both.
      Object.defineProperty(WebGL2RenderingContext.prototype, name, { configurable: true, value: function (this: WebGL2RenderingContext, ...args: number[]) {
        if (this.canvas instanceof HTMLCanvasElement && this.canvas.classList.contains("system-canvas")) state.systemDraws++;
        return Reflect.apply(original, this, args);
      } });
    }
  });
  await page.goto("/es/formacion");
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toHaveAttribute("data-covered", "true", { timeout: 30000 });
  await canvas.evaluate((node) => { node.setAttribute("data-persistence-marker", "same-canvas"); });
  const whileCovered = await page.evaluate(async () => {
    const state = window as unknown as { systemDraws: number };
    const before = state.systemDraws;
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    return state.systemDraws - before;
  });
  expect(whileCovered).toBe(0);
  await page.getByRole("link", { name: "Jonás Orbit, inicio", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "same-canvas");
  await expect.poll(() => page.evaluate(() => (window as unknown as { systemDraws: number }).systemDraws)).toBeGreaterThan(0);
});
