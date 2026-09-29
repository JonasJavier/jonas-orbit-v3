import { expect, test } from "@playwright/test";

/**
 * Auditoría móvil (2026-09-29): lo que un teléfono tiene que poder hacer en
 * cualquier página y que un escritorio nunca comprueba. Pantalla táctil de
 * 390 × 844 con movimiento reducido, que es el perfil más rápido de montar.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("la bandeja se retira al bajar leyendo y vuelve al subir", async ({ page }) => {
  await page.goto("/es/formacion");
  const tray = page.locator(".system-tray");
  await expect(tray).toBeInViewport();

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.evaluate(() => window.scrollTo(0, 1400));
  await expect(tray).toHaveAttribute("data-retired", "true");
  await expect(tray).not.toBeInViewport();

  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(tray).not.toHaveAttribute("data-retired", "true");
  await expect(tray).toBeInViewport();
});

test("ninguna página desborda a lo ancho en un teléfono", async ({ page }) => {
  for (const path of [
    "/es/sobre-mi",
    "/es/formacion",
    "/es/proyectos",
    "/es/creatividad",
    "/es/experimentos",
    "/es/contacto",
    "/es/privacidad",
  ]) {
    await page.goto(path);
    const width = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(width, path).toBeLessThanOrEqual(390);
  }
});

test("los mandos de la galería no se apagan en táctil", async ({ page }) => {
  // El modo cine atenúa filtros y flechas tras unos segundos quietos; con un
  // dedo no hay puntero que los despierte, así que en táctil no se aplica.
  await page.goto("/es/creatividad");
  const filters = page.locator(".edmunds-filters");
  await filters.scrollIntoViewIfNeeded();
  await page.waitForTimeout(4200);
  const opacity = await filters.evaluate((node) => {
    let value = 1;
    for (let el: Element | null = node; el; el = el.parentElement) {
      value *= Number(getComputedStyle(el).opacity);
    }
    return value;
  });
  expect(opacity).toBeGreaterThan(0.9);
});
