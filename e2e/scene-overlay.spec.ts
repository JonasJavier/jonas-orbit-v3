import { expect, test } from "@playwright/test";

/**
 * El marco del overlay del System Map.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * Aquí vivió durante meses el peor fallo de interacción que ha tenido la
 * escena, y ninguna prueba lo veía. La escena publica `--map-x` / `--map-y` en
 * **píxeles del viewport** —los proyecta contra `canvas.clientWidth/Height`, y
 * el canvas es `position: fixed; inset: 0`— pero el overlay que los consume
 * vivía dentro de `.system-home`, que es `width: min(100%, 92rem)` centrada.
 * Por encima de 1472 px de ventana, cada destino quedaba desplazado
 * (viewport − 1472)/2 hacia la derecha: +224 px a 1920, +544 px a 2560. El
 * blanco de clic de un planeta estaba a media pantalla de su planeta.
 *
 * Sobrevivió porque el resto de la suite mira a 1440 —justo por debajo del
 * umbral— y porque toda la cobertura de la home usa `?no3d=1`, donde el atlas
 * plano se compone en porcentajes del contenedor y por tanto es CORRECTO que
 * viva en la columna.
 *
 * ── Por qué no hace falta WebGL ─────────────────────────────────────────────
 *
 * Lo que falló no fue la proyección: fue el MARCO. Y el marco lo decide el CSS
 * a partir de `data-scene-live`, un atributo que la escena publica con su
 * primer fotograma. Forzarlo a mano deja el contrato desnudo y comprobable sin
 * GPU, sin esperar a un raymarch y sin flakiness: *un destino colocado en el
 * píxel N del viewport tiene que aterrizar en el píxel N del viewport*.
 */

const WIDE = [
  { width: 1440, height: 860 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1400 },
];

/** Enciende el marco de la escena sin necesitar la escena. */
async function pretendSceneIsLive(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.sceneLive = "true";
  });
}

for (const viewport of WIDE) {
  test(`overlay: el mapa mide en píxeles de viewport a ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/es?no3d=1");
    await pretendSceneIsLive(page);

    const map = await page.locator(".system-map").boundingBox();
    expect(map).not.toBeNull();
    expect(map!.x).toBe(0);
    expect(map!.y).toBe(0);
    expect(map!.width).toBe(viewport.width);
    expect(map!.height).toBe(viewport.height);
  });

  test(`overlay: un destino cae donde la escena lo pone a ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/es?no3d=1");
    await pretendSceneIsLive(page);

    // Coordenadas deliberadamente lejos del centro y del eje: un desfase de
    // contenedor centrado no se nota si se prueba en mitad de la pantalla.
    const target = { x: Math.round(viewport.width * 0.82), y: 240 };
    await page.evaluate((at) => {
      const slot = document.querySelector<HTMLElement>('[data-map-world="miller"]');
      if (!slot) throw new Error("falta el destino miller");
      slot.style.setProperty("--map-x", `${at.x}px`);
      slot.style.setProperty("--map-y", `${at.y}px`);
      slot.style.setProperty("--map-radius", "40px");
      slot.style.setProperty("--map-hit-radius-x", "40px");
      slot.style.setProperty("--map-hit-radius-y", "40px");
    }, target);

    const proxy = await page
      .locator('[data-hitbox-proxy="miller"]')
      .boundingBox();
    expect(proxy).not.toBeNull();
    expect(proxy!.x + proxy!.width / 2).toBeCloseTo(target.x, 0);
    expect(proxy!.y + proxy!.height / 2).toBeCloseTo(target.y, 0);
  });
}

test("atlas plano: la composición sigue viviendo en la columna de contenido", async ({
  page,
}) => {
  // La contraparte del contrato de arriba, y no es una simetría decorativa: el
  // atlas se compone en PORCENTAJES de su contenedor, así que llevarlo al
  // viewport entero cambiaría su composición en pantallas anchas. Cada modo
  // tiene su marco y esta prueba impide que el arreglo de uno se lleve al otro.
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.goto("/es?no3d=1");

  const home = await page.locator(".system-home").boundingBox();
  const map = await page.locator(".system-map").boundingBox();
  expect(home).not.toBeNull();
  expect(map).not.toBeNull();
  expect(home!.width).toBeLessThan(2560);
  expect(map!.x).toBeCloseTo(home!.x, 0);
  expect(map!.width).toBeCloseTo(home!.width, 0);
});
