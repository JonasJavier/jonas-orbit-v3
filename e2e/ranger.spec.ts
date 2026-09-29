import { expect, test, type Page } from "@playwright/test";
import { skipWithoutWebGL2, withoutWebGL } from "./capability-fixtures";

async function flightDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { flightDraws: number };
    const before = state.flightDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.flightDraws - before;
  });
}

test.describe("Ranger · cabina de mando", () => {
  /*
    Solos pasan en segundos. Con la suite entera en paralelo comparten la CPU
    con los workers que dibujan WebGL por software (el vuelo de esta misma
    cabina, el Observatorio), y hasta un `evaluate` trivial se queda sin turno
    más de 30 s, también con `?no3d=1` y ningún contexto en la página. Es el
    mismo remedio que A29: el triple de presupuesto no relaja ninguna
    aserción, sólo deja de medir la carga de la máquina.
  */
  test.beforeEach(() => {
    test.slow();
  });

  test("canales, HUD y formulario accesibles, sin desbordamiento en cuatro tamaños", async ({ page }) => {
    await page.goto("/es/contacto?no3d=1");
    for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const name of [/01 \/ CORREO/, /02 \/ WHATSAPP/, /03 \/ LINKEDIN/]) {
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
    await expect(page.locator(".ranger-view")).toHaveAttribute("data-flight", "off");
    // El perfil ligero (`?no3d=1`) no crea contexto WebGL: vista fija en SVG.
    await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
    await page.getByRole("link", { name: /01 \/ CORREO/ }).hover();
    await expect(page.locator(".ranger-channels__tuned")).toContainText("Sintonizando 01 · Correo");
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

  test("el ventanal ocupa el viewport entero y su único botón lleva al formulario", async ({ page }) => {
    for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/es/contacto?no3d=1");
      const bridge = await page.getByRole("region", { name: "Cabina de la Ranger" }).boundingBox();
      const view = await page.locator(".ranger-view").boundingBox();
      expect(bridge!.y).toBeLessThanOrEqual(0);
      expect(bridge!.x).toBe(0);
      expect(bridge!.width).toBe(viewport.width);
      expect(Math.round(bridge!.y + bridge!.height)).toBeGreaterThanOrEqual(viewport.height);
      expect(Math.round(view!.height)).toBe(Math.round(bridge!.height));
      const form = await page.locator("#transmision").boundingBox();
      expect(Math.round(form!.y)).toBeGreaterThanOrEqual(viewport.height);
      await page.getByRole("link", { name: "Escribir un mensaje" }).click();
      // Aterriza en la consola: la misión y el formulario empiezan en pantalla.
      await expect(page.locator(".ranger-console")).toBeInViewport();
    }
  });

  test("el vuelo pausa, reanuda y deja de dibujar en segundo plano o fuera de pantalla", async ({ page }) => {
    await skipWithoutWebGL2(page);
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
    // `?no3d=0` es la petición explícita: esta suite dibuja con SwiftShader, y
    // sin pedirlo la cabina no vuela en una GPU por software (vista fija).
    await page.goto("/es/contacto?no3d=0");
    // El único interruptor: el icono de movimiento de la bandeja.
    const pause = page.getByRole("button", { name: "Desactivar movimiento", exact: true });
    await expect(pause).toBeVisible();
    await expect(page.getByRole("button", { name: /vuelo/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Cabina de la Ranger" })).toHaveAttribute("data-motion", "on");
    await expect.poll(() => flightDrawsOverFrames(page), { timeout: 15_000 }).toBeGreaterThan(0);
    await pause.click();
    // Apagado congela el último fotograma: el canvas se queda, los draws paran.
    await expect(page.locator(".ranger-view")).toHaveAttribute("data-flight", "off");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(1);
    expect(await flightDrawsOverFrames(page)).toBe(0);
    await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
    await expect.poll(() => flightDrawsOverFrames(page), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await flightDrawsOverFrames(page)).toBe(0);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => flightDrawsOverFrames(page), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Escribir un mensaje" }).click();
    await expect(page).toHaveURL(/#transmision$/);
    // Bajar hasta la consola saca el ventanal de la pantalla y el vuelo tiene
    // que detenerse.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await expect(page.locator(".ranger-view")).not.toBeInViewport();
    await expect.poll(() => flightDrawsOverFrames(page)).toBe(0);
  });

  test("sin aceleración gráfica el encendido por defecto no despega: vista fija y «Detenido»", async ({ page }) => {
    // El perfil se fija explícitamente: Firefox/WebKit pueden usar la GPU
    // real del host, mientras Chromium suele usar SwiftShader.
    await withoutWebGL(page);
    await page.goto("/es/contacto");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await expect(page.locator(".ranger-view")).toHaveAttribute("data-flight", "off");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
    await expect(page.locator(".ranger-readouts")).toContainText("Detenido");
  });

  test("el interruptor único apaga la cabina entera y la vuelve a encender por teclado", async ({ page }) => {
    await skipWithoutWebGL2(page);
    // reduced-motion del sistema ya no apaga nada: el defecto es encendido.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es/contacto?no3d=0");
    const bridge = page.getByRole("region", { name: "Cabina de la Ranger" });
    await expect(bridge).toHaveAttribute("data-motion", "on");
    await expect(page.locator(".ranger-view canvas")).toHaveCount(1);
    await expect(page.locator(".ranger-readouts")).toContainText(/\d{2}:\d{2}/);
    const toggle = page.getByRole("button", { name: "Desactivar movimiento", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(bridge).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".ranger-view")).toHaveAttribute("data-flight", "off");
    await expect(page.locator(".ranger-readouts")).toContainText("Detenido");
    expect(await page.locator(".ranger-scope__sweep").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(page.getByRole("button", { name: "Activar movimiento", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(bridge).toHaveAttribute("data-motion", "on");
    await expect(page.locator(".ranger-view")).toHaveAttribute("data-flight", "on");
    await expect(page.locator(".ranger-readouts")).toContainText("En travesía");
    // Con reduced-motion del sistema el radar gira igual: el interruptor manda.
    expect(await page.locator(".ranger-scope__sweep").evaluate((el) => getComputedStyle(el).animationDuration)).toBe("5s");
  });

  test("sin JavaScript mantiene los tres canales, CV y contenido real", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    try {
      const page = await context.newPage();
      await page.goto("/es/contacto");
      await expect(page.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
      await expect(page.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
      await expect(page.getByRole("link", { name: /03 \/ LINKEDIN/ })).toHaveAttribute("href", /linkedin\.com\/in\//);
      await expect(page.getByRole("link", { name: /02 \/ WHATSAPP/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /CV español/ })).toBeVisible();
      await expect(page.getByText(/Para enviar el formulario necesitas JavaScript/)).toBeVisible();
      await expect(page.getByRole("button", { name: /vuelo/ })).toHaveCount(0);
      await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
      await expect(page.locator(".ranger-view__tunnel path")).toHaveCount(150);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
  });
});
