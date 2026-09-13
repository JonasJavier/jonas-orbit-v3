import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { RangerCockpit } from "./ranger-cockpit";
import { RangerContact } from "./ranger-contact";

const settings = vi.hoisted(() => ({ reduced: false, light: false }));
vi.mock("@/lib/use-prefers-reduced-motion", () => ({ usePrefersReducedMotion: () => settings.reduced }));
vi.mock("@/lib/effects-mode", () => ({ useLightEffectsMode: () => settings.light }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("Ranger · cabina de comunicaciones", () => {
  beforeEach(() => {
    settings.reduced = false;
    settings.light = false;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ mode: "test", siteKey: "test" })))));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("conserva contacto, formulario, CV, destino anterior y datos estructurados", async () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Escribir un mensaje" })).toHaveAttribute("href", "#transmision");
    expect(screen.getByRole("form", { name: "Enviar un mensaje a Jonás" })).toBeVisible();
    expect(screen.getByRole("link", { name: /CV español/ })).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: /CV English/ })).toHaveAttribute("href", "/cv/jonas-javier-cv-en-ats.pdf");
    const navigation = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(navigation).getByRole("link")).toHaveAttribute("href", "/es/experimentos");
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"telephone":"+18498625049"');
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar transmisión" })).toBeEnabled());
  });

  it("expone las tres direcciones reales y copia correo y teléfono", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ContactChannels />);
    expect(screen.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
    expect(screen.getByRole("link", { name: /02 \/ WHATSAPP/ })).toHaveAttribute("href", expect.stringContaining("https://wa.me/18498625049"));
    expect(screen.getByRole("link", { name: /03 \/ TELÉFONO/ })).toHaveAttribute("href", "tel:+18498625049");
    fireEvent.click(screen.getByRole("button", { name: "Copiar correo" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Correo copiado."));
    expect(writeText).toHaveBeenLastCalledWith("jonasjavier.dev@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: "Copiar teléfono" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Número copiado."));
    expect(writeText).toHaveBeenLastCalledWith("+18498625049");
  });

  it("si falla el portapapeles explica la alternativa y conserva los enlaces", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<ContactChannels />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar correo" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No se pudo copiar."));
    expect(screen.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
  });

  it("emite una prueba finita sin red, evita dobles pulsaciones y permite repetir", () => {
    vi.useFakeTimers();
    render(<RangerCockpit><p>Contenido íntegro</p></RangerCockpit>);
    fireEvent.click(screen.getByRole("button", { name: "Probar señal" }));
    expect(screen.getByRole("status")).toHaveTextContent("Buscando el eco");
    fireEvent.click(screen.getByRole("button", { name: "Emitiendo señal" }));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByRole("status")).toHaveTextContent("Prueba recibida");
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Repetir señal" }));
    expect(screen.getByRole("status")).toHaveTextContent("Buscando el eco");
  });

  it.each(["reduced", "light"] as const)("con %s confirma al pulsar sin animación ni temporizador", (mode) => {
    vi.useFakeTimers();
    settings[mode] = true;
    render(<RangerCockpit><p>Contenido íntegro</p></RangerCockpit>);
    expect(screen.getByRole("region")).toHaveAttribute("data-motion", "false");
    fireEvent.click(screen.getByRole("button", { name: "Probar señal" }));
    expect(screen.getByRole("status")).toHaveTextContent("Prueba recibida");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancela la señal pendiente al salir de la cabina", () => {
    vi.useFakeTimers();
    const { unmount } = render(<RangerCockpit><p>Cabina</p></RangerCockpit>);
    fireEvent.click(screen.getByRole("button", { name: "Probar señal" }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
