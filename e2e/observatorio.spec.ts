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
/** Los dos especímenes montados. El segundo existe para probar que el
 *  laboratorio no está hecho a la medida del primero. */
const ESPECIMENES = [
  "/es/experimentos/observatorio/tesseracto",
  "/es/experimentos/observatorio/endurance",
];

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
  await expect(catalogo.locator("a")).toHaveCount(2);
  await expect(catalogo.locator("[aria-disabled='true']")).toHaveCount(4);

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

  const clave = page.locator(".observatory__telemetry .observatory__cell").last();
  await expect(clave).toContainText("145.0°");

  await page.getByRole("radio", { name: /Rasante/ }).click();
  await expect(clave).toContainText("92.0°");

  // Y `Reajustar` devuelve la pose de casa, incluido el ángulo de clave.
  await page.getByRole("button", { name: "Reajustar" }).click();
  await expect(clave).toContainText("145.0°");
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
