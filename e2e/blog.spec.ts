import { expect, test } from "@playwright/test";

/**
 * El blog (2026-10-01): sección propia en `/en/blog` y `/es/blog`, fuera de los
 * seis destinos, con su enlace en la cabecera y un cielo opaco con la escena
 * dormida detrás. Las dos URL de la primera entrada, que vivió un día bajo
 * Experimentos, redirigen a su sitio nuevo.
 */

test.describe("blog", () => {
  test("la cabecera lleva al blog y lo marca; el índice lista las entradas", async ({ page }) => {
    await page.goto("/es/proyectos");
    const blogLink = page.locator(".voyage-blog-link");
    await expect(blogLink).toHaveAttribute("href", "/es/blog");
    await expect(blogLink).not.toHaveAttribute("aria-current", "page");

    await page.goto("/es/blog");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lo que aprendo construyendo.");
    await expect(page.locator(".voyage-blog-link")).toHaveAttribute("aria-current", "page");
    const posts = page.locator(".blog-card h3 a");
    await expect(posts).toHaveCount(6);
    for (const href of await posts.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      expect(href).toMatch(/^\/es\/blog\/[a-z0-9-]+$/);
    }
  });

  test("una entrada tiene índice con anclas reales, autor y salida a servicios", async ({ page }) => {
    await page.goto("/en/blog/4d-tesseract-in-three-js");
    await expect(page).toHaveTitle(/4D Tesseract in Three\.js/);
    const toc = page.getByRole("navigation", { name: "In this post" });
    const anchors = await toc.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    expect(anchors.length).toBeGreaterThan(5);
    for (const anchor of anchors) {
      await expect(page.locator(`h2${anchor}`)).toHaveCount(1);
    }
    await expect(page.locator(".post__author").getByRole("link", { name: /See services/ })).toHaveAttribute(
      "href",
      "/en/contact/services",
    );
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.join("\n")).toContain('"BlogPosting"');
  });

  test("la dirección vieja de la primera entrada redirige al blog", async ({ request }) => {
    for (const [from, to] of [
      ["/es/experimentos/como-hice-un-agujero-negro-en-webgl", "/es/blog/como-hice-un-agujero-negro-en-webgl"],
      ["/en/experiments/how-i-built-a-black-hole-in-webgl", "/en/blog/how-i-built-a-black-hole-in-webgl"],
    ]) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(308);
      expect(response.headers().location, from).toBe(to);
    }
  });

  test("el cielo del blog tapa la escena, que duerme", async ({ page }) => {
    await page.goto("/en/blog");
    await expect(page.locator(".blog-sky")).toHaveCSS("position", "fixed");
    const persistent = page.getByTestId("gargantua-canvas");
    if (await persistent.count()) {
      await expect(persistent).toHaveAttribute("data-covered", "true", { timeout: 30000 });
    }
  });

  test("Contacto ofrece los servicios desde el hero", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.locator(".ranger-hud__actions").getByRole("link", { name: /See services/ })).toHaveAttribute(
      "href",
      "/en/contact/services",
    );
  });
});
