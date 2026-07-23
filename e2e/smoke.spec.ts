import { expect, test } from "@playwright/test";

test.describe("smoke — página narrativa mínima", () => {
  test("/ redirige a /es", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/es$/);
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
    const anchors = [
      "historia",
      "formacion",
      "desarrollo",
      "proyectos",
      "creatividad",
      "laboratorio",
      "contacto",
    ];
    for (const anchor of anchors) {
      await expect(page.locator(`section#${anchor}`)).toHaveCount(1);
    }
  });

  test("el CTA 'Ver proyectos' lleva a la sección Endurance", async ({
    page,
  }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Ver proyectos" }).click();
    await expect(page).toHaveURL(/#proyectos$/);
    await expect(
      page.locator("section#proyectos").getByRole("heading", { level: 2 }),
    ).toBeInViewport();
  });

  test("una ruta desconocida devuelve 404", async ({ page }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(404);
  });
});
