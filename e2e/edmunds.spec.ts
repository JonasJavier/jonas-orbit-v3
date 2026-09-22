import { expect, test } from "@playwright/test";

const caption = ".edmunds-gallery__caption h2";
const counter = ".edmunds-gallery__caption > span";

test("Edmunds: cabecera, sectores, mosaico, imágenes reales y rutas", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/es/creatividad?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creatividad");
  await expect(page.getByText("Otra forma de mirar.")).toBeVisible();
  await expect(page.getByText(/El código es una parte de mí/)).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/creatividad$/);
  await expect(page.getByRole("button", { name: "Mosaico", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Diseño", exact: true }).click();
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
  await page.getByRole("button", { name: "Todo", exact: true }).click();
  await expect(works).toHaveCount(90);
  // The mosaic groups the archive by sector, in the order of the journey, with
  // nothing but the sector's name as a label.
  await expect(page.locator(".edmunds-group__label")).toHaveText(["Diseño", "Horizontes", "De cerca", "Criaturas", "Retratos", "Invierno", "Después del sol"]);
  await expect(page.getByText("Ejercicios personales.")).toHaveCount(0);
  // Y lo reparte en filas justificadas: cada fila llega al canto derecho y
  // todas las obras de una fila miden lo mismo de alto. Un solo píxel de
  // holgura ya sería el hueco que las columnas dejaban a puñados.
  const mosaic = await page.evaluate(() => {
    let slack = 0;
    let uneven = 0;
    let rows = 0;
    for (const list of document.querySelectorAll(".edmunds-gallery[data-view='grid'] .edmunds-artworks")) {
      const edge = list.getBoundingClientRect().right;
      const lines = new Map<number, HTMLElement[]>();
      for (const work of list.querySelectorAll<HTMLElement>(".edmunds-artwork")) {
        const top = Math.round(work.getBoundingClientRect().top);
        lines.set(top, [...(lines.get(top) ?? []), work]);
      }
      for (const line of lines.values()) {
        rows += 1;
        slack = Math.max(slack, edge - Math.max(...line.map((work) => work.getBoundingClientRect().right)));
        const heights = line.map((work) => work.querySelector("img")!.getBoundingClientRect().height);
        uneven = Math.max(uneven, Math.max(...heights) - Math.min(...heights));
      }
    }
    return { rows, slack, uneven, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(mosaic.rows).toBeGreaterThan(7);
  expect(mosaic.slack).toBeLessThan(1.5);
  expect(mosaic.uneven).toBeLessThan(1.5);
  expect(mosaic.overflow).toBeLessThanOrEqual(0);
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
  await expect(dialog.locator("figcaption")).toHaveText("Fuego de campamento");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("figcaption")).toHaveText("Aurora");
  await expect(dialog.locator(".edmunds-viewer__bar")).toContainText("Después del sol");
  await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Cubierta 3D: pantalla completa propia, perspectiva, avance, arrastre y carga acotada", async ({ page }) => {
  const loaded = new Set<string>();
  page.on("request", (request) => { if (/\/art\/edmunds\/.+webp/.test(request.url())) loaded.add(request.url()); });
  await page.goto("/es/creatividad");
  const stage = page.getByRole("region", { name: "Galería de obras" });
  await expect(page.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator('.edmunds-artwork[data-offset="0"] img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.locator(".edmunds-stage__space").evaluate((space) => getComputedStyle(space).perspective)).not.toBe("none");
  expect(await page.locator(".edmunds-artworks").evaluate((list) => getComputedStyle(list).transformStyle)).toBe("preserve-3d");
  // Night sky: the auroras move on their own, and the deck asks for a file
  // larger than the pixels it paints — never a 1:1 WebP, which reads soft.
  expect(await page.locator(".edmunds-deck__aurora").first().evaluate((aurora) => getComputedStyle(aurora).animationName)).toContain("edmunds-aurora");
  const served = await page.locator('.edmunds-artwork[data-offset="0"] img').evaluate((image: HTMLImageElement) => ({ natural: image.naturalWidth, painted: image.getBoundingClientRect().width * devicePixelRatio, src: image.currentSrc }));
  expect(served.natural).toBeGreaterThanOrEqual(served.painted * 1.2);
  // The deck is a viewport of its own below the heading; the anchor lands on it
  // exactly under the sticky navigation bar.
  const viewport = page.viewportSize()!;
  const deck = (await page.locator(".edmunds-gallery").boundingBox())!;
  expect(deck.height).toBeGreaterThanOrEqual(viewport.height - 70);
  await page.getByRole("link", { name: /Entrar en la galería/ }).click();
  await expect.poll(async () => Math.round((await page.locator(".edmunds-gallery").boundingBox())!.y)).toBeLessThanOrEqual(70);
  // Seven works on the deck and the ambient copy of the active one: never the
  // archive, never a 1920 px file.
  expect(loaded.size).toBeLessThanOrEqual(9);
  expect([...loaded].some((url) => url.includes("-1920.webp"))).toBe(false);
  await expect(page.locator(counter)).toHaveText("Diseño · 01 / 90");
  await stage.focus();
  await page.keyboard.press("End");
  await expect(page.locator(caption)).toHaveText("Camino al anochecer");
  await expect(page.locator(counter)).toHaveText("Después del sol · 90 / 90");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(caption)).toHaveText("Fantasía");
  await page.keyboard.press("PageDown");
  await expect(page.locator(caption)).toHaveText("Entre montañas");
  await page.keyboard.press("Home");
  await expect(page.locator(caption)).toHaveText("Fantasía");
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5, { steps: 8 });
  // While the hand is down the ring turns with it, in positions: the works
  // are partway between two rest poses, not just shifted sideways.
  expect(await stage.evaluate((node) => node.dataset.dragging)).toBe("true");
  await expect.poll(() => stage.evaluate((node) => parseFloat(node.style.getPropertyValue("--drag")))).toBeLessThan(-0.25);
  const midway = await page.locator('.edmunds-artwork[data-offset="1"]').evaluate((art) => new DOMMatrix(getComputedStyle(art).transform).m41);
  const rest = await page.locator('.edmunds-artwork[data-offset="1"]').evaluate((art) => { const stage = art.closest(".edmunds-stage") as HTMLElement; const saved = stage.style.getPropertyValue("--drag"); stage.style.setProperty("--drag", "0"); const x = new DOMMatrix(getComputedStyle(art).transform).m41; stage.style.setProperty("--drag", saved); return x; });
  expect(midway).toBeLessThan(rest - 60);
  // A hand that pauses before letting go carries no flick: exactly one work.
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.locator(caption)).toHaveText("Hoy se come");
  expect(await stage.evaluate((node) => node.dataset.dragging)).toBe("false");
  // Release: the ring eases home from where the hand left it, as ONE number.
  await expect.poll(() => stage.evaluate((node) => Math.abs(parseFloat(getComputedStyle(node).getPropertyValue("--drag")))), { timeout: 3000 }).toBeLessThan(0.01);
  // The previous light stays under the new one until the crossfade ends.
  await page.getByRole("button", { name: "Obra siguiente" }).click();
  await expect(page.locator(".edmunds-deck__ambient")).toHaveCount(2);
  await expect(page.locator(".edmunds-deck__ambient")).toHaveCount(1, { timeout: 4000 });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Ampliar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Cubierta 3D: una obra lateral se centra, la central abre, y el filtro cambia de sector", async ({ page }) => {
  await page.goto("/es/creatividad");
  await page.locator('.edmunds-artwork[data-offset="1"] a').click();
  await expect(page.locator(caption)).toHaveText("Hoy se come");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator('.edmunds-artwork[data-offset="0"] a')).toHaveAttribute("aria-current", "true");
  await page.locator('.edmunds-artwork[data-offset="0"] a').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Invierno", exact: true }).click();
  await expect(page.locator(caption)).toHaveText("Túnel de hielo");
  await expect(page.locator(counter)).toHaveText("Invierno · 01 / 14");
  await page.getByRole("button", { name: "Todo", exact: true }).click();
  await expect(page.locator(counter)).toHaveText("Diseño · 01 / 90");
});

test("Cubierta 3D: modo cine atenúa los controles en reposo y los devuelve al mover el puntero", async ({ page }) => {
  await page.goto("/es/creatividad");
  const gallery = page.locator(".edmunds-gallery");
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute("data-idle", "false");
  await expect(gallery).toHaveAttribute("data-idle", "true", { timeout: 8000 });
  // The fade takes 1.6 s; the attribute flips first.
  await expect.poll(() => page.locator(".edmunds-top").evaluate((top) => Number(getComputedStyle(top).opacity)), { timeout: 4000 }).toBeLessThan(0.5);
  const box = (await gallery.boundingBox())!;
  const viewport = page.viewportSize()!;
  await page.mouse.move(box.x + box.width / 2, Math.min(box.y + box.height / 2, viewport.height - 40));
  await expect(gallery).toHaveAttribute("data-idle", "false");
  await expect.poll(() => page.locator(".edmunds-top").evaluate((top) => Number(getComputedStyle(top).opacity))).toBe(1);
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
  await expect(dialog.locator("figcaption")).toHaveText("Fuego de campamento");
});

test("Edmunds: con reduced-motion del sistema, las flechas giran el anillo como el arrastre", async ({ page }) => {
  // El movimiento lo decide UN interruptor, no el sistema operativo. La regla
  // general de `prefers-reduced-motion` de globals.css aplasta con
  // `!important` la duración de toda transición, y la cubierta entera se mueve
  // con UNA: por eso el arrastre —escrituras directas de `--drag`, sin
  // transición— seguía perfecto y las flechas daban un corte seco.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/creatividad");
  const stage = page.locator(".edmunds-stage");
  await expect(stage).toBeVisible();
  expect(await stage.evaluate((node) => getComputedStyle(node).transitionDuration)).toBe("0.95s");
  // Las cuatro vías pasan por `go()`: flecha, tecla, salto de sector y centrar
  // una obra lateral. Cada una deja UNA transición de 950 ms sobre `--drag`.
  const turn = await stage.evaluate((node) => {
    const press = (label: string) => document.querySelector<HTMLButtonElement>(`.edmunds-gallery__foot button[aria-label="${label}"]`)!.click();
    const read = () => {
      const animation = node.getAnimations().find((item) => (item as CSSTransition).transitionProperty === "--drag") as CSSTransition | undefined;
      const effect = animation?.effect as KeyframeEffect | undefined;
      return effect ? { duration: effect.getComputedTiming().duration, keyframes: effect.getKeyframes().map((frame) => (frame as unknown as Record<string, unknown>)["--drag"]) } : null;
    };
    press("Obra siguiente");
    const next = read();
    press("Obra anterior");
    return { next, previous: read() };
  });
  expect(turn.next).toEqual({ duration: 950, keyframes: ["1", "0"] });
  expect(turn.previous).toEqual({ duration: 950, keyframes: ["-1", "0"] });
  // Y el anillo llega a su sitio: `--drag` vuelve a cero, como al soltar.
  await expect.poll(() => stage.evaluate((node) => Math.abs(parseFloat(getComputedStyle(node).getPropertyValue("--drag")))), { timeout: 3000 }).toBeLessThan(0.01);
  // La misma regla dejaba sin movimiento el resto de la cubierta: el cielo, la
  // obra que entra y el paralaje. Se restauran uno a uno porque no hay forma de
  // decir «vuelve a lo que escribió el autor» por encima de un `!important`.
  const deck = await page.evaluate(() => {
    const read = (selector: string) => {
      const style = getComputedStyle(document.querySelector(selector)!);
      return `${style.animationDuration} / ${style.animationIterationCount}`;
    };
    return {
      aurora: read(".edmunds-deck__aurora"),
      dust: read(".edmunds-deck__dust"),
      bright: read(".edmunds-deck__stars--bright"),
      entering: getComputedStyle(document.querySelector(".edmunds-artwork figure")!).animationDuration,
      parallax: getComputedStyle(document.querySelector(".edmunds-deck")!).transitionDuration,
    };
  });
  expect(deck).toEqual({
    aurora: "26s / infinite",
    dust: "48s / infinite",
    bright: "5.5s / infinite",
    entering: "0.9s",
    parallax: "0.45s",
  });
  // Y las dos capas de profundidad usan el mosaico propio de la cubierta, no el
  // de la navbar. La tercera —`--bright`— no: son doce estrellas en degradados,
  // cada una con su centelleo.
  const tiles = await page.locator(".edmunds-deck__stars:not(.edmunds-deck__stars--bright)").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundImage));
  expect(tiles).toHaveLength(2);
  expect(tiles.every((image) => image.includes("edmunds-night-stars.svg"))).toBe(true);
});

test("Edmunds: con el movimiento apagado conserva el archivo, evita transiciones y nunca atenúa los controles", async ({ page }) => {
  // reduced-motion del sistema ya no decide: el icono único de movimiento sí.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/creatividad");
  await page.getByRole("button", { name: "Desactivar movimiento", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mosaico" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /^Ampliar:/ })).toHaveCount(90);
  await page.getByRole("button", { name: "Galería 3D" }).click();
  expect(await page.locator(".edmunds-stage").evaluate((stage) => getComputedStyle(stage).transitionDuration)).toBe("0s");
  expect(await page.locator(".edmunds-deck__aurora").first().evaluate((aurora) => getComputedStyle(aurora).animationName)).toBe("none");
  await page.getByRole("button", { name: "Obra siguiente" }).click();
  await expect(page.locator(caption)).toHaveText("Hoy se come");
  await page.waitForTimeout(4200);
  await expect(page.locator(".edmunds-gallery")).toHaveAttribute("data-idle", "false");
});

test("Edmunds: todo el archivo es legible y enlazable sin JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  try {
    await page.goto("/es/creatividad");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Creatividad");
    const works = page.getByRole("link", { name: /^Ampliar:/ });
    await expect(works).toHaveCount(90);
    await expect(page.getByRole("button", { name: "Galería 3D" })).toHaveCount(0);
    const last = works.last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeVisible();
    await last.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/art\/edmunds\/camino-al-anochecer-1920.webp$/);
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
      await expect(page.getByText("Otra forma de mirar.")).toBeVisible();
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
    await expect(page.locator(caption)).toHaveText("Hoy se come");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } finally { await context.close(); }
});

test("Edmunds: el canvas persistente se conserva cubierto y vuelve al mapa", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  // Encendido a propósito: sólo eso monta la escena sobre una GPU por software.
  await page.addInitScript(() => localStorage.setItem("jonas-orbit:reducir-efectos", "false"));
  await page.goto("/es/creatividad");
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toHaveAttribute("data-covered", "true", { timeout: 30000 });
  await canvas.evaluate((node) => node.setAttribute("data-persistence-marker", "edmunds"));
  await page.getByRole("link", { name: "Jonás Orbit, inicio", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-covered", "false");
  await expect(canvas).toHaveAttribute("data-persistence-marker", "edmunds");
});
