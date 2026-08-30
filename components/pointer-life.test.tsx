import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getNavigationPointerState, PointerLife } from "./pointer-life";

describe("PointerLife", () => {
  afterEach(() => {
    delete document.documentElement.dataset.pointerLife;
  });

  it("mantiene cursor y polvo apagados bajo reduced motion", () => {
    const { container } = render(
      <>
        <div className="system-map" />
        <PointerLife disabled scopeKey="/es" />
      </>,
    );

    expect(document.documentElement).toHaveAttribute(
      "data-pointer-life",
      "off",
    );
    expect(container.querySelector(".system-map")).not.toHaveAttribute(
      "data-navigation-cursor",
    );
    expect(container.querySelector(".navigation-cursor")).toHaveAttribute(
      "data-state",
      "hidden",
    );
    expect(container.querySelector(".site-stardust")).toHaveAttribute(
      "data-active-particles",
      "0",
    );
  });

  it("cede el cursor nativo a controles pero prioriza los proxies de mundo", () => {
    const hudAction = document.createElement("a");
    const roleButton = document.createElement("span");
    const worldProxy = document.createElement("a");
    const worldChild = document.createElement("span");
    roleButton.setAttribute("role", "button");
    worldProxy.dataset.systemBody = "miller";
    worldProxy.append(worldChild);

    expect(getNavigationPointerState(hudAction)).toBe("control");
    expect(getNavigationPointerState(roleButton)).toBe("control");
    expect(getNavigationPointerState(worldChild)).toBe("target");
    expect(getNavigationPointerState(document.createElement("div"))).toBe(
      "space",
    );
  });
});
