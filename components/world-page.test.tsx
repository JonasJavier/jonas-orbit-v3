import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getWorld } from "@/lib/worlds";
import { WorldPage } from "./world-page";

describe("WorldPage", () => {
  it("el mundo es ahora una página con su propio h1", () => {
    const world = getWorld("endurance", "es");
    render(<WorldPage world={world} locale="es" />);

    // Era un h2 dentro de un scroll de siete secciones; ahora encabeza su ruta.
    expect(
      screen.getByRole("heading", { level: 1, name: world.prose.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Endurance/)).toBeInTheDocument();
  });

  it("renderiza todos los facts y panels de la prosa", () => {
    const world = getWorld("miller", "es");
    render(<WorldPage world={world} locale="es" />);

    for (const fact of world.prose.facts) {
      expect(screen.getByText(fact.value)).toBeInTheDocument();
    }
    for (const panel of world.prose.panels) {
      expect(
        screen.getByRole("heading", { level: 2, name: panel.title }),
      ).toBeInTheDocument();
    }
  });

  it("tolera panels sin tags (ranger)", () => {
    const world = getWorld("ranger", "es");
    render(<WorldPage world={world} locale="es" />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(
      world.prose.panels.length,
    );
  });

  it("ofrece los destinos contiguos: sin scroll continuo, la salida es explícita", () => {
    render(<WorldPage world={getWorld("miller", "es")} locale="es" />);
    const neighbours = screen.getByRole("navigation", {
      name: "Destinos contiguos",
    });
    // Miller es Formación y vive entre Sobre mí y Proyectos.
    expect(neighbours).toHaveTextContent("Sobre mí");
    expect(neighbours).toHaveTextContent("Proyectos");
  });

  it("los extremos del recorrido no inventan vecinos", () => {
    // Los extremos son Gargantúa (Sobre mí, orden 1) y Ranger (Contacto, 6).
    const { unmount } = render(
      <WorldPage world={getWorld("gargantua", "es")} locale="es" />,
    );
    expect(
      screen
        .getByRole("navigation", { name: "Destinos contiguos" })
        .querySelectorAll("a"),
    ).toHaveLength(1);
    unmount();

    render(<WorldPage world={getWorld("ranger", "es")} locale="es" />);
    expect(
      screen
        .getByRole("navigation", { name: "Destinos contiguos" })
        .querySelectorAll("a"),
    ).toHaveLength(1);
  });
});
