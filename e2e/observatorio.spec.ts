import { expect, test, type Page } from "@playwright/test";

/**
 * El Observatorio, comprobado en un navegador de verdad.
 *
 * Cubre O2, O6, O7, O10 y O12 de `docs/design/tesseract-experimentos.md` §12.
 * Los que faltan —O1, O8, O9 y O13— necesitan la recepción o más de un
 * espécimen, y ninguna de las dos cosas existe todavía: escribirlos ahora sería
 * escribir tests que pasan porque no hay nada que probar.
 *
 * ── Tres trampas, las tres ya medidas en el §12 ─────────────────────────────
 *
 * 1. **No se engancha `getContext`.** Daría falsos positivos: `probeWebGL()`
 *    crea un canvas desechable FUERA del DOM para sondear WebGL2 y lo suelta
 *    con `WEBGL_lose_context`. Aquí se cuentan DIBUJOS por canvas dueño, que es
 *    el patrón de `miller.spec.ts` y de `ranger.spec.ts`.
 * 2. **«Cero fotogramas» no es cierto en la escena persistente.** Su modo
 *    congelado dibuja a ~4 fps. El Observatorio sí puede llegar a cero de
 *    verdad porque su bucle es bajo demanda — y por eso O12 puede afirmarlo
 *    aquí y sería un test rojo sobre la home.
 * 3. **Estos tests necesitan la escena VIVA**, así que no pueden usar
 *    `?no3d=1` como casi toda la suite. Se enciende a mano por almacenamiento,
 *    y el viewport se fija para que el proyecto móvil no cambie el veredicto
 *    del gate de capacidad.
 */

const OBSERVATORIO = "/es/experimentos/observatorio/tesseracto";

/** Enciende los efectos y cuenta dibujos por canvas, separando los dos dueños. */
async function contarDibujos(page: Page) {
  await page.addInitScript(() => {
    // Encendido a propósito: sólo eso monta la escena sobre una GPU por
    // software. El mismo precedente que Miller y Edmunds.
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
    const state = window as unknown as {
      systemDraws: number;
      observatoryDraws: number;
    };
    state.systemDraws = 0;
    state.observatoryDraws = 0;
    for (const name of ["drawArrays", "drawElements"] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      Object.defineProperty(WebGL2RenderingContext.prototype, name, {
        configurable: true,
        value: function (this: WebGL2RenderingContext, ...args: number[]) {
          const canvas = this.canvas;
          if (canvas instanceof HTMLCanvasElement && canvas.isConnected) {
            if (canvas.classList.contains("system-canvas")) state.systemDraws++;
            if (canvas.classList.contains("observatory__canvas")) {
              state.observatoryDraws++;
            }
          }
          return Reflect.apply(original, this, args);
        },
      });
    }
  });
}

function dibujosEn(page: Page, clave: "systemDraws" | "observatoryDraws") {
  return page.evaluate(async (key) => {
    const state = window as unknown as Record<string, number>;
    const before = state[key];
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    return state[key] - before;
  }, clave);
}

test("O2 · el contexto persistente se LIBERA en el Observatorio, no se congela", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await contarDibujos(page);

  /*
    La prueba real no es «no dibuja» —eso ya lo conseguía `COVERED_WORLDS`
    congelando el bucle— sino que el contexto deja de EXISTIR. El §3 lo dice con
    todas las letras y la enmienda 3 corrige una afirmación mía que era falsa:
    congelar no libera VRAM.

    Se comprueba con el marcador de persistencia que la suite ya usa, pero
    leyéndolo al revés que Miller: allí el marcador debe SOBREVIVIR a la
    navegación, porque la escena es la misma. Aquí debe DESAPARECER, porque el
    elemento se desmontó y al volver hay uno nuevo.
  */
  await page.goto("/es");
  const canvas = page.getByTestId("gargantua-canvas");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await canvas.evaluate((node) => {
    node.setAttribute("data-persistence-marker", "mismo-canvas");
  });

  await page.goto(OBSERVATORIO);
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });

  // Ni congelado ni cubierto: no está.
  await expect(page.getByTestId("gargantua-canvas")).toHaveCount(0);
  expect(await dibujosEn(page, "systemDraws")).toBe(0);

  await page.goto("/es");
  const devuelto = page.getByTestId("gargantua-canvas");
  await expect(devuelto).toBeVisible({ timeout: 30000 });
  // Y la prueba de que se liberó de verdad: el marcador no sobrevivió.
  await expect(devuelto).not.toHaveAttribute(
    "data-persistence-marker",
    "mismo-canvas",
  );
});

test("O6 y O12 · sin movimiento no se dibuja nada, pero la mano sigue viva", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);

  const canvas = page.locator(".observatory__canvas");
  await expect(canvas).toBeVisible({ timeout: 30000 });
  // Asentamiento: por software los primeros fotogramas llegan a cuentagotas.
  await page.waitForTimeout(4000);

  /*
    O6: el interruptor global gobierna el movimiento AUTÓNOMO. Apagarlo tiene
    que dejar el espécimen quieto — no hay giro en reposo — sin tocar la
    manipulación directa, que no es movimiento sino la mano del visitante.

    O12: y con él apagado y sin entrada, el contador de renders deja de avanzar.
    De verdad, no «casi»: el bucle es bajo demanda y el Observatorio es el
    primer sitio del proyecto donde eso se puede afirmar con un cero.
  */
  await page
    .getByRole("button", { name: "Desactivar movimiento" })
    .first()
    .click();
  await page.waitForTimeout(1200);

  expect(await dibujosEn(page, "observatoryDraws")).toBe(0);

  /*
    Y la mano sigue mandando: arrastrar redibuja aunque el interruptor esté
    apagado.

    La medida va ALREDEDOR del gesto y no después, y esa distinción costó una
    pasada: con un bucle bajo demanda el fotograma sucio se dibuja DURANTE el
    arrastre, así que una ventana de doce fotogramas tomada al soltar llega
    tarde y mide cero — el mismo cero que acaba de significar lo contrario dos
    líneas más arriba. Contar alrededor es lo único que distingue «no se
    redibujó» de «ya se había redibujado».
  */
  const leer = () =>
    page.evaluate(
      () => (window as unknown as { observatoryDraws: number }).observatoryDraws,
    );

  const antes = await leer();
  const caja = (await canvas.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(
      caja.x + caja.width / 2 + i * 15,
      caja.y + caja.height / 2,
    );
  }
  await page.mouse.up();
  await expect.poll(leer).toBeGreaterThan(antes);
});

test("O7 · sin equipo hay espécimen plano y ficha completa, no una pantalla negra", async ({
  page,
}) => {
  /*
    Se retira WebGL2 de verdad en vez de usar `?no3d=1`, y la diferencia
    importa: el §9 degrada por FALTA DE EQUIPO, no por preferencia. Apagar el
    movimiento escribe el perfil ligero, y si eso retirase el espécimen se
    incumpliría el O6 —«con movimiento apagado, manipulación viva»—, así que el
    gate distingue las dos cosas. Este test prueba el camino que sí degrada.

    Y las DOS mitades se comprueban. La primera es obvia: hay dibujo SVG. La
    segunda es la que se olvida: la ficha servida tiene que VERSE. El visor
    normal es `position: fixed; inset: 0` y la tapa, cosa que da igual cuando
    encima hay un espécimen en 3D; en `flat` dejaría a alguien con un equipo
    modesto mirando un rectángulo negro en lugar de la página.
  */
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, tipo: string, ...resto: unknown[]) {
        if (tipo === "webgl2") return null;
        return Reflect.apply(original, this, [tipo, ...resto]);
      },
    });
  });
  await page.goto(OBSERVATORIO);

  await expect(page.locator("[data-flat-world='tesseract']")).toBeVisible();
  await expect(page.locator(".observatory__canvas")).toHaveCount(0);
  await expect(page.locator(".observatory")).toHaveCount(0);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".observatory-route__summary")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver a Experimentos" }),
  ).toBeVisible();
});

test("O8 · sin JavaScript la ruta conserva nombre, ficha y vuelta al índice", async ({
  browser,
}) => {
  /*
    Regla 7: la escena nunca es el contenido. Sin JavaScript no hay canvas, ni
    plano ni en WebGL, y aun así la página tiene que significar lo mismo.

    O8 pide además «seis URLs», y de eso sólo existe una: los otros cinco
    especímenes entran después del pase visual. Lo que se comprueba aquí es la
    parte que ya se puede comprobar.
  */
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(OBSERVATORIO);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".observatory-route__summary")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver a Experimentos" }),
  ).toHaveAttribute("href", "/es/experimentos");
  await expect(page.locator("canvas")).toHaveCount(0);

  await context.close();
});

test("O10 · 375, 768 y 1440: sin desbordamiento y con blancos de 44 px", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await contarDibujos(page);

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(OBSERVATORIO);
    await page.waitForTimeout(2500);

    const desborda = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(desborda, `desborda a ${width} px`).toBe(false);

    /*
      El blanco de activación de los mandos, que es donde el pase tipográfico
      pudo haberse llevado algo por delante: al quitarles la caja, lo único que
      sostiene los 44 px es el `min-height`. Con puntero grueso el modo cine no
      atenúa, así que los mandos están ahí en los tres anchos.
    */
    for (const nombre of ["Bloom", "Material", "Datos", "Reajustar"]) {
      const caja = await page
        .getByRole("button", { name: nombre, exact: true })
        .boundingBox();
      expect(caja, `${nombre} no existe a ${width} px`).not.toBeNull();
      expect(caja!.height, `${nombre} mide menos de 44 px a ${width}`)
        .toBeGreaterThanOrEqual(44);
    }
  }
});
