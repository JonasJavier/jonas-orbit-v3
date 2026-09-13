import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { RangerReadouts } from "./ranger-cockpit";
import { RangerConsole } from "./ranger-console";
import { RangerContact } from "./ranger-contact";

const settings = vi.hoisted(() => ({ motion: true }));
vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => settings.motion }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * jsdom no tiene WebGL2 ni observadores de intersección. Este doble cubre lo
 * justo para que el ventanal crea que vuela: así se prueba el contrato de
 * consentimiento, pausa y liberación del contexto sin dibujar nada.
 */
function stubWebGL2() {
  const loseContext = vi.fn();
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    createShader: () => ({}), shaderSource: vi.fn(), compileShader: vi.fn(), getShaderParameter: () => true, deleteShader: vi.fn(),
    createProgram: () => ({}), attachShader: vi.fn(), linkProgram: vi.fn(), getProgramParameter: () => true, useProgram: vi.fn(), deleteProgram: vi.fn(),
    createBuffer: () => ({}), bindBuffer: vi.fn(), bufferData: vi.fn(), deleteBuffer: vi.fn(),
    getAttribLocation: () => 0, enableVertexAttribArray: vi.fn(), vertexAttribPointer: vi.fn(), getUniformLocation: () => ({}),
    viewport: vi.fn(), uniform2f: vi.fn(), uniform1f: vi.fn(), drawArrays: vi.fn(),
    getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null),
  };
  vi.stubGlobal("WebGL2RenderingContext", function WebGL2RenderingContext() {});
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  HTMLCanvasElement.prototype.getContext = vi.fn((kind: string) => (kind === "webgl2" ? gl : null)) as never;
  return { gl, loseContext };
}

describe("Ranger · cabina de mando", () => {
  beforeEach(() => {
    settings.motion = true;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ mode: "test", siteKey: "test" })))));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("conserva contacto, formulario, CV, destino anterior y datos estructurados", async () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Cabina de la Ranger" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Escribir un mensaje" })).toHaveAttribute("href", "#transmision");
    expect(screen.getByRole("link", { name: "Abrir consola de transmisión" })).toHaveAttribute("href", "#transmision");
    expect(screen.getByRole("form", { name: "Enviar un mensaje a Jonás" })).toBeVisible();
    expect(screen.getByRole("link", { name: /CV español/ })).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: /CV English/ })).toHaveAttribute("href", "/cv/jonas-javier-cv-en-ats.pdf");
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", expect.stringContaining("github.com"));
    const navigation = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(navigation).getByRole("link")).toHaveAttribute("href", "/es/experimentos");
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"telephone":"+18498625049"');
    expect(screen.getByText("Rumbo 097")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar transmisión" })).toBeEnabled());
  });

  it("sin WebGL2 se queda con la vista fija, sin canvas", async () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    await waitFor(() => expect(document.querySelector(".ranger-view canvas")).toBeNull());
    expect(screen.queryByRole("button", { name: /vuelo/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".ranger-view__stars circle")).toHaveLength(170);
    expect(document.querySelector(".ranger-view")).toHaveAttribute("data-flight", "off");
  });

  it("obedece al interruptor único de movimiento: vuela, se detiene y suelta el contexto", () => {
    const { loseContext } = stubWebGL2();
    const { rerender } = render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    const bridge = screen.getByRole("region", { name: "Cabina de la Ranger" });
    expect(bridge).toHaveAttribute("data-motion", "on");
    expect(document.querySelector(".ranger-view canvas")).not.toBeNull();
    // Ningún interruptor propio: el de la bandeja gobierna todo el sitio.
    expect(screen.queryByRole("button", { name: /vuelo/ })).toBeNull();
    settings.motion = false;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(bridge).toHaveAttribute("data-motion", "off");
    expect(document.querySelector(".ranger-view canvas")).toBeNull();
    expect(loseContext).toHaveBeenCalledTimes(1);
    settings.motion = true;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).not.toBeNull();
  });

  it("apuntar una frecuencia la escribe en el HUD y soltarla lo limpia", () => {
    stubWebGL2();
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    const readout = screen.getByText("Frecuencia").nextElementSibling as HTMLElement;
    expect(readout).toHaveTextContent("— elige una —");
    const email = screen.getByRole("link", { name: /01 \/ CORREO/ });
    fireEvent.pointerEnter(email.closest("article")!);
    expect(readout).toHaveTextContent("01 · Correo");
    fireEvent.pointerLeave(email.closest("article")!);
    expect(readout).toHaveTextContent("— elige una —");
    fireEvent.focus(screen.getByRole("link", { name: /03 \/ TELÉFONO/ }));
    expect(readout).toHaveTextContent("03 · Teléfono");
  });

  it("la hora del HUD es la de Santo Domingo, en HH:MM", () => {
    render(<RangerReadouts destination="06 / RANGER" />);
    expect(screen.getByText("Hora en Santo Domingo").nextElementSibling).toHaveTextContent(/^\d{2}:\d{2}$/);
  });

  it("expone las tres direcciones reales y copia correo y teléfono", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ContactChannels />);
    expect(screen.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
    expect(screen.getByRole("link", { name: /02 \/ WHATSAPP/ })).toHaveAttribute("href", expect.stringContaining("https://wa.me/18498625049"));
    expect(screen.getByRole("link", { name: /03 \/ TELÉFONO/ })).toHaveAttribute("href", "tel:+18498625049");
    fireEvent.click(screen.getByRole("button", { name: "Copiar jonasjavier.dev@gmail.com" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Correo copiado."));
    expect(writeText).toHaveBeenLastCalledWith("jonasjavier.dev@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: "Copiar +1 (849) 862-5049" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Número copiado."));
    expect(writeText).toHaveBeenLastCalledWith("+18498625049");
  });

  it("si falla el portapapeles explica la alternativa y conserva los enlaces", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<ContactChannels />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar jonasjavier.dev@gmail.com" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No se pudo copiar."));
    expect(screen.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
  });

  it("la consola mide la señal campo a campo y las misiones escriben en el select real", async () => {
    render(<RangerConsole />);
    const meter = () => screen.getByText(/^Señal \d\/4/);
    expect(meter()).toHaveTextContent("Señal 0/4 · esperando tus datos");
    fireEvent.input(screen.getByLabelText("Nombre"), { target: { value: "Ada" } });
    expect(meter()).toHaveTextContent("Señal 1/4");
    fireEvent.input(screen.getByLabelText("Correo"), { target: { value: "ada@" } });
    expect(meter()).toHaveTextContent("Señal 1/4");
    fireEvent.input(screen.getByLabelText("Correo"), { target: { value: "ada@example.com" } });
    expect(meter()).toHaveTextContent("Señal 2/4");
    const mission = screen.getByRole("button", { name: /Mejorar un sistema/ });
    expect(mission).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mission);
    expect(mission).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Tipo de misión")).toHaveValue("system");
    expect(meter()).toHaveTextContent("Señal 3/4");
    fireEvent.change(screen.getByLabelText("Tipo de misión"), { target: { value: "product" } });
    expect(mission).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Construir un producto/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.input(screen.getByLabelText("Mensaje"), { target: { value: "Quiero construir una herramienta clara." } });
    expect(meter()).toHaveTextContent("Señal 4/4 · lista para transmitir");
    expect(document.querySelector(".ranger-meter")).toHaveAttribute("data-complete", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar transmisión" })).toBeEnabled());
  });
});
