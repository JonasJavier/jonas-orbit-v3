import { expect, test, type Page } from "@playwright/test";

/**
 * Suite E2E del Sistema Gargantúa.
 *
 * Reescrita con el pivote (docs/plans/sistema-gargantua.md §12): desaparecen
 * A6/A7/A8 (progreso de scroll) y A22/A23/A24 (anclas e historial por scroll),
 * porque el comportamiento que cubrían dejó de existir. A20, A21, A28, A29 y
 * A32 se conservan como escenarios pero ahora se recorren por rutas.
 */

/** Los 7 mundos en orden narrativo, con su ruta ES y su etiqueta de navegación. */
const WORLDS = [
  { slug: "sobre-mi", label: "Historia", title: "Mi historia" },
  { slug: "formacion", label: "Formación", title: "Formación y trayectoria" },
  { slug: "desarrollo", label: "Desarrollo", title: "Desarrollo full-stack" },
  { slug: "proyectos", label: "Proyectos", title: "Proyectos y sistemas" },
  { slug: "creatividad", label: "Creatividad", title: "Creatividad visual" },
  { slug: "laboratorio", label: "Laboratorio", title: "Laboratorio" },
  { slug: "contacto", label: "Contacto", title: "Contacto" },
] as const;

/** Las 8 rutas indexables de ES: la home más los 7 destinos. */
const ROUTES = ["/es", ...WORLDS.map((world) => `/es/${world.slug}`)];

function heroLink(page: Page, name: string) {
  // El mapa usa los mismos rótulos que el hero: hay que acotar la búsqueda o
  // el selector encuentra dos y falla por ambigüedad.
  return page
    .getByRole("navigation", { name: "Acciones principales" })
    .getByRole("link", { name, exact: true });
}

/**
 * Navega esperando solo al DOM.
 *
 * Las rutas con galería (/es/proyectos y los casos) descargan muchas imágenes;
 * esperar a `load` en un test que comprueba marcado o metadata lo convierte en
 * un test de ancho de banda y falla de forma aleatoria bajo carga. Lo que estos
 * tests verifican existe en cuanto el documento está parseado.
 */
async function visit(page: Page, url: string) {
  return page.goto(url, { waitUntil: "domcontentloaded" });
}

function systemMap(page: Page) {
  return page.getByRole("navigation", {
    name: "Destinos del Sistema Gargantúa",
  });
}

function missionNav(page: Page) {
  return page.getByRole("navigation", { name: "Navegación de mundos" });
}

test.describe("smoke — el Sistema Gargantúa y sus 8 rutas", () => {
  test("A19 · / redirige a /es con un único salto correcto", async ({
    page,
  }) => {
    const response = await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    expect(response?.status()).toBe(200);
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
    await expect(
      heroLink(page, "Proyectos"),
    ).toHaveAttribute("href", "/es/proyectos");
    await expect(
      heroLink(page, "Contacto"),
    ).toHaveAttribute("href", "/es/contacto");
    const cv = heroLink(page, "CV");
    await expect(cv).toBeVisible();
    await expect(cv).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");
    await expect(cv).toHaveAttribute("download", "");
  });

  test("G1 · cada mundo responde 200 en su ruta y una desconocida da 404", async ({
    page,
  }) => {
    for (const world of WORLDS) {
      const response = await page.goto(`/es/${world.slug}`);
      expect(response?.status(), `/es/${world.slug}`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: world.title }),
      ).toBeVisible();
    }

    // El segmento dinámico no puede tragarse cualquier cosa.
    const unknown = await page.goto("/es/agujero-de-gusano");
    expect(unknown?.status()).toBe(404);
  });

  test("G2 · las 8 rutas publican title, description, canonical y OG propios", async ({
    page,
  }) => {
    const seen = { title: new Set<string>(), canonical: new Set<string>() };

    for (const route of ROUTES) {
      await page.goto(route);

      const title = await page.title();
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute("content");

      expect(title, `${route}: sin title`).toBeTruthy();
      expect(description, `${route}: sin description`).toBeTruthy();
      expect(canonical, `${route}: canonical incorrecto`).toContain(route);
      expect(ogUrl, `${route}: og:url incorrecto`).toContain(route);

      // Lo que realmente cubre este test: que NO se repitan entre rutas. Ocho
      // páginas con el mismo título se canibalizan en el buscador.
      expect(seen.title.has(title), `${route}: title duplicado`).toBe(false);
      expect(
        seen.canonical.has(canonical ?? ""),
        `${route}: canonical duplicado`,
      ).toBe(false);
      seen.title.add(title);
      seen.canonical.add(canonical ?? "");
    }
  });

  test("A20 · hero → caso OMSTA requiere como máximo dos interacciones", async ({
    page,
  }) => {
    await page.goto("/es");
    await heroLink(page, "Proyectos").click();
    await expect(page).toHaveURL(/\/es\/proyectos$/);

    await page.getByRole("link", { name: "Abrir caso completo" }).click();
    await expect(page).toHaveURL(/\/es\/proyectos\/omsta$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /OMSTA — ERP para una agencia de viajes/,
      }),
    ).toBeVisible();
  });

  test("A21 · el CTA 'Trabajemos juntos' lleva a Ranger en una interacción", async ({
    page,
  }) => {
    await page.goto("/es");
    await heroLink(page, "Contacto").click();
    await expect(page).toHaveURL(/\/es\/contacto$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Contacto" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeVisible();
  });

  test("la cabecera marca el mundo activo en cada ruta, sin JavaScript de estado", async ({
    page,
  }) => {
    for (const world of WORLDS) {
      await page.goto(`/es/${world.slug}`);
      const link = missionNav(page).getByRole("link", { name: world.label });
      await expect(link).toHaveAttribute("aria-current", "page");
    }

    // La home no tiene cabecera: repetir ahí los siete destinos que YA son el
    // mapa era decir dos veces lo mismo y enmarcar el espacio con muebles de
    // página web. El shell completo vive en las páginas de mundo.
    await page.goto("/es");
    await expect(missionNav(page)).toHaveCount(0);
  });

  test("cada mundo ofrece sus destinos contiguos y los extremos no inventan vecinos", async ({
    page,
  }) => {
    await page.goto("/es/desarrollo");
    const neighbours = page.getByRole("navigation", {
      name: "Destinos contiguos",
    });
    await expect(neighbours.getByRole("link")).toHaveCount(2);
    await expect(neighbours.getByRole("link").first()).toHaveAttribute(
      "href",
      "/es/formacion",
    );

    await page.goto("/es/sobre-mi");
    await expect(neighbours.getByRole("link")).toHaveCount(1);
    await page.goto("/es/contacto");
    await expect(neighbours.getByRole("link")).toHaveCount(1);
  });

  test("A25 · Ranger envía una transmisión completa y confirma recepción", async ({
    page,
  }) => {
    await page.goto("/es/contacto");
    await page.getByLabel("Nombre").fill("Ada Lovelace");
    await page.getByLabel("Correo").fill("ada@example.com");
    await page.getByLabel("Tipo de misión").selectOption("product");
    await page
      .getByLabel("Mensaje")
      .fill("Quiero construir una herramienta clara para nuestro equipo.");
    await page.getByLabel(/He leído la nota de privacidad/).check();

    const submit = page.getByRole("button", { name: "Enviar transmisión" });
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

    await page.goto("/es/contacto");
    await page.getByLabel("Nombre").fill("Grace Hopper");
    await page.getByLabel("Correo").fill("grace@example.com");
    await page.getByLabel("Tipo de misión").selectOption("system");
    await page
      .getByLabel("Mensaje")
      .fill("Necesitamos mejorar un sistema interno y reducir pasos manuales.");
    await page.getByLabel(/He leído la nota de privacidad/).check();
    const submit = page.getByRole("button", { name: "Enviar transmisión" });
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.getByText(/Tus datos siguen aquí/)).toBeVisible();
    await expect(page.getByLabel("Nombre")).toHaveValue("Grace Hopper");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(/\/es\/contacto\/gracias$/);
    expect(postCount).toBe(2);
  });

  test("A31 · Ranger ofrece ambos CV y mantiene ES como descarga principal", async ({
    page,
  }) => {
    await page.goto("/es/contacto");
    await expect(page.getByRole("link", { name: /CV español/ })).toHaveAttribute(
      "href",
      "/cv/jonas-javier-cv-es.pdf",
    );
    await expect(page.getByRole("link", { name: /CV English/ })).toHaveAttribute(
      "href",
      "/cv/jonas-javier-cv-en-ats.pdf",
    );
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

  test("el fondo sobrevive a la navegación sin remontarse", async ({ page }) => {
    // Precursor de G6: el canvas de G2 vivirá en el mismo layout. Si una
    // navegación lo remontara, la escena parpadearía en negro en cada viaje.
    await page.goto("/es");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(1, {
      timeout: 3_000,
    });
    await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="starfield-2d"]');
      if (canvas) (canvas as HTMLElement).dataset.survivor = "sí";
    });

    await systemMap(page).getByRole("link", { name: /Laboratorio/ }).click();
    await expect(page).toHaveURL(/\/es\/laboratorio$/);
    await expect(page.getByTestId("starfield-2d")).toHaveAttribute(
      "data-survivor",
      "sí",
    );
  });

  test("A29 · se recorren las 8 rutas y se escribe en el formulario solo con teclado", async ({
    page,
  }) => {
    await page.goto("/es");

    for (const world of WORLDS) {
      // Primer salto desde el mapa de la home; a partir de ahí, la cabecera de
      // cada mundo. Es el recorrido real de quien navega con teclado.
      // El mapa de la home anuncia «Miller Desarrollo» desde que la etiqueta
      // lleva el nombre del cuerpo; la cabecera de cada mundo sigue anunciando
      // sólo la función. Por eso el selector es exacto en una y por subcadena
      // en el otro.
      //
      // Ojo con comparar locators: `systemMap(page)` devuelve uno NUEVO en cada
      // llamada, así que `nav === systemMap(page)` es siempre falso. La rama se
      // decide por la URL, que es el dato real.
      const enLaHome = page.url().endsWith("/es");
      const nav = enLaHome ? systemMap(page) : missionNav(page);
      const link = enLaHome
        ? nav.getByRole("link", { name: new RegExp(world.label) })
        : nav.getByRole("link", { name: world.label, exact: true });
      for (
        let i = 0;
        i < 30 &&
        !(await link.evaluate((el) => el === document.activeElement));
        i++
      ) {
        await page.keyboard.press("Tab");
      }
      await expect(link, `no se alcanzó ${world.label} con Tab`).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/es/${world.slug}$`));
    }

    // El último mundo es Ranger: se llega al formulario sin tocar el ratón.
    const name = page.getByLabel("Nombre");
    for (
      let i = 0;
      i < 80 && !(await name.evaluate((el) => el === document.activeElement));
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
    await visit(page, "/es/proyectos/omsta");
    await expect(page).toHaveTitle(/OMSTA — ERP en Django/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "OMSTA — ERP en Django | Caso de estudio",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/media\/projects\/omsta\/01-dashboard-panel-ejecutivo\.png$/,
    );

    const response = await visit(page, "/es/proyectos/no-existe");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Esta misión salió de la órbita.",
      }),
    ).toBeVisible();
  });

  test("A32 · ninguna de las 8 rutas desborda en 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of [
      ...ROUTES,
      "/es/proyectos/omsta",
      "/es/contacto/gracias",
      "/es/privacidad",
    ]) {
      await visit(page, path);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, `${path} desborda`).toBe(
        dimensions.clientWidth,
      );
    }
  });
});

/**
 * G3 de la matriz del pivote: la escena nunca es el contenido.
 *
 * Es el test que protege la regla 7 del repositorio. Se ejecuta con JavaScript
 * DESACTIVADO a propósito — si algún día el mapa del sistema pasara a montarse
 * en el cliente, este test caería y con él la promesa de que un reclutador con
 * mala red, un lector de pantalla y Googlebot ven lo mismo.
 */
test.describe("G3 · el HTML de /es sirve el contenido sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("nombre, rol, dos CTAs, CV y siete enlaces reales a los mundos", async ({
    page,
  }) => {
    await page.goto("/es");

    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    // Rol y propuesta están OCULTOS a la vista pero presentes en el documento:
    // la regla 7 pide que el HTML los sirva, no que ocupen media pantalla. Por
    // eso se comprueba el contenido del <h1>, no su visibilidad.
    // Rol y propuesta salieron del <h1> y volvieron A LA VISTA como párrafos:
    // el HTML servido los sigue conteniendo, que es lo que la regla 7 exige,
    // pero ahora además se leen sin lector de pantalla.
    await expect(page.locator(".hero__role")).toContainText(
      /Desarrollador full-stack/,
    );
    await expect(page.locator(".hero__pitch")).toContainText(
      /ingeniería y diseño orbitan juntos/,
    );

    await expect(
      heroLink(page, "Proyectos"),
    ).toHaveAttribute("href", "/es/proyectos");
    await expect(
      heroLink(page, "Contacto"),
    ).toHaveAttribute("href", "/es/contacto");
    await expect(
      heroLink(page, "CV"),
    ).toHaveAttribute("href", "/cv/jonas-javier-cv-es.pdf");

    const map = page.getByRole("navigation", { name: "Destinos del Sistema Gargantúa" });
    await expect(map.getByRole("link")).toHaveCount(7);
    for (const world of WORLDS) {
      // Se cuenta en el RAÍL, que es donde viven los siete enlaces reales. El
      // mapa dibuja además un eco visual anclado a cada cuerpo — también un
      // <a href> para que pulsar un planeta funcione sin JavaScript, pero
      // `aria-hidden` y fuera del orden de tabulación, así que no duplica
      // destinos para quien navega con lector de pantalla o teclado.
      await expect(
        map.locator(`.nav-rail a[href="/es/${world.slug}"]`),
        `falta el enlace a ${world.slug}`,
      ).toHaveCount(1);
    }

    // El canvas decorativo no existe sin JavaScript, y no hace falta que exista.
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
  });

  test("los siete mundos se leen enteros sin JavaScript", async ({ page }) => {
    for (const world of WORLDS) {
      // `domcontentloaded`, no `load`: lo que se comprueba es el HTML que sirve
      // el servidor. Esperar a `load` es esperar a las imágenes de /es/proyectos,
      // que sin JavaScript se descargan todas de golpe — y eso convertía un test
      // de marcado en un test de ancho de banda que fallaba de forma aleatoria.
      await page.goto(`/es/${world.slug}`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { level: 1, name: world.title }),
      ).toBeVisible();
    }
  });
});

test.describe("A27 · ?no3d=1 fuerza el perfil ligero", () => {
  test("no monta el canvas y conserva el contenido íntegro", async ({ page }) => {
    await page.goto("/es?no3d=1");

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

    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Destinos del Sistema Gargantúa" }).getByRole("link"),
    ).toHaveCount(7);
    await expect(heroLink(page, "CV")).toBeVisible();
  });

  test("la URL canónica sin el parámetro sí monta el starfield", async ({
    page,
  }) => {
    await page.goto("/es");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "ready",
    );
  });

  test("la elección sobrevive a una navegación de ruta real", async ({
    page,
  }) => {
    // Con 8 rutas el parámetro ya no viaja solo: el primer enlace lo borra.
    // Lo que persiste es la ELECCIÓN, no la URL (§5 del pivote).
    await page.goto("/es?no3d=1");
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "static",
    );

    await systemMap(page).getByRole("link", { name: /Contacto/ }).click();
    await expect(page).toHaveURL(/\/es\/contacto$/);
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-starfield",
      "static",
    );
  });

  test("?no3d=0 devuelve los efectos a quien los había apagado", async ({
    page,
  }) => {
    await page.goto("/es?no3d=1");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);

    await page.goto("/es?no3d=0");
    await expect(page.getByTestId("starfield-2d")).toHaveCount(1, {
      timeout: 3_000,
    });
  });
});

test.describe("A28 · prefers-reduced-motion — paridad de contenido", () => {
  test("el contenido íntegro está presente sin movimiento", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es");

    await expect(
      page.getByRole("heading", { level: 1, name: /Jonás Javier Encarnación/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Destinos del Sistema Gargantúa" }).getByRole("link"),
    ).toHaveCount(7);
    await expect(page.getByTestId("starfield-2d")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );

    // La navegación entre mundos sigue siendo una navegación normal.
    await systemMap(page).getByRole("link", { name: /Contacto/ }).click();
    await expect(page).toHaveURL(/\/es\/contacto$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Contacto" }),
    ).toBeVisible();
  });
});

/**
 * La escena (G2).
 *
 * En este entorno Chromium sirve WebGL por SwiftShader, un rasterizador por
 * SOFTWARE, y el gate lo veta: la escena no se monta y se sirve el nivel `flat`.
 * Eso no es una limitación del test, es el comportamiento correcto — un equipo
 * sin GPU no puede pintar 190 pasos de raymarch por píxel y merece el mismo
 * sitio, no un rectángulo negro.
 *
 * Por eso lo que se verifica aquí es la MITAD que importa para quien no ve la
 * escena: que el sistema siga siendo navegable y que no se descargue ni un byte
 * de three.js para nada.
 */
test.describe("G4 · sin escena no se descarga three.js", () => {
  test("el nivel flat no pide ningún chunk de la escena", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });

    await page.goto("/es?no3d=1");
    await page.waitForTimeout(1500);

    // El chunk de la escena se carga con `import()` dinámico y solo cuando el
    // gate lo aprueba. Si apareciera aquí, el presupuesto de §8 estaría roto
    // para justo quien no puede pagarlo.
    await expect(page.getByTestId("gargantua-canvas")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-scene", "flat");

    const sceneChunks = scripts.filter((url) => /three|system-scene/i.test(url));
    expect(sceneChunks, `chunks de escena cargados: ${sceneChunks}`).toEqual([]);
  });

  test("sin escena, los siete destinos siguen siendo navegables", async ({
    page,
  }) => {
    await page.goto("/es?no3d=1");

    const map = page.getByRole("navigation", {
      name: "Destinos del Sistema Gargantúa",
    });
    await expect(map.getByRole("link")).toHaveCount(7);

    // Y llevan a alguna parte: es la diferencia entre degradar y romperse.
    await map.getByRole("link", { name: /Laboratorio/ }).click();
    await expect(page).toHaveURL(/\/es\/laboratorio$/);
  });

  test("la home es una sola pantalla: no hay scroll vertical", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/es");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    );
    expect(overflow).toBe(0);
  });
});
