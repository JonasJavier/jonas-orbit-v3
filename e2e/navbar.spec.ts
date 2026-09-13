import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`navbar: cielo discreto, pausa y preferencias a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/es/formacion?no3d=0");
    const header = page.getByRole("banner");
    const sky = page.locator(".voyage-sky");
    const animationState = () => sky.evaluate((element) => getComputedStyle(element, "::before").animationPlayState);
    await expect(header).toHaveAttribute("data-sky-running", "true");
    const box = await header.boundingBox();
    expect(box!.y).toBe(0);
    expect(box!.height).toBe(width < 1081 ? 63 : 67);
    if (width < 1081) await page.getByRole("button", { name: "Explorar", exact: true }).click();
    await page.getByRole("button", { name: "Pausar estrellas", exact: true }).click();
    await expect.poll(animationState).toBe("paused");
    await page.getByRole("button", { name: "Reanudar estrellas", exact: true }).click();
    await expect.poll(animationState).toBe("running");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(animationState).toBe("paused");
    await page.evaluate(() => {
      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(animationState).toBe("running");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(header).toHaveAttribute("data-sky-running", "false");
    expect(await sky.evaluate((element) => getComputedStyle(element, "::before").animationName)).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/es/formacion?no3d=1");
    await expect(header).toHaveAttribute("data-sky-running", "false");
    await expect(page.getByRole("button", { name: "Pausar estrellas", exact: true })).toBeHidden();
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 812, height: 375 },
  { width: 1024, height: 768 },
  { width: 1080, height: 768 },
  { width: 1081, height: 768 },
  { width: 1280, height: 800 },
  { width: 1281, height: 800 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
]) {
  test(`navbar: destinos alcanzables a ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/es/formacion?no3d=1");
    const frame = await page.getByRole("banner").boundingBox();
    expect(frame!.x).toBe(0);
    expect(frame!.width).toBe(viewport.width);
    const hero = page.locator(".miller-hero");
    const before = await hero.boundingBox();
    const menu = page.getByRole("button", { name: "Explorar", exact: true });
    if (await menu.isVisible()) {
      await menu.click();
      const after = await hero.boundingBox();
      expect(after!.y).toBeCloseTo(before!.y, 0);
    }
    const nav = page.getByRole("navigation", { name: "Navegación de mundos" });
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(6);
    for (const link of [...await links.all(), page.getByRole("link", { name: "Volver al mapa", exact: true })]) {
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(await link.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("navbar: una sola fila sobre el océano y accesos de contenido disponibles", async ({ page }) => {
  await page.goto("/es/formacion?no3d=1");
  await expect(page.getByRole("navigation", { name: "En esta página" })).toHaveCount(0);
  const header = await page.getByRole("banner").boundingBox();
  const ocean = await page.locator(".miller-ocean").boundingBox();
  expect(header!.height).toBeLessThanOrEqual(80);
  expect(ocean!.y).toBeLessThanOrEqual(header!.y);
  await page.getByRole("link", { name: "Ver certificados", exact: true }).click();
  await expect(page).toHaveURL(/#certificados$/);
});

test("navbar: salir con Tab cierra el menú y deja visible el foco", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/es/formacion?no3d=1");
  await page.getByRole("button", { name: "Explorar", exact: true }).click();
  const back = page.getByRole("link", { name: "Volver al mapa", exact: true });
  await back.focus();
  await page.keyboard.press("Tab");
  expect(await page.locator("#main-content").evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(page.getByRole("button", { name: "Explorar", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("navigation", { name: "Navegación de mundos" })).toBeHidden();
});

test("navbar: la línea del destino viaja entre rutas y el CV se descarga desde la barra", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/formacion?no3d=1");
  const destinations = page.locator(".voyage-destinations");
  await expect(destinations).toHaveAttribute("data-marker", "ready");
  const before = await destinations.evaluate((el) => ({ x: parseFloat(el.style.getPropertyValue("--marker-x")), w: parseFloat(el.style.getPropertyValue("--marker-w")), accent: el.style.getPropertyValue("--marker-accent") }));
  expect(before.w).toBeGreaterThan(40);
  expect(before.accent).toBe("#55d9ff");
  // El marcador medido sustituye a la línea por enlace, y no tapa el centro de ningún destino.
  const nav = page.getByRole("navigation", { name: "Navegación de mundos" });
  await expect.poll(() => nav.getByRole("link", { name: "Formación", exact: true }).evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("0");
  await nav.getByRole("link", { name: "Proyectos", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/proyectos$/);
  await expect(destinations).toHaveAttribute("data-marker", "travel");
  await expect.poll(() => destinations.evaluate((el) => parseFloat(el.style.getPropertyValue("--marker-x")))).toBeGreaterThan(before.x + 40);
  expect(await destinations.evaluate((el) => el.style.getPropertyValue("--marker-accent"))).toBe("#f0bc72");
  const cv = page.getByRole("link", { name: "Descargar CV (PDF)", exact: true });
  await expect(cv).toBeVisible();
  await expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
  await expect(cv).toHaveAttribute("download", "");
  const box = await cv.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("navbar: con reduced-motion la línea no viaja y el CV sigue en el menú móvil", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/formacion?no3d=1");
  await page.getByRole("button", { name: "Explorar", exact: true }).click();
  const cv = page.getByRole("link", { name: "Descargar CV (PDF)", exact: true });
  await expect(cv).toBeVisible();
  expect((await cv.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("navigation", { name: "Navegación de mundos" }).getByRole("link", { name: "Contacto", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/contacto$/);
  await expect(page.locator(".voyage-destinations")).toHaveAttribute("data-marker", "ready");
});

test("Miller: el hero ofrece la descarga del CV junto a recorrido y certificados", async ({ page }) => {
  await page.goto("/es/formacion?no3d=1");
  const cv = page.locator(".miller-hero__actions").getByRole("link", { name: "Descargar CV", exact: true });
  await expect(cv).toBeVisible();
  await expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
  await expect(cv).toHaveAttribute("download", "");
});
