import type { Page } from "@playwright/test";

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
