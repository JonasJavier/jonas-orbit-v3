import { afterEach, describe, expect, it, vi } from "vitest";
import { drawNebula } from "./nebula";

afterEach(() => vi.restoreAllMocks());

function canvasHarness() {
  const images: ImageData[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    createImageData(width: number, height: number) {
      const image = { width, height, data: new Uint8ClampedArray(width * height * 4) } as ImageData;
      images.push(image);
      return image;
    },
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  return { context, images };
}

describe("distant nebula", () => {
  it("keeps empty sky transparent instead of covering the atlas with black", () => {
    const { context, images } = canvasHarness();
    drawNebula(context, 1440, 860);
    const pixels = images[0].data;
    let transparent = 0;
    let visibleGas = 0;
    let maxAlpha = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) transparent++;
      if (alpha > 20) visibleGas++;
      maxAlpha = Math.max(maxAlpha, alpha);
    }
    // This is emission over a separate atlas, never an opaque painted sky.
    expect(maxAlpha).toBeLessThan(128);
    const area = images[0].width * images[0].height;
    expect(transparent / area).toBeGreaterThan(0.1);
    expect(visibleGas / area).toBeGreaterThan(0.01);
  });

  it("bounds the bake at 4K and reuses it for frames and equal-aspect resizes", () => {
    const { context, images } = canvasHarness();
    drawNebula(context, 3840, 2160);
    drawNebula(context, 3840, 2160);
    drawNebula(context, 1920, 1080);
    expect(images).toHaveLength(1);
    expect(images[0].width * images[0].height).toBeLessThanOrEqual(640 * 640);
    drawNebula(context, 375, 812);
    expect(images).toHaveLength(2);
    expect(Math.max(images[1].width, images[1].height)).toBeLessThanOrEqual(640);
  });
});
