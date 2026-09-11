import { expect, test } from "@playwright/test";

const caption = ".edmunds-gallery__caption h2";

test("Edmunds: sectores, mosaico, imágenes reales y rutas", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/es/creatividad?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CreatividadOtra forma de mirar.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/creatividad$/);
  await expect(page.getByRole("button", { name: "Mosaico", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Diseño 12", exact: true }).click();
  const works = page.getByRole("link", { name: /^Ampliar:/ });
  await expect(works).toHaveCount(12);
  await expect(page.getByRole("region", { name: "Archivo visual" }).getByRole("status")).toHaveText("12 piezas en esta selección");
  await expect(page.getByRole("heading", { level: 2, name: "Diseño", exact: true })).toBeVisible();
  for (const art of await works.all()) {
    await art.scrollIntoViewIfNeeded();
    await expect.poll(() => art.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  const response = await request.get(await works.last().getAttribute("href") ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/webp");
  await page.getByRole("button", { name: "Todo 77" }).click();
  await expect(works).toHaveCount(77);
  // The mosaic groups the archive by sector, in the order of the journey.
  await expect(page.locator(".edmunds-group__head h2")).toHaveText(["Horizontes", "De cerca", "Criaturas", "Retratos", "Invierno", "Después del sol", "Diseño"]);
  const neighbours = page.getByRole("navigation", { name: "Destinos contiguos" });
  await expect(neighbours.locator("a").first()).toHaveAttribute("href", "/es/proyectos");
  await expect(neighbours.locator("a").last()).toHaveAttribute("href", "/es/experimentos");
  expect(errors).toEqual([]);
});

test("A15: visor modal, flechas, foco atrapado y devuelto con Escape", async ({ page }) => {
  await page.goto("/es/creatividad?no3d=1");
  const opener = page.getByRole("link", { name: "Ampliar: Aurora", exact: true });
  await opener.scrollIntoViewIfNeeded();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Visor de obras" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Cerrar", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Siguiente en el visor" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("figcaption strong")).toHaveText("Cuando cae el día");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("figcaption strong")).toHaveText("Aurora");
  await expect(dialog.locator(".edmunds-viewer__bar")).toContainText("06.01 · Después del sol · Fotografía");
  await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Cubierta 3D: perspectiva, avance, arrastre y carga acotada", async ({ page }) => {
  const loaded = new Set<string>();
  page.on("request", (request) => { if (/\/art\/edmunds\/.+webp/.test(request.url())) loaded.add(request.url()); });
  await page.goto("/es/creatividad");
  const stage = page.getByRole("region", { name: "Galería de obras" });
  await expect(page.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator('.edmunds-artwork[data-offset="0"] img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.locator(".edmunds-stage__space").evaluate((space) => getComputedStyle(space).perspective)).not.toBe("none");
  expect(await page.locator(".edmunds-artworks").evaluate((list) => getComputedStyle(list).transformStyle)).toBe("preserve-3d");
  // Seven works on the deck, the ambient copy of the active one and at most the
  // seven sector covers: never the archive, never a 1920 px file.
  expect(loaded.size).toBeLessThanOrEqual(16);
  expect([...loaded].some((url) => url.includes("-1920.webp"))).toBe(false);
  await expect(page.locator(".edmunds-hud__readouts")).toContainText("01 / 77");
  await stage.focus();
  await page.keyboard.press("End");
  await expect(page.locator(caption)).toHaveText("X Tecno");
  await expect(page.locator(".edmunds-hud__readouts")).toContainText("07.12");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(caption)).toHaveText("Entre montañas");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(caption)).toHaveText("El peso del silencio");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Ampliar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Cubierta 3D: una obra lateral se centra, la central abre, y la bitácora cambia de sector", async ({ page }) => {
  await page.goto("/es/creatividad");
  await page.locator('.edmunds-artwork[data-offset="1"] a').click();
  await expect(page.locator(caption)).toHaveText("El peso del silencio");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator('.edmunds-artwork[data-offset="0"] a')).toHaveAttribute("aria-current", "true");
  await page.locator('.edmunds-artwork[data-offset="0"] a').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const sectors = page.getByRole("navigation", { name: "Sectores del archivo" });
  await sectors.getByRole("button", { name: /Invierno/ }).click();
  await expect(page.locator(caption)).toHaveText("El bosque en blanco");
  await expect(page.locator(".edmunds-hud__readouts")).toContainText("01 / 12");
  await expect(page.getByRole("button", { name: "Invierno 12", exact: true })).toHaveAttribute("aria-pressed", "true");
  const track = page.getByRole("group", { name: "Posición en el archivo" });
  await expect(track.getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: "Todo 77" }).click();
  await expect(track.getByRole("button")).toHaveCount(7);
  await track.getByRole("button", { name: /Criaturas/ }).click();
  await expect(page.locator(caption)).toHaveText("Compartir el paisaje");
});

test("A14: un 404 en el visor permite reintentar y seguir explorando", async ({ page }) => {
  await page.route("**/art/edmunds/aurora-1920.webp", (route) => route.fulfill({ status: 404, body: "Not found" }));
  await page.goto("/es/creatividad?no3d=1");
  await page.getByRole("link", { name: "Ampliar: Aurora", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("La imagen no se ha podido cargar.")).toBeVisible();
  await dialog.getByRole("button", { name: "Reintentar" }).click();
  await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await dialog.getByRole("button", { name: "Siguiente en el visor" }).click();
  await expect(dialog.locator("figcaption strong")).toHaveText("Cuando cae el día");
});

test("Edmunds: reduced-motion conserva el archivo y evita transiciones", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/creatividad");
  await expect(page.getByRole("button", { name: "Mosaico" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /^Ampliar:/ })).toHaveCount(77);
  await page.getByRole("button", { name: "Galería 3D" }).click();
  expect(await page.locator(".edmunds-artwork").first().evaluate((art) => getComputedStyle(art).transitionDuration)).toBe("0s");
  await page.getByRole("button", { name: "Obra siguiente" }).click();
  await expect(page.locator(caption)).toHaveText("El peso del silencio");
});

test("Edmunds: todo el archivo es legible y enlazable sin JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  try {
    await page.goto("/es/creatividad");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Creatividad");
    const works = page.getByRole("link", { name: /^Ampliar:/ });
    await expect(works).toHaveCount(77);
    await expect(page.getByRole("button", { name: "Galería 3D" })).toHaveCount(0);
    const last = works.last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeVisible();
    await last.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/art\/edmunds\/diseno-x-tecno-1920.webp$/);
  } finally { await context.close(); }
});

for (const viewport of [{ width: 320, height: 740 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }]) {
  test(`Edmunds: sin desbordamiento a ${viewport.width}px en ambas vistas`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/es/creatividad?no3d=1");
    for (const mode of ["Galería 3D", "Mosaico"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
}

test("Edmunds: texto al 200 % conserva lectura y controles", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/es/creatividad?no3d=1");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  const heading = page.getByRole("heading", { level: 1 });
  expect(await heading.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Galería 3D", exact: true }).click();
  await page.getByRole("button", { name: "Obra siguiente" }).click();
  await page.getByRole("button", { name: "Ampliar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("Edmunds: touch permite pasar una obra sin abrir el visor", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await page.goto("/es/creatividad");
    const stage = page.getByRole("region", { name: "Galería de obras" });
    await stage.scrollIntoViewIfNeeded();
    const box = (await stage.boundingBox())!;
    const session = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 100, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(caption)).toHaveText("El peso del silencio");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } finally { await context.close(); }
});

test("Edmunds: el canvas persistente se conserva cubierto y vuelve al mapa", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addInitScript(() => localStorage.setItem("jonas-orbit:efectos-forzados", "true"));
  await page.goto("/es/creatividad");
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toHaveAttribute("data-covered", "true", { timeout: 30000 });
  await canvas.evaluate((node) => node.setAttribute("data-persistence-marker", "edmunds"));
  await page.getByRole("link", { name: "Jonás Orbit, inicio", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "edmunds");
});
