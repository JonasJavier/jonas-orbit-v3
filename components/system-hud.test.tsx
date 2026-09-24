import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { WorldNavItem } from "@/lib/worlds";
import { SystemHud } from "./system-hud";

const WORLD = {
  id: "gargantua",
  cosmicName: "Gargantúa",
  shortLabel: "Perfil",
} as WorldNavItem;

function setScene(level: string) {
  document.documentElement.dataset.scene = level;
}

function renderHud() {
  return render(
    <SystemHud
      activeWorldId={null}
      navigationState="idle"
      worlds={[WORLD]}
    />,
  );
}

/**
 * El HUD ya no lleva ningún control de efectos: el interruptor único de
 * movimiento vive en la bandeja inferior derecha, en todas las rutas. Aquí
 * sólo se lee el nivel real que publica el gate.
 */
describe("SystemHud — lecturas sin control propio", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.scene;
  });

  it("no ofrece ningún botón ni enlace de efectos", async () => {
    setScene("flat");
    renderHud();
    await waitFor(() => expect(screen.getByText(/FLAT/)).toBeInTheDocument());
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link", { name: /Reducir/ })).toBeNull();
    expect(document.querySelector(".hud__effects-toggle")).toBeNull();
  });

  it("no superpone marcas de calibración en el centro de Gargantúa", () => {
    const { container } = renderHud();

    expect(container.querySelector(".hud__reticle")).toBeNull();
    expect(container.querySelectorAll(".hud__bracket")).toHaveLength(4);
  });

  it("lee el nivel real de la escena desde el documento", async () => {
    setScene("orbit");
    renderHud();
    await waitFor(() => expect(screen.getByText(/NOMINAL/)).toBeInTheDocument());
    setScene("deep");
    await waitFor(() => expect(screen.getByText(/NOMINAL/)).toBeInTheDocument());
  });
});
