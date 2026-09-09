import { expect, test, type Page } from "@playwright/test";

async function oceanDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { oceanDraws: number };
    const before = state.oceanDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.oceanDraws - before;
  });
}

test("Miller: filtros, teclado, documentos y destinos", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/es/formacion?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Formación.*sin punto final/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/formacion$/);
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const neighbours = page.getByRole("navigation", { name: "Destinos contiguos" });
  await expect(neighbours.locator("a").first()).toHaveAttribute("href", "/es/sobre-mi");
  await neighbours.locator("a").last().click();
  await expect(page).toHaveURL(/\/es\/proyectos$/);
  expect(errors).toEqual([]);
});

test("Miller: el océano pausa, reanuda y deja de dibujar fuera de pantalla o en segundo plano", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { oceanDraws: number };
    state.oceanDraws = 0;
    const original = CanvasRenderingContext2D.prototype.drawImage;
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", { configurable: true, value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (this.canvas.closest(".miller-ocean")) state.oceanDraws++;
      return Reflect.apply(original, this, args);
    } });
  });
  await page.goto("/es/formacion");
  const pause = page.getByRole("button", { name: "Pausar océano" });
  await expect(pause).toBeVisible();
  await expect.poll(() => oceanDrawsOverFrames(page)).toBeGreaterThan(0);
  await pause.click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  expect(await oceanDrawsOverFrames(page)).toBe(0);
  await page.getByRole("button", { name: "Reanudar océano" }).click();
  await expect.poll(() => oceanDrawsOverFrames(page)).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await oceanDrawsOverFrames(page)).toBe(0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => oceanDrawsOverFrames(page)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page.locator(".miller-ocean")).not.toBeInViewport();
  await expect.poll(() => oceanDrawsOverFrames(page)).toBe(0);
});

test("Miller: reduced-motion conserva la imagen y el contenido sin animación", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/formacion");
  await expect(page.locator(".miller-ocean img")).toBeVisible();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pausar océano" })).toHaveCount(0);
  await page.getByRole("button", { name: "Activar océano" }).click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Pausar océano" }).click();
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await expect(page.getByText(/Cursé ocho meses/)).toBeVisible();
  await expect(page.locator('.miller-archive a[href$=".pdf"]')).toHaveCount(23);
});

test("Miller: formación y certificados funcionan sin JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/es/formacion");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Formación");
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page.getByRole("link", { name: /Ver certificado: Accesibilidad/ })).toBeVisible();
  await expect(page.locator('.miller-archive a[href$=".pdf"]')).toHaveCount(23);
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await context.close();
});

test("Miller: la escena persistente duerme detrás del océano y vuelve al mapa", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addInitScript(() => {
    localStorage.setItem("jonas-orbit:efectos-forzados", "true");
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
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.systemDraws - before;
  });
  expect(whileCovered).toBe(0);
  await page.getByRole("link", { name: "Jonás Orbit, inicio", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "same-canvas");
  await expect.poll(() => page.evaluate(() => (window as unknown as { systemDraws: number }).systemDraws)).toBeGreaterThan(0);
});
