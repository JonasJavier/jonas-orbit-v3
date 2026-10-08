import { renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelVoyage } from "./voyage-controller";
import {
  shouldNavigateToWorld,
  useWorldNavigation,
  voyageModeFor,
  type WorldNavigationActivation,
} from "./world-navigation";

const primaryClick: WorldNavigationActivation = {
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  button: 0,
};

describe("shouldNavigateToWorld", () => {
  it("intercepta únicamente el clic principal simple", () => {
    expect(shouldNavigateToWorld(primaryClick)).toBe(true);
  });

  it.each([
    ["ya cancelado", { defaultPrevented: true }],
    ["Cmd/Meta", { metaKey: true }],
    ["Ctrl", { ctrlKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["botón central", { button: 1 }],
    ["botón secundario", { button: 2 }],
  ])("cede al navegador cuando el evento está %s", (_name, override) => {
    expect(shouldNavigateToWorld({ ...primaryClick, ...override })).toBe(false);
  });
});

describe("voyageModeFor", () => {
  it("la travesía completa sólo existe con la escena viva y dibujando", () => {
    expect(voyageModeFor({ dataset: { sceneLive: "true" } })).toBe("full");
  });

  it.each([
    ["sin escena (mapa plano, movimiento apagado, sin WebGL2)", {}],
    ["con la escena montada pero sin su primera proyección", { scene: "deep" }],
    ["con el valor en falso", { sceneLive: "false" }],
  ])("va reducida %s", (_name, dataset) => {
    expect(voyageModeFor({ dataset })).toBe("short");
  });
});

describe("useWorldNavigation", () => {
  afterEach(() => cancelVoyage());

  it("pide la ruta al despegar, no en el pico de la travesía", () => {
    // Un toque no tiene hover que precargue: sin esto la red esperaba los
    // 2 s del despegue (2026-10-07).
    const router = useRouter();
    vi.mocked(router.prefetch).mockClear();
    const { result } = renderHook(() => useWorldNavigation());
    result.current({ id: "miller", href: "/es/formacion" });
    expect(router.prefetch).toHaveBeenCalledWith("/es/formacion");
    expect(router.push).not.toHaveBeenCalled();
  });
});
