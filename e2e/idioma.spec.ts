import { expect, test } from "@playwright/test";

/**
 * Los dos idiomas (2026-09-29): inglés por defecto en `/en`, español en `/es`.
 *
 * Cada página existe en los dos con su propia URL, el selector de la cabecera
 * lleva a la MISMA página en el otro idioma y la elección se recuerda para la
 * próxima entrada por `/`. Lo que aquí se comprueba es lo que un buscador y un
 * visitante verían: `lang`, `hreflang`, las rutas y el selector.
 */

/** La misma página en los dos idiomas. */
const PAIRS: readonly [string, string][] = [
  ["/en", "/es"],
  ["/en/about", "/es/sobre-mi"],
  ["/en/education", "/es/formacion"],
  ["/en/projects", "/es/proyectos"],
  ["/en/projects/omsta", "/es/proyectos/omsta"],
  ["/en/creativity", "/es/creatividad"],
  ["/en/experiments", "/es/experimentos"],
  ["/en/experiments/observatory/tesseract", "/es/experimentos/observatorio/tesseracto"],
  ["/en/contact", "/es/contacto"],
  ["/en/privacy", "/es/privacidad"],
];

test.describe("idiomas — inglés por defecto, español a un clic", () => {
  test("/ lleva al inglés, y al español si el visitante ya lo eligió", async ({ page, context }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);

    await context.addCookies([{ name: "jonas-orbit-lang", value: "es", url: "http://localhost:3210" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
  });

  for (const [en, es] of PAIRS) {
    test(`${en} y ${es} son la misma página: lang, canónica y hreflang cruzados`, async ({ request }) => {
      for (const [path, lang] of [
        [en, "en"],
        [es, "es"],
      ] as const) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        const html = await response.text();
        expect(html, path).toContain(`<html lang="${lang}"`);
        expect(html, path).toMatch(new RegExp(`<link rel="canonical" href="[^"]*${path}"`));
        expect(html, path).toMatch(new RegExp(`hrefLang="en" href="[^"]*${en}"`));
        expect(html, path).toMatch(new RegExp(`hrefLang="es" href="[^"]*${es}"`));
        expect(html, path).toMatch(new RegExp(`hrefLang="x-default" href="[^"]*${en}"`));
      }
    });
  }

  test("una ruta de un idioma no existe en el otro", async ({ request }) => {
    for (const path of ["/es/privacy", "/en/privacidad", "/en/proyectos", "/es/projects", "/fr", "/en/contact/gracias"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("el selector de la cabecera lleva a la misma página en el otro idioma y lo recuerda", async ({ page }) => {
    await page.goto("/en/projects/omsta");
    const header = page.locator(".site-header");
    const switcher = header.getByRole("navigation", { name: "Language" }).filter({ visible: true });
    await expect(switcher.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");

    await switcher.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      page.locator(".site-header").getByRole("navigation", { name: "Idioma" }).filter({ visible: true }).getByRole("link", { name: "Español" }),
    ).toHaveAttribute("aria-current", "true");

    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
  });

  test("la portada, sin cabecera, también ofrece el idioma", async ({ page }) => {
    await page.goto("/en");
    const switcher = page.locator(".language-switch--home");
    await expect(switcher).toBeVisible();
    await switcher.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("navigation", { name: "Destinos del Sistema Gargantúa" })).toBeAttached();
  });

  test("las páginas en inglés hablan inglés", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/My little universe/);
    await expect(page.getByRole("link", { name: "Education" }).first()).toHaveAttribute("href", "/en/education");

    await page.goto("/en/projects/omsta");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ERP and mobile app for a travel agency");
    await expect(page.getByRole("heading", { name: "Design decisions" })).toBeVisible();

    await page.goto("/en/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A short, transparent transmission.");
  });

  test("el formulario de contacto valida en el idioma de la página", async ({ page }) => {
    await page.goto("/en/contact");
    const send = page.getByRole("button", { name: "Send transmission" });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText("Please enter your name.")).toBeVisible();
    await expect(page.getByRole("link", { name: "privacy note" })).toHaveAttribute("href", "/en/privacy");
  });
});

test.describe("idiomas en el teléfono", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("el selector está en la barra, a la vista sin abrir el menú", async ({ page }) => {
    await page.goto("/en/education");
    const bar = page.locator(".site-header__bar");
    const switcher = bar.getByRole("navigation", { name: "Language" });
    await expect(switcher).toBeVisible();
    const box = await switcher.boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(375);
    await switcher.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es\/formacion$/);
  });

  test("en la portada no pisa la bandeja de movimiento y audio", async ({ page }) => {
    await page.goto("/en");
    const switcher = await page.locator(".language-switch--home").boundingBox();
    const tray = await page.locator(".system-tray").boundingBox();
    expect(switcher && tray).toBeTruthy();
    const overlaps =
      switcher!.x < tray!.x + tray!.width &&
      switcher!.x + switcher!.width > tray!.x &&
      switcher!.y < tray!.y + tray!.height &&
      switcher!.y + switcher!.height > tray!.y;
    expect(overlaps).toBe(false);
  });
});
