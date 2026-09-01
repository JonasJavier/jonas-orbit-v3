import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorldNavItem } from "@/lib/worlds";
import { SystemHud } from "./system-hud";

const mode = vi.hoisted(() => ({
  forced: false,
  reduced: false,
  setForced: vi.fn<(value: boolean) => void>(),
}));

vi.mock("@/lib/effects-mode", () => ({
  setForcedEffects: (value: boolean) => mode.setForced(value),
  useForcedEffects: () => mode.forced,
}));

vi.mock("@/lib/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => mode.reduced,
}));

const WORLD = {
  id: "gargantua",
  cosmicName: "Gargantúa",
  shortLabel: "Perfil",
} as WorldNavItem;

function setScene(level: string, reason: string) {
  document.documentElement.dataset.scene = level;
  document.documentElement.dataset.sceneReason = reason;
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

describe("SystemHud — control único y reversible de animación", () => {
  beforeEach(() => {
    mode.forced = false;
    mode.reduced = false;
    mode.setForced.mockReset();
    delete document.documentElement.dataset.scene;
    delete document.documentElement.dataset.sceneReason;
  });

  it("ofrece activar la animación cuando el gate parte en flat", async () => {
    mode.reduced = true;
    setScene("flat", "movimiento-reducido");
    renderHud();

    const control = await screen.findByRole("button", {
      name: "Activar animación 3D",
    });
    expect(control).toBeEnabled();
    expect(control).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelectorAll(".hud__effects-toggle")).toHaveLength(1);

    fireEvent.click(control);
    expect(mode.setForced).toHaveBeenCalledWith(true);
  });

  it("también activa desde flat si la causa es una heurística de capacidad", async () => {
    setScene("flat", "gpu-por-software");
    renderHud();

    const control = await screen.findByRole("button", {
      name: "Activar animación 3D",
    });
    expect(control).toHaveTextContent("Activar animación");
    expect(screen.queryByRole("link", { name: /Reducir efectos/ })).toBeNull();
  });

  it("no promete una escena cuando falta WebGL2", async () => {
    setScene("flat", "sin-webgl2");
    renderHud();

    const control = await screen.findByRole("button", {
      name: "Animación 3D no disponible",
    });
    expect(control).toBeDisabled();
    fireEvent.click(control);
    expect(mode.setForced).not.toHaveBeenCalled();
  });

  it("permite volver al mapa quieto tras una activación voluntaria", async () => {
    mode.forced = true;
    mode.reduced = true;
    setScene("orbit", "ok");
    renderHud();

    const control = await screen.findByRole("button", {
      name: "Volver al mapa sin animación",
    });
    expect(control).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(control);
    expect(mode.setForced).toHaveBeenCalledWith(false);
  });

  it("mantiene el perfil ligero documentado para una escena normal", async () => {
    setScene("deep", "ok");
    renderHud();

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Reducir efectos 3D" }),
      ).toHaveAttribute("href", "?no3d=1");
    });
    expect(screen.queryByRole("button")).toBeNull();
  });
});
