import { expect, test } from "@playwright/test";

const chapters = [
  "mis-raices",
  "mi-gente",
  "como-soy",
  "lo-que-disfruto",
  "mi-camino",
  "lo-que-sueno",
];
const openPage = async (page: import("@playwright/test").Page, hash = "") => {
  await page.goto(`/es/sobre-mi?no3d=1${hash}`);
  await expect(page.locator(".about-page")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
};
const current = (page: import("@playwright/test").Page) =>
  page.locator(".about-chapter:visible");
const navLink = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`.about-journey-nav a[href="#${id}"]`);

test("hero cerrado, seis estados, foco, visor por teclado y carruseles", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPage(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Sobre mí.*Mi pequeño universo/,
  );
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(current(page)).toHaveCount(0);
  await expect(page.locator(".about-journey-nav")).toBeHidden();
  await expect(page.locator(".about-node")).toHaveCount(6);
  const people = page.locator('.about-node[href="#mi-gente"]');
  await people.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#mi-gente$/);
  await expect(current(page)).toHaveCount(1);
  await expect(page.locator("#people-title")).toBeFocused();
  await expect(navLink(page, "mi-gente")).toHaveAttribute(
    "aria-current",
    "location",
  );
  const family = page.getByRole("link", {
    name: "Ampliar fotografía de mi familia",
  });
  await family.focus();
  await page.keyboard.press("Enter");
  const viewer = page.getByRole("dialog", { name: "Mi familia" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Cerrar ×" })).toBeFocused();
  await page.keyboard.press("Tab");
  // The native modal may move Tab to browser chrome, never to the inert page.
  expect(
    await page.evaluate(
      () =>
        document.activeElement === document.body ||
        !!document.activeElement?.closest("dialog"),
    ),
  ).toBe(true);
  await page.keyboard.press("Shift+Tab");
  // Firefox returns to the dialog itself, Chromium to its close button. Both
  // keep focus inside the native modal, never in the inert background.
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(family).toBeFocused();
  for (const id of chapters) {
    await navLink(page, id).click();
    await expect(current(page)).toHaveCount(1);
    await expect(current(page)).toHaveAttribute("id", id);
    await expect(current(page).locator("h2").first()).toBeFocused();
    await expect(navLink(page, id)).toHaveAttribute("aria-current", "location");
    const top = await current(page).evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(top).toBeGreaterThanOrEqual(120);
    expect(top).toBeLessThan(170);
  }
  await navLink(page, "lo-que-disfruto").click();
  await expect(page.locator(".about-taste details")).toHaveCount(0);
  await expect(page.locator("#about-shelf-music > li")).toHaveCount(18);
  await expect(page.locator(".about-shelf button")).toHaveCount(0);
  // A keyboard user gets an ordinary scroller: the drift and the copy leave.
  const music = page.locator('.about-shelf[data-group="music"]');
  await page.locator("#about-shelf-music a").first().focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
  await expect(music.locator(".about-marquee")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(music.locator(".about-shelf-copy")).toBeHidden();
  await expect(page.locator("#about-shelf-music li:nth-child(9) a")).toBeFocused();
  const viewport = music.locator(".about-shelf-viewport");
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  expect(
    await viewport.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const focus = document.activeElement!.getBoundingClientRect();
      return focus.left >= box.left - 1 && focus.right <= box.right + 1;
    }),
  ).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/es\/sobre-mi$/,
  );
  expect(errors).toEqual([]);
});

test("enlaces directos, recarga, atrás/adelante y hash desconocido", async ({
  page,
}) => {
  for (const id of chapters) {
    await openPage(page, `#${id}`);
    await expect(current(page)).toHaveCount(1);
    await expect(current(page)).toHaveAttribute("id", id);
  }
  await page.reload();
  await expect(current(page)).toHaveAttribute("id", "lo-que-sueno");
  await openPage(page);
  await page.locator('.about-node[href="#mi-gente"]').click();
  await navLink(page, "como-soy").click();
  await page.goBack();
  await expect(current(page)).toHaveAttribute("id", "mi-gente");
  await page.goBack();
  await expect(current(page)).toHaveCount(0);
  await expect(page.locator(".about-journey-nav")).toBeHidden();
  await page.goForward();
  await expect(current(page)).toHaveAttribute("id", "mi-gente");
  await page.goForward();
  await expect(current(page)).toHaveAttribute("id", "como-soy");
  await page.locator('.about-ending a[href="#constelacion"]').click();
  await expect(current(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await openPage(page, "#desconocido");
  await expect(current(page)).toHaveCount(0);
});

test("cintas automáticas: avanzan con reduced-motion, pausa al pasar y interruptor global", async ({
  page,
}) => {
  // The owner browses with reduced motion: the switch is the consent.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "#lo-que-disfruto");
  await page
    .getByRole("button", { name: "Activar movimiento", exact: true })
    .click();
  const shelf = page.locator('.about-shelf[data-group="music"]');
  const marquee = shelf.locator(".about-marquee");
  const x = () =>
    marquee.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).m41,
    );
  // Headless Chromium only advances animations while something paints.
  const settle = async (ms: number) => {
    for (let t = 0; t < ms; t += 250) {
      await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
      await page.waitForTimeout(250);
    }
  };
  await shelf.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.mouse.move(0, 0);
  await expect(marquee).toHaveCSS("animation-iteration-count", "infinite");
  await expect(shelf.locator(".about-shelf-copy")).toBeVisible();
  const start = await x();
  await settle(1500);
  expect(await x()).toBeLessThan(start - 20);
  await expect(
    page.locator('.about-shelf[data-group="stories"] .about-marquee'),
  ).toHaveCSS("animation-direction", "reverse");
  await shelf.hover();
  const hovered = await x();
  await settle(1500);
  expect(await x()).toBeCloseTo(hovered, 0);
  await page.mouse.move(0, 0);
  await page
    .getByRole("button", { name: "Desactivar movimiento", exact: true })
    .click();
  await expect(marquee).toHaveCSS("animation-name", "none");
  await expect(shelf.locator(".about-shelf-copy")).toBeHidden();
  await expect(shelf.locator(".about-shelf-viewport")).toHaveCSS(
    "overflow-x",
    "auto",
  );
});

test("transición discreta, selección rápida y reduced-motion incluso con interruptor encendido", async ({
  page,
}) => {
  await openPage(page, "#mi-gente");
  await page
    .getByRole("button", { name: "Activar movimiento", exact: true })
    .click();
  await navLink(page, "como-soy").click();
  await expect(current(page)).toHaveAttribute("id", "como-soy");
  await navLink(page, "mi-camino").click();
  await navLink(page, "mis-raices").click();
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute("id", "mis-raices");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navLink(page, "lo-que-sueno").click();
  await expect(current(page)).toHaveAttribute("id", "lo-que-sueno");
  expect(await current(page).evaluate((el) => el.getAnimations().length)).toBe(
    0,
  );
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page
    .getByRole("button", { name: "Desactivar movimiento", exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await navLink(page, "como-soy").click();
  expect(await current(page).evaluate((el) => el.getAnimations().length)).toBe(
    0,
  );
});

test("composición: desktop completo, tablet, móvil y blancos alcanzables", async ({
  page,
}) => {
  await openPage(page);
  for (const viewport of [
    { width: 1440, height: 860 },
    { width: 1536, height: 864 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    for (const node of await page.locator(".about-node").all()) {
      const box = (await node.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      if (viewport.width > 900) {
        expect(box.y).toBeGreaterThanOrEqual(67);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 40);
      } else
        await node.evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      expect(
        await node.evaluate((el) => {
          const b = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
          );
        }),
      ).toBe(true);
    }
  }
});

test("fotos inactivas diferidas y foto del equipo retirada", async ({
  page,
  request,
}) => {
  const images: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") images.push(request.url());
  });
  await openPage(page);
  await page
    .locator(".about-node img")
    .last()
    .evaluate((img: HTMLImageElement) => img.decode());
  expect(images.some((url) => /F04-|F15-|F20-|gustos\//.test(url))).toBe(false);
  expect((await request.get("/images/sobre-mi/F13-1600.webp")).status()).toBe(
    404,
  );
  const response = await request.get("/es/sobre-mi");
  const html = await response.text();
  for (const id of chapters) expect(html).toContain(`id="${id}"`);
  expect(html).toContain("Predicar desde joven");
  await page.locator('.about-node[href="#mi-gente"]').click();
  await page.locator('a[data-photo="F04"]').scrollIntoViewIfNeeded();
  await expect.poll(() => images.some((url) => /F04-/.test(url))).toBe(true);
});

test("sin JavaScript: selector, un solo capítulo, hashes y fotos reales", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/es/sobre-mi?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(current(page)).toHaveCount(0);
  await expect(page.locator(".about-journey-nav")).toBeHidden();
  await page.locator('.about-node[href="#como-soy"]').click();
  await expect(current(page)).toHaveCount(1);
  await expect(
    page.getByText(/Mi fe ocupa un lugar importante/),
  ).toBeVisible();
  await navLink(page, "lo-que-disfruto").click();
  await expect(current(page)).toHaveAttribute("id", "lo-que-disfruto");
  await expect(page.locator("#about-shelf-stories")).toBeVisible();
  await expect(page.locator("#about-shelf-stories")).toContainText(
    "Hunter × Hunter",
  );
  await page.goBack();
  await expect(current(page)).toHaveAttribute("id", "como-soy");
  await page
    .getByRole("link", { name: "Ampliar retrato junto al mar" })
    .click();
  await expect(page).toHaveURL(/F28-1600\.webp$/);
  await page.goto("/es/sobre-mi#mi-camino");
  await expect(current(page)).toHaveAttribute("id", "mi-camino");
  await context.close();
});
