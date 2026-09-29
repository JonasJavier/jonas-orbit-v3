import { test, type Page } from "@playwright/test";

/** A real product profile: no WebGL, independently of the host's GPU. */
export async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind === "webgl" || kind === "webgl2") return null;
        return Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
}

/**
 * Salta la prueba si ESTE navegador de prueba no tiene WebGL2.
 *
 * Firefox headless en un runner sin GPU no ofrece WebGL2 (ni forzándolo por
 * preferencias): el sitio cae, bien, a su perfil plano —`sin-webgl2`, que ya
 * prueba `withoutWebGL`— y una prueba de la escena no tiene nada que probar.
 * No es una excusa para el fallo: en cualquier navegador con WebGL2 (Chromium
 * en CI, Firefox con GPU) la prueba corre entera.
 */
export async function skipWithoutWebGL2(page: Page) {
  const hasWebGL2 = await page.evaluate(
    () => document.createElement("canvas").getContext("webgl2") !== null,
  );
  test.skip(!hasWebGL2, "Este navegador de prueba no tiene WebGL2: el sitio cae al perfil plano.");
}
