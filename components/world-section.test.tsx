import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getWorld } from "@/lib/worlds";
import { WorldSection } from "./world-section";

describe("WorldSection", () => {
  it("renderiza el mundo como sección semántica con su ancla localizada", () => {
    const world = getWorld("endurance", "es");
    render(<WorldSection world={world} />);

    const section = document.getElementById("proyectos");
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe("SECTION");

    expect(
      screen.getByRole("heading", { level: 2, name: world.prose.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Endurance/)).toBeInTheDocument();
  });

  it("renderiza todos los facts y panels de la prosa", () => {
    const world = getWorld("miller", "es");
    render(<WorldSection world={world} />);

    for (const fact of world.prose.facts) {
      expect(screen.getByText(fact.value)).toBeInTheDocument();
    }
    for (const panel of world.prose.panels) {
      expect(
        screen.getByRole("heading", { level: 3, name: panel.title }),
      ).toBeInTheDocument();
    }
  });

  it("tolera panels sin tags (ranger)", () => {
    const world = getWorld("ranger", "es");
    render(<WorldSection world={world} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      world.prose.panels.length,
    );
  });
});
