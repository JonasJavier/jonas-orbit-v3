import { describe, expect, it } from "vitest";
import {
  shouldNavigateToWorld,
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
