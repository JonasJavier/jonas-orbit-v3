import { expect, test, type Page } from "@playwright/test";
import { MAP_HOVER_MODE } from "../lib/map-hover";

/**
 * La travesía espacio-temporal, vista desde el DOM (G9 y G10 del pivote).
 *
 * Sin GPU no hay escena viva, así que aquí corre siempre la versión reducida
 * —zoom y fundido en el DOM, medio segundo— y lo que se comprueba es el
 * CONTRATO con el router y con el visitante: la travesía se publica en
 * `<html>`, la ruta cambia sola, se corta con una tecla, se completa aunque
 * nadie dibuje un fotograma y no deja rastro al llegar.
 */

interface VoyageLog {
  states: string[];
  modes: string[];
  skipped: boolean;
}

/** Graba cada valor por el que pasa `data-voyage`: dura menos de un segundo. */
async function recordVoyage(page: Page) {
  await page.addInitScript(() => {
    const log: VoyageLog = { states: [], modes: [], skipped: false };
    (window as unknown as { voyageLog: VoyageLog }).voyageLog = log;
    // El script de inicio corre antes de que exista <html>: se observa el
    // documento entero y se filtra por los atributos de la travesía.
    new MutationObserver(() => {
      const root = document.documentElement;
      if (!root) return;
      const state = root.dataset.voyage;
      if (state && log.states[log.states.length - 1] !== state) log.states.push(state);
      const mode = root.dataset.voyageMode;
      if (mode && !log.modes.includes(mode)) log.modes.push(mode);
      if (root.dataset.voyageSkipped === "true") log.skipped = true;
    }).observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-voyage", "data-voyage-mode", "data-voyage-skipped"],
    });
  });
}

function readLog(page: Page) {
  return page.evaluate(
    () => (window as unknown as { voyageLog: VoyageLog }).voyageLog,
  );
}

function systemMap(page: Page) {
  return page.getByRole("navigation", { name: "Destinos del Sistema Gargantúa" });
}

test.beforeEach(async ({ page }) => {
  await recordVoyage(page);
});

test("un clic en un destino publica la travesía, cambia la ruta y limpia <html>", async ({ page }) => {
  await page.goto("/es?no3d=1");
  await systemMap(page).getByRole("link", { name: /Formación Miller/i }).click();
  await expect(page).toHaveURL(/\/es\/formacion$/);

  // Al llegar no queda rastro: ni atributos ni variables.
  await expect(page.locator("html")).not.toHaveAttribute("data-voyage", /.+/);
  await expect(page.locator("html")).not.toHaveAttribute("data-voyage-mode", /.+/);
  const cleared = await page.evaluate(
    () => document.documentElement.style.getPropertyValue("--voyage-tint"),
  );
  expect(cleared).toBe("");

  const log = await readLog(page);
  expect(log.states).toEqual(["depart", "flash", "arrive"]);
  expect(log.modes).toEqual(["short"]);
  expect(log.skipped).toBe(false);
});

test("mientras se viaja, el mapa no recibe puntero y el destino queda bloqueado", async ({ page }) => {
  await page.goto("/es?no3d=1");
  // El estado de la travesía se publica en la misma tarea que el clic; el
  // «locked» del HUD lo pinta React en la siguiente. Se lee todo tras un tick,
  // muy por debajo de los 300 ms que dura el despegue reducido.
  const snapshot = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>(
      '.nav-rail a[data-rail-world="endurance"]',
    );
    link?.click();
    const root = document.documentElement;
    const map = document.querySelector(".system-map");
    const immediate = root.dataset.voyage;
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      immediate,
      voyage: root.dataset.voyage,
      world: root.dataset.voyageWorld,
      tint: root.style.getPropertyValue("--voyage-tint"),
      origin: root.style.getPropertyValue("--voyage-x"),
      pointer: map ? getComputedStyle(map).pointerEvents : null,
      locked: link?.dataset.targetState,
    };
  });
  expect(snapshot.immediate).toBe("depart");
  expect(snapshot.voyage).toBe("depart");
  expect(snapshot.world).toBe("endurance");
  expect(snapshot.tint).toBe("#f0bc72");
  expect(snapshot.origin).toMatch(/%$/);
  expect(snapshot.pointer).toBe("none");
  // El bloqueo se escribe siempre; PINTARLO en el raíl es cosa del modo
  // `instrumento`. En `sencillo` (§14 de endurance-navigation-interface.md) el
  // destino no se marca, y el mapa sin puntero es el bloqueo que se ve.
  expect(snapshot.locked).toBe(MAP_HOVER_MODE === "instrumento" ? "locked" : "idle");
  await expect(page).toHaveURL(/\/es\/proyectos$/);
});

test("G9 · una tecla corta la travesía y la ruta llega igual", async ({ page }) => {
  await page.goto("/es?no3d=1");
  await page.evaluate(() => {
    document
      .querySelector<HTMLAnchorElement>('.nav-rail a[data-rail-world="ranger"]')
      ?.click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  await expect(page).toHaveURL(/\/es\/contacto$/);
  const log = await readLog(page);
  expect(log.skipped).toBe(true);
  // Despegue y corte ocurren en la misma tarea, así que el observador ve ya
  // la luz encendida: lo que importa es que se cruzó y se llegó.
  expect(log.states).toContain("flash");
  expect(log.states).toContain("arrive");
  await expect(page.locator("html")).not.toHaveAttribute("data-voyage", /.+/);
});

test("G10 · la ruta se completa aunque requestAnimationFrame no llegue a correr", async ({ page }) => {
  // La animación puede no dibujar ni un fotograma —pestaña oculta, GPU
  // saturada— y el router tiene que recibir la ruta igual: va por temporizador.
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  await page.goto("/es?no3d=1");
  await systemMap(page).getByRole("link", { name: /Experimentos Tesseracto/i }).click();
  await expect(page).toHaveURL(/\/es\/experimentos$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-voyage", /.+/);
});

test("un clic modificado no arranca ninguna travesía", async ({ page }) => {
  await page.goto("/es?no3d=1");
  const context = page.context();
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    systemMap(page)
      .getByRole("link", { name: /Creatividad Edmunds/i })
      .click({ modifiers: ["ControlOrMeta"] }),
  ]);
  await popup.close();
  // La página de origen no se mueve: ni ruta nueva ni travesía.
  await expect(page).toHaveURL(/\/es\?no3d=1$/);
  const log = await readLog(page);
  expect(log.states).toEqual([]);
});
