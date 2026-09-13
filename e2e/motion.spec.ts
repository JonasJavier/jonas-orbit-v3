import { expect, test, type Page } from "@playwright/test";

/**
 * El interruptor único de movimiento: un icono en la bandeja inferior derecha,
 * presente en todas las rutas, que enciende y apaga TODO lo que se mueve. Por
 * defecto encendido; la elección se recuerda entre rutas y visitas; `?no3d=1`
 * sigue siendo la puerta documentada al perfil ligero.
 */

async function skyDrawsOverFrames(page: Page) {
  return page.evaluate(async () => {
    const state = window as unknown as { skyDraws: number };
    for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
    const before = state.skyDraws;
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state.skyDraws - before;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { skyDraws: number };
    state.skyDraws = 0;
    const original = CanvasRenderingContext2D.prototype.clearRect;
    Object.defineProperty(CanvasRenderingContext2D.prototype, "clearRect", { configurable: true, value: function (this: CanvasRenderingContext2D, ...args: number[]) {
      if (this.canvas.closest(".voyage-sky")) state.skyDraws++;
      return Reflect.apply(original, this, args);
    } });
  });
});

test("movimiento: encendido por defecto, un solo icono lo apaga todo y se recuerda entre rutas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/formacion");
  const toggle = page.getByRole("button", { name: "Desactivar movimiento", exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  // Incluso con reduced-motion del sistema: el dueño decidió que el defecto es encendido.
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveAttribute("data-sky-running", "true");
  await expect.poll(() => skyDrawsOverFrames(page)).toBeGreaterThan(0);
  // Ningún control propio en las páginas.
  await expect(page.getByRole("button", { name: /océano|vuelo|estrellas|animación 3D/ })).toHaveCount(0);

  await toggle.click();
  const off = page.getByRole("button", { name: "Activar movimiento", exact: true });
  await expect(off).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.locator(".miller-ocean canvas")).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveAttribute("data-sky-running", "false");
  expect(await skyDrawsOverFrames(page)).toBe(0);
  // Apagado, el CSS retira la animación entera (no la pausa).
  expect(await page.locator(".miller-proof .miller-currents__light").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  // La elección viaja con el visitante a la siguiente ruta.
  const menu = page.getByRole("button", { name: "Explorar", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Navegación de mundos" }).getByRole("link", { name: "Contacto", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/contacto$/);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.getByRole("region", { name: "Cabina de la Ranger" })).toHaveAttribute("data-motion", "off");
  await expect(page.locator(".ranger-view canvas")).toHaveCount(0);
  expect(await page.locator(".ranger-scope__sweep").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await expect(page.getByRole("region", { name: "Cabina de la Ranger" })).toHaveAttribute("data-motion", "on");
  await expect(page.locator(".ranger-view canvas")).toHaveCount(1);
});

test("movimiento: ?no3d=1 apaga el interruptor y la portada queda en mapa plano", async ({ page }) => {
  await page.goto("/es?no3d=1");
  await expect(page.getByRole("button", { name: "Activar movimiento", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.locator("html")).toHaveAttribute("data-scene", "flat");
  await expect(page.getByTestId("gargantua-canvas")).toHaveCount(0);
  await expect(page.locator(".hud__effects-toggle")).toHaveCount(0);
  await expect(page.locator(".scene-toggle")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar movimiento", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await expect(page.locator("html")).toHaveAttribute("data-effects-forced", "true");
});

test("movimiento: el icono es alcanzable con teclado en móvil y no tapa la banda sonora", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/es/formacion?no3d=1");
  const toggle = page.getByRole("button", { name: "Activar movimiento", exact: true });
  const box = await toggle.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const audio = await page.getByRole("button", { name: /música/ }).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(audio!.x + 1);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
});
