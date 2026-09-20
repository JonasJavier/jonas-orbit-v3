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
/** Dos especímenes de malla, no los seis montados. El segundo existe para
 *  probar que el laboratorio no está hecho a la medida del primero, y con eso
 *  basta: Gargantúa tiene sus propias pruebas al final de este archivo porque
 *  no es una malla, la Ranger comparte camino con la Endurance, y Miller y
 *  Edmunds comparten el suyo —`simpleWorld`, una esfera y un material—, así que
 *  añadirlos aquí multiplicaría por tres un recorrido de navegador sin cubrir
 *  una sola línea nueva. Lo que sí es propio de ellos —el encuadre y la
 *  geometría de luz— se demuestra sin GPU en `observatory-frames.test.ts`. */
const ESPECIMENES = [
  "/es/experimentos/observatorio/tesseracto",
  "/es/experimentos/observatorio/endurance",
];

/**
 * Enciende los efectos a propósito.
 *
 * Sin esto el gate de capacidad decide `flat` sobre una GPU por software y el
 * visor entrega el respaldo plano: no hay instrumento que probar. Es el mismo
 * precedente que Miller y Edmunds, y se separa de `contarDibujos` porque son
 * dos necesidades distintas — casi todas las pruebas del Observatorio quieren
 * la escena viva y sólo dos quieren además contar dibujos.
 */
async function conEscenaViva(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jonas-orbit:reducir-efectos", "false");
  });
}

/** Enciende los efectos y cuenta dibujos por canvas, separando los dos dueños. */
async function contarDibujos(page: Page) {
  await conEscenaViva(page);
  await page.addInitScript(() => {
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

/**
 * Despliega la consola.
 *
 * El aparato arranca en `OBSERVAR` —modo cine— y ahí la consola va `inert` y
 * `visibility: hidden`: sus mandos no se pueden pulsar ni tabular, que es
 * exactamente lo que se pidió. Casi todo lo que esta suite comprueba vive
 * dentro, así que casi todo empieza por aquí.
 *
 * Al contrario que en jsdom, en un navegador de verdad `inert` SÍ se aplica:
 * olvidar esta llamada no produce un test que pasa por casualidad, produce un
 * clic que nunca llega. Es la comprobación de los dos modos escondida dentro de
 * cada test que usa un instrumento.
 */
async function abrirEstudio(page: Page) {
  await page.getByRole("radio", { name: "Estudio", exact: true }).click();
  await expect(page.locator(".observatory__console")).toBeVisible();
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

      `Reajustar` y el selector de modo viven en la barra del aparato y existen
      en los dos modos; los demás, dentro de la consola.
    */
    await abrirEstudio(page);
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

test("O10 bis · los mandos se pueden PULSAR, no sólo medir", async ({ page }) => {
  test.setTimeout(120_000);
  await contarDibujos(page);

  /*
    La mitad de O10 que faltaba, y que costó un defecto real.

    O10 comprueba que cada mando MIDA 44 px, y eso es otra cosa que poder
    pulsarlo: a 375 px la bandeja global —interruptor de movimiento y banda
    sonora, `position: fixed` en todas las rutas— caía justo encima de la fila
    de instrumentos. Las cajas estaban perfectas y `MATERIAL` y `DATOS` eran
    inalcanzables con el dedo. Un `boundingBox()` no ve lo que hay ENCIMA.

    Se comprueba con `elementFromPoint` sobre el centro exacto de cada mando, que
    es lo que hace el navegador cuando alguien toca ahí. Y sobre los DOS
    especímenes, porque el pie es del laboratorio y no de la muestra: si un día
    uno de ellos cambia la altura de la banda, el otro se entera aquí.
  */
  for (const ruta of ESPECIMENES) {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(ruta);
      await expect(page.locator(".observatory__canvas")).toBeVisible({
        timeout: 30000,
      });
      await page.waitForTimeout(2500);
      await abrirEstudio(page);

      for (const nombre of ["Bloom", "Material", "Datos", "Reajustar"]) {
        const boton = page.getByRole("button", { name: nombre, exact: true });
        const caja = (await boton.boundingBox())!;
        expect(caja, `${nombre} no existe en ${ruta} a ${width} px`).not.toBeNull();

        const encima = await page.evaluate(
          ([x, y]) => {
            const nodo = document.elementFromPoint(x, y);
            return nodo ? nodo.closest("button")?.textContent ?? null : null;
          },
          [caja.x + caja.width / 2, caja.y + caja.height / 2],
        );
        expect(
          encima,
          `«${nombre}» está tapado en ${ruta} a ${width} px`,
        ).toContain(nombre);
      }
    }
  }
});

test("los dos especímenes son el mismo laboratorio con datos propios", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await contarDibujos(page);

  /*
    La prueba de generalización, en la parte que un test puede afirmar.

    Lo visual lo juzga Jonás sobre captura; lo que se fija aquí es que el
    Observatorio NO se ha ramificado por espécimen. Mismo cromo, mismos cuatro
    mandos, misma instrumentación de borde — y `DATOS` con los conteos de CADA
    figura, que es la única cosa que tiene que ser distinta.

    Los números no se comparan contra una lista: se comprueba que las dos fichas
    no digan lo mismo. Escribir «radiadores 4» aquí sería exactamente el dato
    tecleado a mano que el §8 prohíbe, sólo que en un test.
  */
  const fichas: string[] = [];
  for (const ruta of ESPECIMENES) {
    await page.goto(ruta);
    await expect(page.locator(".observatory__canvas")).toBeVisible({
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    await expect(page.locator(".observatory__calipers")).toHaveCount(1);
    await abrirEstudio(page);
    for (const nombre of ["Bloom", "Material", "Datos", "Reajustar"]) {
      await expect(
        page.getByRole("button", { name: nombre, exact: true }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Datos", exact: true }).click();
    const ficha = page.locator(".observatory__data");
    await expect(ficha).toBeVisible();
    fichas.push((await ficha.textContent()) ?? "");
  }

  expect(fichas[0]).not.toBe(fichas[1]);
  expect(fichas[0].length).toBeGreaterThan(40);
  expect(fichas[1].length).toBeGreaterThan(40);
});

test("cambiar de espécimen dentro del laboratorio NO hereda el estado", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);

  /*
    La petición fue literal: «nada de heredar que dejaste el Tesseracto sin bloom
    y descubrir Endurance también sin bloom».

    Y no se cumple sola. La cámara sí se reinicia gratis —al cambiar el `id` el
    efecto reconstruye la escena entera desde el preset—, pero los instrumentos
    viven en estado de React, y entre dos rutas con el mismo árbol React
    REUTILIZA la instancia: `bloom`, `emission` y la ficha abierta sobreviven al
    cambio. Quien los tira es el `key` por espécimen de la ruta, y este test es
    lo único que lo sujeta: quitarlo no rompe ningún tipo ni ninguna unidad, y la
    consecuencia es que una muestra se presenta con el material de la anterior.

    Se prueba con BLOOM porque es el que más miente: apagado, la Endurance
    aparecería sin halo y parecería que su material es así.
  */
  await page.goto(OBSERVATORIO);
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  await abrirEstudio(page);
  const bloom = () => page.getByRole("button", { name: "Bloom", exact: true });
  await bloom().click();
  await expect(bloom()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Datos", exact: true }).click();
  await expect(page.locator(".observatory__data")).toBeVisible();

  // El salto va por el raíl, que es como lo hará un visitante.
  await page.getByRole("link", { name: "Endurance", exact: true }).click();
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  /*
    Y el MODO también se reinicia, que es parte de lo mismo: el reposo del
    aparato es mirar, y una muestra nueva se presenta antes de medirse.
  */
  await expect(page.locator(".observatory")).toHaveAttribute(
    "data-mode",
    "observar",
  );
  await abrirEstudio(page);

  await expect(bloom()).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Material", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".observatory__data")).toHaveCount(0);

  // Y la identidad y el raíl acompañan al cambio.
  await expect(page.locator(".observatory__index")).toContainText(
    "Espécimen 2 de 6",
  );
  const activo = page.locator('[aria-current="page"]');
  await expect(activo).toHaveCount(1);
  await expect(activo).toContainText("Endurance");
});

test("el catálogo enseña las seis muestras y sólo enlaza las montadas", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  /*
    El raíl en un navegador de verdad, que es donde se puede comprobar lo que
    jsdom no calcula: que la columna sea FINA. La petición fue «nada de una
    sidebar grande con seis cards porque volveríamos a encajonar el viewport», y
    eso es una medida, no una opinión — en reposo los nombres están ocultos por
    opacidad y la columna no debería pasar de unas pocas decenas de píxeles.
  */
  const catalogo = page.getByRole("navigation", { name: "Especímenes" });
  await expect(catalogo.locator("li")).toHaveCount(6);
  /*
    Las seis, y desde Miller y Edmunds las seis tienen puerta. El cero de abajo
    ya no comprueba «las que faltan no engañan» —no falta ninguna— sino lo
    contrario, que es lo que ahora puede romperse: que ninguna muestra montada
    pierda su `href` y vuelva a aparecer como no observable. La cobertura del
    estado deshabilitado no se pierde: vive en el fixture mixto de
    `components/observatory-chrome.test.tsx`, que es deliberadamente distinto
    del catálogo real por este mismo motivo.
  */
  await expect(catalogo.locator("a")).toHaveCount(6);
  await expect(catalogo.locator("[aria-disabled='true']")).toHaveCount(0);

  const caja = (await catalogo.boundingBox())!;
  expect(caja.width, "el catálogo dejó de ser una columna fina").toBeLessThan(
    120,
  );

  // Y el nombre existe para quien navega escuchando aunque no se vea.
  await expect(
    page.getByRole("link", { name: "Endurance", exact: true }),
  ).toHaveAttribute("href", "/es/experimentos/observatorio/endurance");
});

test("la salida del Observatorio lleva al índice de Experimentos", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  /*
    Hay DOS salidas escritas y las dos tienen que llevar al mismo sitio: la del
    HTML servido —la que existe sin JavaScript, regla 7— y la del instrumento.
    Que una apunte a otro lado es el fallo que nadie encuentra, porque cada
    quien prueba la suya.

    Pero sólo UNA está expuesta a la vez, y eso también se comprueba aquí. Con
    el instrumento encendido la cara servida va `inert`: si las dos estuvieran
    vivas habría dos salidas en el tabulador —una de ellas invisible bajo el
    espécimen— y dos enlaces con el mismo nombre accesible. De ahí que la
    servida se busque por el DOM y la del instrumento por su papel.
  */
  const salida = page.getByRole("link", { name: "Salir del Observatorio" });
  await expect(salida).toHaveAttribute("href", "/es/experimentos");

  const servida = page.locator(".observatory-face__exit a");
  await expect(servida).toHaveAttribute("href", "/es/experimentos");
  await expect(page.locator(".observatory__served")).toHaveAttribute(
    "inert",
    "",
  );

  // Y la invariante al derecho: con el instrumento en marcha, la única salida
  // que un lector de pantalla encuentra es la suya.
  await expect(
    page.getByRole("link", { name: "Volver a Experimentos" }),
  ).toHaveCount(0);
});

test("el instrumento se enciende cuando hay imagen, no cuando hay escena", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);

  /*
    EN ESPERA → NOMINAL, y por qué el orden importa.

    `createObservatoryScene` resuelve al CONSTRUIR, y entre construir y pintar
    hay una compilación de shaders que en un equipo modesto se mide en cientos
    de milisegundos. Encender el cromo con lo primero enseñaría un rectángulo
    negro con mandos encima; encenderlo con lo segundo es lo que convierte la
    entrada en un aparato que arranca.

    El estado se publica en el DOM y por eso se puede comprobar sin GPU: lo que
    se fija aquí es que existe el estado intermedio y que el final llega.
  */
  const visor = page.locator(".observatory");
  await expect(visor).toHaveAttribute("data-state", "nominal", {
    timeout: 30000,
  });

  // Con imagen, el cromo deja de ser `inert` y sus mandos existen de verdad.
  await expect(page.locator(".observatory__chrome")).not.toHaveAttribute(
    "inert",
    "",
  );
  await expect(page.getByRole("radio", { name: "Observar" })).toBeVisible();
  await abrirEstudio(page);
  await expect(page.getByRole("button", { name: "Bloom" })).toBeVisible();
});

test("en móvil la ficha es modo lectura, no el escritorio comprimido", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await contarDibujos(page);
  await page.goto("/es/experimentos/observatorio/endurance");
  await expect(page.locator(".observatory__canvas")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  /*
    El diagnóstico fue que a 375 px todo CABÍA y nada funcionaba: identidad,
    rastro, raíl, pista, `Reajustar`, panel, cuatro instrumentos, bandeja global
    y el espécimen intentando existir detrás. Ni se leía la ficha ni se observaba
    la nave.

    La respuesta son dos estados, y esto comprueba que existen de verdad. En
    observar no hay raíl vertical —depende de apuntar, y en táctil no hay dónde
    apuntar— sino el paso compacto. En leer, la ficha es una hoja inferior y se
    retira todo lo que no es identidad ni texto.

    Se mide el ALTO de la hoja porque la petición fue un rango —55-65 vh— y
    porque con una sección a la vez el contenido cae solo a la mitad de eso: sin
    un suelo, la hoja quedaba como una tira.
  */
  const rail = page.locator(".observatory__rail");
  await expect(rail).toHaveCount(1);
  await expect(rail).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Muestra anterior: Tesseracto" }),
  ).toBeVisible();

  await abrirEstudio(page);
  await page.getByRole("button", { name: "Registro", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();

  const alto = await page.evaluate(() => {
    const hoja = document.querySelector(".observatory__data")!.getBoundingClientRect();
    return Math.round((100 * hoja.height) / window.innerHeight);
  });
  expect(alto, "la hoja se salió del 55-65 vh pedido").toBeGreaterThanOrEqual(55);
  expect(alto).toBeLessThanOrEqual(65);

  // Modo lectura: fuera la pista, `Reajustar`, el banco y el paso.
  await expect(page.locator(".observatory__controls")).toBeHidden();
  await expect(page.locator(".observatory__inspect")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Muestra anterior: Tesseracto" }),
  ).toBeHidden();

  // Y la salida del modo la da la propia hoja, porque tapa el banco entero.
  await page.getByRole("button", { name: "Cerrar registro" }).click();
  await expect(page.getByRole("tabpanel")).toHaveCount(0);
  await expect(page.locator(".observatory__inspect")).toBeVisible();
});

/* ── V1.5 · observar, medir, sondar ──────────────────────────────────────── */

test("una vista cambia la geometría de la luz, y la telemetría lo demuestra", async ({
  page,
}) => {
  /*
    LA PRUEBA QUE SEPARA UNA VISTA DE UN ENCUADRE.

    `CLAVE` es el ángulo entre la luz y la mirada medido EN EL ESPÉCIMEN, y no
    se lee de ninguna tabla: lo calcula la telemetría sobre la posición real de
    la cámara. Si al elegir `RASANTE` ese número pasa de los 145° del preset a
    los 92° que declara la vista, entonces la vista está cambiando las
    CONDICIONES DE OBSERVACIÓN y no colocando una cámara a ojo.

    Es la misma afirmación que el §6 hace sobre los presets, comprobada esta vez
    a través de la pantalla y no del módulo.
  */
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });

  await abrirEstudio(page);
  /* La lectura de `CLAVE` vive ahora en su dial: el mismo número que antes se
     leía es el que ahora se puede poner. */
  const clave = page.locator(".observatory__dial").first();
  await expect(clave).toContainText("145.0°");

  await page.getByRole("radio", { name: /Rasante/ }).click();
  await expect(clave).toContainText("92.0°");

  // Y `Reajustar` devuelve la pose de casa, incluido el ángulo de clave.
  await page.getByRole("button", { name: "Reajustar" }).click();
  await expect(clave).toContainText("145.0°");
});

test("mover la luz cambia la clave y NO mueve la cámara", async ({ page }) => {
  /*
    LA PRUEBA DEL INSTRUMENTO NUEVO, y es la única forma de demostrar que hace
    lo que dice.

    `LUZ` promete algo muy concreto: la misma cara, el mismo encuadre, la misma
    distancia, otra luz. Aquí no hay una lámpara que arrastrar —la luz ES el
    origen del mundo— así que lo que el mando mueve es el espécimen alrededor de
    ese origen con la cámara rígidamente enganchada.

    Si esa construcción es correcta, `CLAVE` cambia y `AZ`, `EL` y `DIST` NO se
    mueven ni un decimal. Si alguien lo reimplementara moviendo la cámara —que
    es lo que parece más fácil— las tres lecturas se irían con ella y este test
    caería. Y cambia de verdad el material de la imagen: es la tabla del §6
    convertida en un dial.
  */
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });
  await abrirEstudio(page);

  const camara = () =>
    page.locator(".observatory__readout").first().textContent();
  const antes = await camara();
  expect(antes).toContain("AZ");

  /*
    Y el Tesseracto no trae el mando `EJE`, que es la única ausencia del
    laboratorio que no es técnica: tiene malla y se podría girar. Su orientación
    de reposo ES su lectura —el eje de la recursión casi enfilado a la cámara,
    los tres marcos uno dentro de otro— así que un dial que la deshaga no
    ofrece otra cara, le quita la suya.
  */
  await expect(page.getByRole("slider", { name: /rotación/i })).toHaveCount(0);

  const clave = page.getByRole("slider", { name: /clave/i });
  await clave.focus();
  /*
    CUARENTA PULSACIONES SON CUARENTA GRADOS, y esto es una regresión con
    nombre.

    La primera versión del mando leía `camera.position`, que sólo se actualiza
    dentro de `applyCamera` —una vez por fotograma PINTADO—, mientras la fuente
    de verdad del encuadre es la esférica. Entre dos fotogramas caben varias
    órdenes, así que cada una conservaba un desplazamiento caducado y la luz
    acababa en un sitio que no era el pedido: medido con un barrido de flechas,
    el dial saltaba de 52° a 49° en una sola pulsación.

    Comprobar el VALOR FINAL es lo que caza eso. Que la imagen cambie no
    demuestra nada —cambiaba también con la deriva—; que cuarenta pasos de un
    grado lleguen exactamente cuarenta grados más abajo, sí.
  */
  for (let i = 0; i < 40; i += 1) await page.keyboard.press("ArrowLeft");

  await expect(clave).toHaveValue("105");
  await expect(page.locator(".observatory__dial").first()).toContainText(
    "105.0°",
  );
  expect(await camara(), "mover la luz movió la cámara").toBe(antes);

  // Y `Reajustar` también devuelve la luz: la pose del preset incluye de dónde
  // viene la clave.
  await page.getByRole("button", { name: "Reajustar" }).click();
  await expect(page.locator(".observatory__dial").first()).toContainText(
    "145.0°",
  );
});

test("el eje gira la figura y deja la luz donde estaba", async ({ page }) => {
  /*
    LA PRUEBA DEL TERCER GESTO, y es la contraria de la anterior.

    `LUZ` promete «la misma cara, otra luz» y se demuestra viendo que `CLAVE`
    cambia mientras `AZ`, `EL` y `DIST` no se mueven. `EJE` promete lo simétrico
    —«otra cara, la misma luz»— así que aquí no se puede mover NINGUNA de las
    cuatro lecturas: ni las tres de cámara ni el ángulo de clave. Lo único que
    puede cambiar son los píxeles.

    Y por eso se mide también la imagen. Sin ese trozo, un mando que no hiciera
    absolutamente nada pasaría este test con matrícula: las cuatro lecturas
    quietas son justo lo que devuelve un dial desconectado. El movimiento se
    apaga antes para que el único motivo posible de un cambio de píxeles sea la
    vuelta que se acaba de pedir — con el reloj corriendo, las balizas y la
    corrección de actitud de la Endurance ya cambian la imagen solas.

    Se hace sobre la Endurance porque es donde la vuelta significa más: su eje
    es el del aro, así que girarla desfila los doce módulos por delante.
  */
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await conEscenaViva(page);
  await page.goto("/es/experimentos/observatorio/endurance");
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });
  await abrirEstudio(page);

  // Nada autónomo: a partir de aquí la imagen sólo cambia si alguien la cambia.
  await page.getByRole("button", { name: "Desactivar movimiento" }).click();
  await page.waitForTimeout(800);

  const lienzo = page.locator(".observatory__canvas");
  const camara = () =>
    page.locator(".observatory__readout").first().textContent();
  const luz = () => page.locator(".observatory__dial").first().textContent();

  const antesCamara = await camara();
  const antesLuz = await luz();
  const antesImagen = await lienzo.screenshot();

  const eje = page.getByRole("slider", { name: /rotación/i });
  await expect(eje).toHaveValue("0");
  await eje.focus();
  for (let i = 0; i < 90; i += 1) await page.keyboard.press("ArrowRight");
  await expect(eje).toHaveValue("90");
  await page.waitForTimeout(800);

  expect(await camara(), "girar la figura movió la cámara").toBe(antesCamara);
  expect(await luz(), "girar la figura movió la luz").toBe(antesLuz);
  expect(
    (await lienzo.screenshot()).equals(antesImagen),
    "el mando no cambió un solo píxel",
  ).toBe(false);

  // Y `Reajustar` devuelve también la cara: la pose del preset es una sola.
  await page.getByRole("button", { name: "Reajustar" }).click();
  await expect(eje).toHaveValue("0");
});

test("la sonda nombra una arista real del hipercubo", async ({ page }) => {
  /*
    Lo que se fija no es que la sonda acierte en un píxel concreto —la figura
    reconfigura y la pose no se repite nunca— sino que **lo que devuelve existe
    en el modelo**: un índice dentro de las treinta y dos aristas del circuito y
    uno de los cuatro ejes del 4-cubo. Un valor fuera de esos rangos sería una
    lectura inventada, que es exactamente lo que el §8 prohíbe.
  */
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await contarDibujos(page);
  await page.goto(OBSERVATORIO);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });

  await abrirEstudio(page);
  await page.getByRole("button", { name: "Sonda" }).click();

  const linea = page.locator(".observatory__probe-line");
  let lectura: string | null = null;
  // La figura ocupa el centro del cuadro; se barre hasta dar con una arista.
  for (let i = 0; i < 60 && !lectura; i += 1) {
    await page.mouse.move(460 + (i % 10) * 40, 260 + Math.floor(i / 10) * 60);
    await page.waitForTimeout(80);
    lectura = (await linea.textContent()) || null;
  }

  expect(lectura, "la sonda no encontró ninguna arista").not.toBeNull();
  const arista = lectura!.match(/Arista (\d{2}) · eje ([XYZW])/);
  expect(arista, `lectura inesperada: ${lectura}`).not.toBeNull();
  expect(Number(arista![1])).toBeGreaterThanOrEqual(1);
  expect(Number(arista![1])).toBeLessThanOrEqual(32);

  // Apagarla borra la lectura: una medición que sobrevive a su gesto miente.
  await page.getByRole("button", { name: "Sonda" }).click();
  await expect(linea).toHaveText("");
});

/*
  ── GARGANTÚA ───────────────────────────────────────────────────────────────

  El tercer espécimen, y el único sin malla. Cierra dos filas de la matriz del
  §12 que hasta ahora no se podían escribir porque no había nada que probar: O5
  entera y la mitad de O12 que habla del asentamiento.
*/

const GARGANTUA = "/es/experimentos/observatorio/gargantua";

/** Las tres lecturas de la fila `CÁMARA`, tal como están escritas en el DOM. */
async function camara(page: Page) {
  return page.locator(".observatory__readout .observatory__value").allTextContents();
}

test("O5 · Gargantúa no ofrece luz, ni material, ni sonda, ni órbita", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await conEscenaViva(page);
  await page.goto(GARGANTUA);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });
  await abrirEstudio(page);

  /*
    LO QUE NO ESTÁ, que es la mitad del contrato de este espécimen.

    `LUZ` movería el espécimen alrededor del origen para barrer su iluminación,
    y aquí el espécimen ES la fuente: el origen del mundo es el agujero y lo que
    ilumina la escena es su propio disco. `MATERIAL` escribe `uEmission`, que
    vive en el shader común de los cuerpos, y aquí no hay cuerpo. `SONDA` nombra
    aristas del hipercubo. Los tres serían mandos que no hacen nada.
  */
  await expect(page.getByRole("slider", { name: /clave/i })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: /giro/i })).toHaveCount(0);
  /* Y `EJE` tampoco: gira la malla del espécimen sobre su propio eje, y aquí no
     hay malla que girar. Es la tercera ausencia del mismo motivo. */
  await expect(page.getByRole("slider", { name: /rotación/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Material", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sonda", exact: true })).toHaveCount(0);

  // Y lo que SÍ está: tres ramas reales del raymarch, más el bloom y la ficha.
  for (const mando of ["Bloom", "Doppler", "Secundarias", "Lente", "Datos"]) {
    await expect(
      page.getByRole("button", { name: mando, exact: true }),
      mando,
    ).toHaveCount(1);
  }

  // Las cuatro vistas curadas del §7, ni una más.
  const vistas = page.getByRole("radio").filter({ hasNotText: /observar|estudio/i });
  await expect(vistas).toHaveCount(4);

  /*
    Y NO HAY ÓRBITA LIBRE. Ésta es la mitad que un test de datos no puede
    demostrar: que no existe un manejador de puntero sobre el lienzo. Se arrastra
    media pantalla y las tres lecturas de cámara tienen que salir idénticas.

    Se mide sobre la telemetría y no sobre la imagen a propósito: la imagen
    cambia sola porque el disco se devana, así que compararla no distinguiría
    «no se movió la cámara» de «no pasó el tiempo».
  */
  const antes = await camara(page);
  expect(antes).toHaveLength(3);

  const lienzo = page.locator(".observatory__canvas");
  const caja = (await lienzo.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(
      caja.x + caja.width / 2 + i * 45,
      caja.y + caja.height / 2 + i * 12,
    );
  }
  await page.mouse.up();
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(800);

  expect(await camara(page)).toEqual(antes);

  // Y la pista no promete lo que no hay: no puede decir «arrastra».
  await page.getByRole("radio", { name: "Observar", exact: true }).click();
  await expect(page.locator(".observatory__hint")).not.toContainText(/arrastra/i);
});

test("un clic conmuta el pestillo también en el espécimen más lento", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await conEscenaViva(page);
  await page.goto(GARGANTUA);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });
  await abrirEstudio(page);

  /*
    LA REGRESIÓN QUE ESTE TEST EXISTE PARA IMPEDIR, y por qué vive aquí.

    El mando distingue un clic de una comparación sostenida por cuánto dura la
    pulsación. La primera versión lo medía con `performance.now()` DENTRO del
    manejador, y sobre el Tesseracto funcionaba: medido, un clic entrega
    `pointerdown → pointerup` en 113 ms.

    Sobre Gargantúa el mismo clic medía **742 ms**, porque entre los dos eventos
    el hilo principal se queda dentro de un fotograma del raymarch. Todo clic
    pasaba por comparación y el pestillo no conmutaba nunca: un botón que no
    responde, en el espécimen donde más cuesta darse cuenta de por qué.

    Se comprueba aquí y no en jsdom porque el defecto NO existe sin un render
    lento de verdad — ahí está toda la gracia. Dos clics tienen que devolver el
    mando exactamente a donde estaba.
  */
  const bloom = page.getByRole("button", { name: "Bloom", exact: true });
  await expect(bloom).toHaveAttribute("aria-pressed", "false");

  await bloom.click();
  await expect(bloom).toHaveAttribute("aria-pressed", "true");

  await bloom.click();
  await expect(bloom).toHaveAttribute("aria-pressed", "false");
});

test("O12 · Gargantúa sigue dibujando hasta asentarse, y entonces para", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await contarDibujos(page);
  await page.goto(GARGANTUA);
  await page.locator('.observatory[data-state="nominal"]').waitFor({
    timeout: 60_000,
  });

  await abrirEstudio(page);
  await page.getByRole("button", { name: "Datos", exact: true }).click();

  /*
    LA DIFERENCIA CON LOS CINCO SÓLIDOS, dicha en un test.

    Aquéllos paran en cuanto nadie toca nada: su imagen sale de un fotograma.
    Gargantúa promedia — ocho posiciones de Halton sobre un raymarch— así que
    parar al primero dejaría a la vista el ruido de una sola muestra. Tiene que
    seguir dibujando hasta que el promedio se asiente y ENTONCES parar, que es
    literalmente lo que dice O12 para su caso.

    El movimiento se apaga primero porque `uTime` devana el disco: con el reloj
    corriendo la imagen cambia cada fotograma y no hay convergencia posible — el
    mismo motivo por el que la prueba de los sólidos también lo apaga.
  */
  await page
    .getByRole("button", { name: "Desactivar movimiento" })
    .first()
    .click();

  const promediados = page
    .locator(".observatory__data dl > div")
    .filter({ hasText: "promediados" })
    .locator("dd");

  /*
    Se espera a que el contador DEJE DE SUBIR, y no a que llegue a un número.

    Lo que O12 afirma es una propiedad —«tras el asentamiento el contador de
    renders deja de avanzar»— y el umbral concreto es un detalle de calibración
    del driver que puede subir o bajar con una captura. Escribir aquí el 48
    habría convertido una constante interna en parte del contrato público y
    obligaría a tocar este archivo cada vez que se recalibre.
  */
  let previo = -1;
  await expect
    .poll(
      async () => {
        const ahora = Number(await promediados.textContent());
        const quieto = ahora === previo && ahora > 0;
        previo = ahora;
        return quieto;
      },
      { timeout: 120_000, intervals: [1_500], message: "no llegó a asentarse" },
    )
    .toBe(true);

  /*
    Y donde para tiene que ser un asentamiento, no una muerte. Ocho posiciones
    de Halton son el supermuestreo entero: parar antes de un par de ciclos
    dejaría el moteado de unas pocas muestras a la vista, que es exactamente el
    fallo que un bucle bajo demanda mal puesto produce — y que ya se vio una vez
    durante la medición, cuando el bucle se paraba en tres fotogramas.
  */
  expect(Number(await promediados.textContent())).toBeGreaterThan(16);

  // Y una vez asentado, cero. De verdad, no «casi».
  await page.waitForTimeout(1_000);
  expect(await dibujosEn(page, "observatoryDraws")).toBe(0);

  /*
    Y elegir otra vista lo despierta: la acumulación se tira entera —la cámara
    cambió, así que el historial ya no describe este cuadro— y el bucle vuelve a
    trabajar hasta asentarse otra vez. Sin esto, «para» podría significar «se
    murió».
  */
  const antes = Number(await promediados.textContent());
  await page.getByRole("radio", { name: /Sombra/i }).click();
  await expect
    .poll(async () => Number(await promediados.textContent()), {
      timeout: 60_000,
    })
    .toBeLessThan(antes);
});
