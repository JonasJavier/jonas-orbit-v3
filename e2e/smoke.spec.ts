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

  test("/es muestra los CTAs del hero y el CV descargable", async ({ page }) => {
    await page.goto("/es");
    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver proyectos" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Trabajemos juntos" }),
    ).toBeVisible();
    const cv = page.getByRole("link", { name: "Descargar CV" });
    await expect(cv).toBeVisible();
    await expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
    await expect(cv).toHaveAttribute("download", "");
  });

  test("/es contiene las 7 secciones de mundo ancladas", async ({ page }) => {
    await page.goto("/es");
    for (const anchor of ANCHORS) {
      await expect(page.locator(`section#${anchor}`)).toHaveCount(1);
    }
  });

  test("A20 · hero → caso OMSTA requiere como máximo dos interacciones", async ({
    page,
  }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Ver proyectos" }).click();
    await expect(page).toHaveURL(/#proyectos$/);
    await expect(
      page.locator("section#proyectos").getByRole("heading", { level: 2 }),
    ).toBeInViewport();
    await page.getByRole("link", { name: "Abrir caso completo" }).click();
    await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /OMSTA — ERP para una agencia de viajes/,
      }),
    ).toBeVisible();
  });

  test("A21 · el CTA 'Trabajemos juntos' lleva a Ranger (#contacto)", async ({
    page,
  }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Trabajemos juntos" }).click();
    await expect(page).toHaveURL(/#contacto$/);
    await expect(page.locator("section#contacto")).toBeInViewport();
  });

  test("A25 · Ranger envía una transmisión completa y confirma recepción", async ({
    page,
  }) => {
    await page.goto("/es#contacto");
    const ranger = page.locator("section#contacto");
    await ranger.getByLabel("Nombre").fill("Ada Lovelace");
    await ranger.getByLabel("Correo").fill("ada@example.com");
    await ranger.getByLabel("Tipo de misión").selectOption("product");
    await ranger
      .getByLabel("Mensaje")
      .fill("Quiero construir una herramienta clara para nuestro equipo.");
    await ranger.getByLabel(/He leído la nota de privacidad/).check();

    const submit = ranger.getByRole("button", { name: "Enviar transmisión" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page).toHaveURL(/\/es\/contacto\/gracias$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Tu señal llegó completa." }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("A26 · conserva la transmisión ante 500 y permite reintentar", async ({
    page,
  }) => {
    let postCount = 0;
    await page.route("**/api/contact", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      postCount += 1;
      if (postCount === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, code: "delivery" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/es#contacto");
    const ranger = page.locator("section#contacto");
    await ranger.getByLabel("Nombre").fill("Grace Hopper");
    await ranger.getByLabel("Correo").fill("grace@example.com");
    await ranger.getByLabel("Tipo de misión").selectOption("system");
    await ranger
      .getByLabel("Mensaje")
      .fill("Necesitamos mejorar un sistema interno y reducir pasos manuales.");
    await ranger.getByLabel(/He leído la nota de privacidad/).check();
    const submit = ranger.getByRole("button", { name: "Enviar transmisión" });
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(ranger.getByText(/Tus datos siguen aquí/)).toBeVisible();
    await expect(ranger.getByLabel("Nombre")).toHaveValue("Grace Hopper");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(/\/es\/contacto\/gracias$/);
    expect(postCount).toBe(2);
  });

  test("A31 · Ranger ofrece ambos CV y mantiene ES como descarga principal", async ({
    page,
  }) => {
    await page.goto("/es#contacto");
    const ranger = page.locator("section#contacto");
    await expect(ranger.getByRole("link", { name: /CV español/ })).toHaveAttribute(
      "href",
      "/cv/jonas-javier-cv-es.pdf",
    );
    await expect(ranger.getByRole("link", { name: /CV English/ })).toHaveAttribute(
      "href",
      "/cv/jonas-javier-cv-en-ats.pdf",
    );
  });

  test("A23 · deep link /es#proyectos aterriza en la sección", async ({
    page,
  }) => {
    await page.goto("/es#proyectos");
    await expect(page.locator("section#proyectos")).toBeInViewport();
    await expect(
      page
        .getByRole("navigation", { name: "Navegación de mundos" })
        .getByRole("link", { name: "Proyectos" }),
    ).toHaveAttribute("aria-current", "location");
  });

  test("A22 · una selección explícita sincroniza scroll, hash y mundo activo", async ({
    page,
  }) => {
    await page.goto("/es");
    const navigation = page.getByRole("navigation", {
      name: "Navegación de mundos",
    });
    const projectsLink = navigation.getByRole("link", { name: "Proyectos" });

    await projectsLink.click();

    await expect(page).toHaveURL(/#proyectos$/);
    await expect(page.locator("section#proyectos")).toBeInViewport();
    await expect(projectsLink).toHaveAttribute("aria-current", "location");
    await expect(navigation).toHaveAttribute("data-active-world", "endurance");
  });

  test("A24 · solo la navegación explícita apila historial", async ({ page }) => {
    await page.goto("/es");
    const navigation = page.getByRole("navigation", {
      name: "Navegación de mundos",
    });

    await navigation.getByRole("link", { name: "Historia" }).click();
    await expect(page).toHaveURL(/#historia$/);
    await navigation.getByRole("link", { name: "Contacto" }).click();
    await expect(page).toHaveURL(/#contacto$/);

    await page.goBack();
    await expect(page).toHaveURL(/#historia$/);
    await expect(navigation).toHaveAttribute("data-active-world", "tesseract");
    await expect(page.locator("html")).toHaveAttribute(
      "data-narrative-navigation",
      "free",
    );

    // Scroll de usuario real: materializa progresivamente las secciones bajo
    // content-visibility y debe reemplazar, no apilar, la entrada actual.
    for (
      let step = 0;
      step < 20 &&
      (await navigation.getAttribute("data-active-world")) !== "miller";
      step += 1
    ) {
      await page.mouse.wheel(0, 560);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    }
    await expect(page).toHaveURL(/#desarrollo$/);
    await expect(navigation).toHaveAttribute("data-active-world", "miller");

    await page.goBack();
    await expect(page).toHaveURL(/\/es$/);
    await page.goForward();
    await expect(page).toHaveURL(/#desarrollo$/);
    await expect(page.locator("section#desarrollo")).toBeInViewport();
  });

  test("el campo estelar 2D se difiere hasta después de la hidratación", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/es");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(1, {
      timeout: 3_000,
    });
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "ready",
    );
  });

  test("A29 · se puede llegar a Ranger y a su formulario solo con teclado", async ({
    page,
  }) => {
    await page.goto("/es");
    const contactLink = page
      .getByRole("navigation", { name: "Navegación de mundos" })
      .getByRole("link", { name: "Contacto" });
    for (
      let i = 0;
      i < 12 &&
      !(await contactLink.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(contactLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contacto$/);
    const ranger = page.locator("section#contacto");
    await expect(ranger).toBeInViewport();

    const name = ranger.getByLabel("Nombre");
    for (
      let i = 0;
      i < 60 && !(await name.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(name).toBeFocused();
    await page.keyboard.type("Ada Lovelace");
    await expect(name).toHaveValue("Ada Lovelace");
  });

  test("una ruta desconocida devuelve 404", async ({ page }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(404);
  });

  test("A30 · OMSTA publica metadata/OG y un slug inválido responde 404", async ({
    page,
  }) => {
    await page.goto("/es/proyectos/omsta");
    await expect(page).toHaveTitle(/OMSTA — ERP en Django/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "OMSTA — ERP en Django | Caso de estudio",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/media\/projects\/omsta\/01-dashboard-panel-ejecutivo\.png$/,
    );

    const response = await page.goto("/es/proyectos/no-existe");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Esta misión salió de la órbita.",
      }),
    ).toBeVisible();
  });

  test("A32 · home y caso OMSTA no desbordan en 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of [
      "/es",
      "/es/proyectos/omsta",
      "/es/contacto/gracias",
      "/es/privacidad",
    ]) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
      if (path === "/es/proyectos/omsta") {
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: /OMSTA — ERP para una agencia de viajes/,
          }),
        ).toBeVisible();
      }
    }
  });
});

test.describe("A27 (variante F1A) · ?no3d=1 fuerza el perfil ligero", () => {
  test("no monta el canvas y conserva el contenido íntegro", async ({ page }) => {
    await page.goto("/es?no3d=1");

    // El backdrop pesado no se monta...
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "static",
    );
    // ...pero NO es reduced-motion: son dos conceptos distintos.
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "false",
    );

    // Paridad de contenido: el perfil ligero es el mismo sitio, sin el canvas.
    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    for (const anchor of ANCHORS) {
      await expect(page.locator(`section#${anchor}`)).toHaveCount(1);
    }
    await expect(page.getByRole("link", { name: "Descargar CV" })).toBeVisible();
  });

  test("la URL canónica sin el parámetro sí monta el starfield", async ({
    page,
  }) => {
    // Contraprueba: sin esto, el test anterior pasaría aunque el starfield
    // estuviera roto para todo el mundo.
    await page.goto("/es");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "ready",
    );
  });

  test("el parámetro sobrevive a la navegación por anclas", async ({ page }) => {
    await page.goto("/es?no3d=1");
    await page
      .getByRole("navigation", { name: "Navegación de mundos" })
      .getByRole("link", { name: "Contacto" })
      .click();
    await expect(page).toHaveURL(/\?no3d=1#contacto$/);
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
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
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );

    // Las anclas siguen funcionando con salto inmediato y estado coherente.
    await page
      .getByRole("navigation", { name: "Navegación de mundos" })
      .getByRole("link", { name: "Contacto" })
      .click();
    const ranger = page.locator("section#contacto");
    await expect(ranger).toBeInViewport();
    await expect(page.locator("html")).toHaveAttribute(
      "data-narrative-navigation",
      "free",
    );
    const alignment = await ranger.evaluate((section) => ({
      top: section.getBoundingClientRect().top,
      padding: Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ),
    }));
    expect(Math.abs(alignment.top - alignment.padding)).toBeLessThan(3);
  });
});
