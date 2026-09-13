import { expect, test, type Page } from "@playwright/test";

async function flightDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { flightDraws: number };
    const before = state.flightDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.flightDraws - before;
  });
}

test.describe("Ranger · cabina de mando", () => {
  test("canales, HUD y formulario accesibles, sin desbordamiento en cuatro tamaños", async ({ page }) => {
    await page.goto("/es/contacto?no3d=1");
    for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const name of [/01 \/ CORREO/, /02 \/ WHATSAPP/, /03 \/ TELÉFONO/]) {
        const channel = page.getByRole("link", { name });
        await channel.scrollIntoViewIfNeeded();
        await expect(channel).toBeVisible();
        const bounds = await channel.boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    await expect(page.getByRole("region", { name: "Cabina de la Ranger" })).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
    await page.getByRole("link", { name: /01 \/ CORREO/ }).hover();
    await expect(page.locator(".ranger-readouts")).toContainText("01 · Correo");
    await page.getByRole("link", { name: "Escribir un mensaje" }).click();
    await expect(page).toHaveURL(/#transmision$/);
    await expect(page.getByRole("form", { name: "Enviar un mensaje a Jonás" })).toBeVisible();
    await page.getByRole("button", { name: /Crear una presencia digital/ }).click();
    await expect(page.getByLabel("Tipo de misión")).toHaveValue("presence");
    await expect(page.getByText(/Señal 1\/4/)).toBeVisible();
    await page.getByLabel("Nombre", { exact: true }).fill("Ada");
    await page.getByLabel("Correo", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Mensaje", { exact: true }).fill("Quiero construir una herramienta clara para el equipo.");
    await expect(page.getByText(/Señal 4\/4 · lista para transmitir/)).toBeVisible();
  });

  test("el vuelo pausa, reanuda y deja de dibujar en segundo plano o fuera de pantalla", async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as unknown as { flightDraws: number };
      state.flightDraws = 0;
      // El ventanal tiene su propio contexto WebGL2: se cuentan sus draws, no
      // los de la escena persistente, que duerme cubierta detrás de la Ranger.
      const original = WebGL2RenderingContext.prototype.drawArrays;
      Object.defineProperty(WebGL2RenderingContext.prototype, "drawArrays", { configurable: true, value: function (this: WebGL2RenderingContext, ...args: number[]) {
        if (this.canvas instanceof HTMLCanvasElement && this.canvas.closest(".ranger-view")) state.flightDraws++;
        return Reflect.apply(original, this, args);
      } });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/es/contacto");
    const pause = page.getByRole("button", { name: "Pausar vuelo" });
    await expect(pause).toBeVisible();
    await expect(page.getByRole("region", { name: "Cabina de la Ranger" })).toHaveAttribute("data-motion", "on");
    await expect.poll(() => flightDrawsOverFrames(page)).toBeGreaterThan(0);
    await pause.click();
    await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
    expect(await flightDrawsOverFrames(page)).toBe(0);
    await page.getByRole("button", { name: "Reanudar vuelo" }).click();
    // En móvil el panel vive bajo el ventanal: pulsar el interruptor lo saca
    // de pantalla, y fuera de pantalla no se dibuja. Se vuelve arriba a mirar.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => flightDrawsOverFrames(page)).toBeGreaterThan(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await flightDrawsOverFrames(page)).toBe(0);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => flightDrawsOverFrames(page)).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Abrir consola de transmisión" }).click();
    await expect(page).toHaveURL(/#transmision$/);
    // El ancla deja el borde del ventanal asomando bajo la cabecera; bajar
    // hasta la consola lo saca del todo y el vuelo tiene que detenerse.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await expect(page.locator(".ranger-view")).not.toBeInViewport();
    await expect.poll(() => flightDrawsOverFrames(page)).toBe(0);
  });

  test("reduced-motion deja la cabina quieta y el vuelo se activa sólo al pedirlo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es/contacto");
    const bridge = page.getByRole("region", { name: "Cabina de la Ranger" });
    await expect(bridge).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
    expect(await page.locator(".ranger-scope__sweep").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(page.locator(".ranger-readouts")).toContainText(/\d{2}:\d{2}/);
    const activate = page.getByRole("button", { name: "Activar vuelo" });
    await activate.focus();
    await page.keyboard.press("Enter");
    await expect(bridge).toHaveAttribute("data-motion", "on");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Pausar vuelo" })).toBeFocused();
  });

  test("sin JavaScript mantiene los tres canales, CV y contenido real", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    try {
      const page = await context.newPage();
      await page.goto("/es/contacto");
      await expect(page.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
      await expect(page.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
      await expect(page.getByRole("link", { name: /03 \/ TELÉFONO/ })).toHaveAttribute("href", "tel:+18498625049");
      await expect(page.getByRole("link", { name: /02 \/ WHATSAPP/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /CV español/ })).toBeVisible();
      await expect(page.getByText(/Para enviar el formulario necesitas JavaScript/)).toBeVisible();
      await expect(page.getByRole("button", { name: /vuelo/ })).toHaveCount(0);
      await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
      await expect(page.locator(".ranger-view__stars circle")).toHaveCount(170);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
  });
});
