import { expect, test } from "@playwright/test";

/**
 * LA RECEPCIÓN DEL LABORATORIO Y LA PUERTA.
 *
 * Cubre lo que el Observatorio no podía cubrir hasta ahora porque no existía:
 * O1 —la recepción no crea contexto WebGL propio— y la mitad de O8 que pedía
 * seis URLs y encontraba una.
 *
 * Lo que se fija aquí no es el aspecto, es la CADENA: que las seis muestras se
 * cuenten, que sólo las montadas lleven a alguna parte, que la adquisición
 * lleve al laboratorio y que sin JavaScript la puerta siga siendo una puerta.
 */

const RECEPCION = "/es/experimentos";

test("la recepción cuenta seis muestras y sólo enlaza las montadas", async ({
  page,
}) => {
  await page.goto(RECEPCION);

  const indice = page.getByRole("region", { name: "Índice de especímenes" });
  await expect(indice.locator("li")).toHaveCount(6);

  /*
    Seis enlaces y ninguno muerto. El reparto cambió con cada muestra montada
    —dos y cuatro, tres y tres con Gargantúa, cuatro y dos con la Ranger— y con
    Miller y Edmunds llega a seis y cero: el laboratorio está completo.

    Lo que comprueba este par de líneas cambia de sentido con ese cero, y vale
    decirlo. Antes vigilaba que las muestras sin montar no fingieran ser
    puertas; ahora vigila lo contrario —que ninguna montada pierda su `href`—
    porque es lo único que puede romperse ya. La cuenta sigue saliendo de
    `OBSERVATORY_SLUGS` y de `OBSERVATION_ORDER`, así que si alguna vez
    discreparan, la recepción llevaría a la fila `03` y aterrizaría en otra.

    El camino deshabilitado NO se queda sin prueba: lo cubre el fixture mixto de
    `components/observatory-chrome.test.tsx`, que existe precisamente para no
    depender de que el catálogo real tenga huecos.
  */
  await expect(indice.locator("a")).toHaveCount(6);
  await expect(indice.locator("[aria-disabled='true']")).toHaveCount(0);

  /*
    Todo acotado al índice desde el pie de universo (7cdd907): su lista de
    destinos lleva «Experimentos Tesseracto» y «Proyectos Endurance», así que
    los seis nombres salen ya dos veces en la página. Las tres notas de abajo
    explican por qué tres de ellos lo hacían desde antes.
  */
  await expect(
    indice.getByRole("link", { name: /Tesseracto/ }),
  ).toHaveAttribute("href", "/es/experimentos/observatorio/tesseracto");
  await expect(indice.getByRole("link", { name: /Endurance/ })).toHaveAttribute(
    "href",
    "/es/experimentos/observatorio/endurance",
  );
  /*
    Acotado al índice, y no por manía: «Gargantúa» aparece DOS veces en esta
    página como nombre de enlace —la fila del catálogo y el «Volver al Sistema
    Gargantúa ↑» del pie— porque el agujero negro da nombre al sistema entero.
    Es el único de los seis al que le pasa.
  */
  await expect(
    indice.getByRole("link", { name: /Gargantúa/ }),
  ).toHaveAttribute("href", "/es/experimentos/observatorio/gargantua");
  /*
    Acotada al índice por lo mismo, y no era obvio: «Ranger» también sale dos
    veces, porque el pie de la recepción encadena con el destino siguiente y ese
    enlace se llama «Destino 06 · Ranger Contacto». Gargantúa lo hace por ser el
    sistema entero; la Ranger, por ser la vecina.
  */
  await expect(indice.getByRole("link", { name: /Ranger/ })).toHaveAttribute(
    "href",
    "/es/experimentos/observatorio/ranger",
  );
  await expect(indice.getByRole("link", { name: /Miller/ })).toHaveAttribute(
    "href",
    "/es/experimentos/observatorio/miller",
  );
  /*
    Y Edmunds acotada también, por una tercera razón distinta de las dos de
    arriba: el pie encadena con el destino ANTERIOR, y Experimentos viene
    después de Creatividad. Gargantúa sale dos veces por ser el sistema entero,
    la Ranger por ser la vecina de después y Edmunds por ser la de antes. Tres
    trampas distintas con el mismo síntoma.
  */
  await expect(indice.getByRole("link", { name: /Edmunds/ })).toHaveAttribute(
    "href",
    "/es/experimentos/observatorio/edmunds",
  );
});

test("O1 · la recepción no crea un contexto WebGL propio", async ({ page }) => {
  /*
    La garantía del §1, dicha como es y no como se idealizó: la recepción **no
    crea contexto propio y la escena persistente no dibuja en ella**. `three`
    puede estar ya cargado por el layout —lo está en cualquier ruta del locale—
    y conseguir lo contrario exigiría desmontar la escena por ruta, que es el
    mecanismo caro del Observatorio aplicado a una página que no lo necesita.

    Se cuentan los contextos creados, que es lo que sí se puede afirmar.
  */
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as unknown as { __contextos: string[] }).__contextos = [];
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (
        this: HTMLCanvasElement,
        tipo: string,
        ...resto: unknown[]
      ) {
        // Sólo los canvas ANCLADOS cuentan: `probeWebGL` crea uno desechable
        // fuera del DOM para sondear la capacidad y lo suelta acto seguido.
        // El canvas persistente del layout no pertenece a la recepción.
        if (this.isConnected && this.dataset.testid !== "gargantua-canvas") {
          (window as unknown as { __contextos: string[] }).__contextos.push(
            tipo,
          );
        }
        return Reflect.apply(original, this, [tipo, ...resto]);
      },
    });
  });

  await page.goto(RECEPCION);
  await page.waitForTimeout(2000);

  const contextos = await page.evaluate(
    () => (window as unknown as { __contextos: string[] }).__contextos,
  );
  expect(contextos.filter((tipo) => tipo.startsWith("webgl"))).toHaveLength(0);
  // A capable host can retain the layout's context; it must remain covered.
  const persistent = page.getByTestId("gargantua-canvas");
  if (await persistent.count()) {
    await expect(persistent).toHaveAttribute("data-covered", "true");
  }
});

test("la adquisición lleva al laboratorio", async ({ page }) => {
  await page.goto(RECEPCION);

  // Acotada al índice: el pie también enlaza «Experimentos Tesseracto».
  const fila = page
    .getByRole("region", { name: "Índice de especímenes" })
    .getByRole("link", { name: /Tesseracto/ });
  await fila.click();

  /*
    El protocolo dura poco más de un segundo y la navegación va por
    TEMPORIZADOR, nunca desde un fotograma: atarla a una animación la dejaría a
    merced de una pestaña en segundo plano, donde `requestAnimationFrame` no
    corre. Es la misma regla que la travesía aprendió a golpes (G10).
  */
  await expect(page).toHaveURL(/\/es\/experimentos\/observatorio\/tesseracto$/, {
    timeout: 10_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tesseracto");
});

test("sin JavaScript la recepción sigue siendo una puerta", async ({
  browser,
}) => {
  /*
    Regla 7. La adquisición es una capa encima de un enlace de verdad: sin
    JavaScript no hay protocolo, no hay atenuado y no hay lectura de estado, y
    la fila sigue llevando al espécimen. Si alguna vez la puerta dependiera del
    `onClick`, este test se pone rojo.
  */
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(RECEPCION);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Experimentos",
  );
  await expect(page.locator(".specimen-index__item")).toHaveCount(6);

  await page.locator(".specimen-index__item").getByRole("link", { name: /Tesseracto/ }).click();
  await expect(page).toHaveURL(/\/es\/experimentos\/observatorio\/tesseracto$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tesseracto");

  await context.close();
});
