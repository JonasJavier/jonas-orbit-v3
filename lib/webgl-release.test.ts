import { afterEach, describe, expect, it, vi } from "vitest";
import { releaseWhenDetached } from "./webgl-release";

function fakeContext() {
  const loseContext = vi.fn();
  const gl = { getExtension: vi.fn(() => ({ loseContext })) } as unknown as WebGL2RenderingContext;
  return { gl, loseContext };
}

describe("releaseWhenDetached", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("keeps the context of a canvas that stays mounted (StrictMode, Fast Refresh)", () => {
    vi.useFakeTimers();
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const { gl, loseContext } = fakeContext();
    releaseWhenDetached(canvas, gl);
    vi.runAllTimers();
    expect(loseContext).not.toHaveBeenCalled();
  });

  it("releases the context once the canvas has left the document", () => {
    vi.useFakeTimers();
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const { gl, loseContext } = fakeContext();
    releaseWhenDetached(canvas, gl);
    canvas.remove();
    vi.runAllTimers();
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
});
