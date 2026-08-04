import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNarrativeWorldSummaries } from "@/lib/narrative-types";
import { getWorlds } from "@/lib/worlds";
import { NarrativeExperience } from "./narrative-experience";

vi.mock("@/lib/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => true,
}));

class ObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

describe("NarrativeExperience", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.stubGlobal("ResizeObserver", ObserverStub);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("A16 · conserva los siete destinos y omite el canvas con reduced-motion", () => {
    const worlds = getNarrativeWorldSummaries(getWorlds("es"));
    render(
      <NarrativeExperience worlds={worlds}>
        <main>
          {worlds.map((world) => (
            <section data-world={world.id} key={world.id}>
              <h2>{world.shortLabel}</h2>
            </section>
          ))}
        </main>
      </NarrativeExperience>,
    );

    for (const world of worlds) {
      expect(
        screen.getByRole("heading", { level: 2, name: world.shortLabel }),
      ).toBeVisible();
    }
    expect(screen.queryByTestId("starfield-2d")).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    expect(
      screen.getByRole("progressbar", { name: "Progreso del recorrido" }),
    ).toBeInTheDocument();
  });
});
