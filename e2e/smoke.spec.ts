import { expect, test } from "@playwright/test";

/** Anclas localizadas de las 7 secciones en ES (orden narrativo). */
const ANCHORS = [
  "historia",
  "formacion",
  "desarrollo",
  "proyectos",
  "creatividad",
  "laboratorio",
  "contacto",
] as const;

test.describe("smoke — página narrativa mínima", () => {
  test("A19 · / redirige a /es con un único salto correcto", async ({
    page,
  }) => {
    const response = await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    // La respuesta final es 200 en /es.
    expect(response?.status()).toBe(200);
    // Exactamente un salto de redirección, y es un 3xx (307 hoy; tolera 308).
    const from = response?.request().redirectedFrom();
    expect(from, "debe existir un redirect desde /").not.toBeNull();
    expect(from?.redirectedFrom() ?? null).toBeNull();
    const fromStatus = (await from?.response())?.status();
    expect([307, 308]).toContain(fromStatus);
  });

  test("/es muestra el hero con los dos CTAs", async ({ page }) => {
    await page.goto("/es");
    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver proyectos" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Trabajemos juntos" }),
    ).toBeVisible();
  });

  test("/es contiene las 7 secciones de mundo ancladas", async ({ page }) => {
    await page.goto("/es");
    for (const anchor of ANCHORS) {
      await expect(page.locator(`section#${anchor}`)).toHaveCount(1);
    }
  });

  test("A20 · el CTA 'Ver proyectos' lleva a la sección Endurance", async ({
    page,
  }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Ver proyectos" }).click();
    await expect(page).toHaveURL(/#proyectos$/);
    await expect(
      page.locator("section#proyectos").getByRole("heading", { level: 2 }),
    ).toBeInViewport();
  });

  test("A21 · el CTA 'Trabajemos juntos' lleva a Ranger (#contacto)", async ({
    page,
  }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Trabajemos juntos" }).click();
    await expect(page).toHaveURL(/#contacto$/);
    await expect(page.locator("section#contacto")).toBeInViewport();
  });

  test("A23 · deep link /es#proyectos aterriza en la sección", async ({
    page,
  }) => {
    await page.goto("/es#proyectos");
    await expect(page.locator("section#proyectos")).toBeInViewport();
  });

  test("A29 · se puede llegar a Ranger solo con teclado", async ({ page }) => {
    await page.goto("/es");
    const cta = page.getByRole("link", { name: "Trabajemos juntos" });
    // Tab acotado hasta enfocar el CTA (robusto ante focusables intermedios).
    for (
      let i = 0;
      i < 12 && !(await cta.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(cta).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contacto$/);
    await expect(page.locator("section#contacto")).toBeInViewport();
  });

  test("una ruta desconocida devuelve 404", async ({ page }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(404);
  });
});

test.describe("A28 · prefers-reduced-motion — paridad de contenido", () => {
  test("el contenido íntegro está presente sin movimiento", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es");
    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    for (const anchor of ANCHORS) {
      await expect(page.locator(`section#${anchor}`)).toHaveCount(1);
    }
    // Las anclas siguen funcionando con salto inmediato.
    await page.goto("/es#contacto");
    await expect(page.locator("section#contacto")).toBeInViewport();
  });
});
