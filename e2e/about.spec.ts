import { expect, test } from "@playwright/test";

test("Sobre mí: navbar, índice, visor por teclado y gustos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/es/sobre-mi?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Sobre mí.*Mi pequeño universo/,
  );
  await expect(page.locator(".site-header")).toBeVisible();
  const index = page.getByRole("navigation", {
    name: "Explora las seis constelaciones",
  });
  await expect(index.getByRole("link")).toHaveCount(6);
  await expect(
    index.getByRole("img", { name: "Jonás junto al mar" }),
  ).toBeVisible();
  await index.getByRole("link", { name: /Mi gente/ }).click();
  await expect(page).toHaveURL(/#gente$/);
  const progress = page.getByRole("navigation", {
    name: "Tu lugar en la historia",
  });
  await expect(
    progress.getByRole("link", { name: /Mi gente/ }),
  ).toHaveAttribute("aria-current", "location");
  const family = page.getByRole("link", {
    name: "Ampliar fotografía de mi familia",
  });
  await family.focus();
  await page.keyboard.press("Enter");
  const viewer = page.getByRole("dialog", { name: "Mi familia" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Cerrar ×" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(family).toBeFocused();
  await progress.getByRole("link", { name: /Lo que disfruto/ }).click();
  await page.getByText("Algunos nombres de mi música", { exact: true }).click();
  await expect(page.getByText(/Imagine Dragons · Coldplay/)).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/es\/sobre-mi$/,
  );
  expect(errors).toEqual([]);
});

test("Sobre mí: único control de movimiento y composición adaptable", async ({
  page,
}) => {
  await page.goto("/es/sobre-mi?no3d=1");
  const content = page.locator(".about-page");
  await expect(content).toHaveAttribute("data-about-motion", "off");
  await page
    .getByRole("button", { name: "Activar movimiento", exact: true })
    .click();
  await expect(content).toHaveAttribute("data-about-motion", "on");
  await expect(page.locator(".about-stars i").first()).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await page
    .getByRole("button", { name: "Desactivar movimiento", exact: true })
    .click();
  await expect(page.locator(".about-stars i").first()).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    // This is a scrolling document, not the viewport-locked System Map. Bring
    // each target into the reading area, clear of the site's fixed audio tray.
    const nodes = page.locator(".about-node");
    for (const node of await nodes.all()) {
      await node.evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      expect(
        await node.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            ),
          );
        }),
      ).toBe(true);
    }
  }
});

test("Sobre mí sin JavaScript: historia, fotos y navegación completas", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/sobre-mi?no3d=1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const index = page.getByRole("navigation", {
    name: "Explora las seis constelaciones",
  });
  await index.getByRole("link", { name: /Cómo soy/ }).click();
  await expect(page).toHaveURL(/#soy$/);
  await expect(page.getByText(/Soy testigo de Jehová/)).toBeVisible();
  const image = page.getByRole("link", {
    name: "Ampliar retrato junto al mar",
  });
  await expect(image).toHaveAttribute("href", /F28-1600\.webp$/);
  await image.click();
  await expect(page).toHaveURL(/F28-1600\.webp$/);
  await context.close();
});
