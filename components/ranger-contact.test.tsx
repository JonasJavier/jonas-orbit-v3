import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { ContactChannels } from "./contact-channels";
import { RangerReadouts } from "./ranger-cockpit";
import { RangerConsole } from "./ranger-console";
import { RangerContact } from "./ranger-contact";

const settings = vi.hoisted(() => ({ motion: true, explicit: false, renderer: "ANGLE (AMD Radeon)" }));
vi.mock("@/lib/effects-mode", () => ({ useMotionEnabled: () => settings.motion, useExplicitEffects: () => settings.explicit }));
// Las señales del equipo, sin navegador: sólo cambia el renderer.
vi.mock("@/components/scene/capability", async (original) => ({
  ...(await original<typeof import("@/components/scene/capability")>()),
  readSignals: ({ forced, explicit }: { forced?: boolean; explicit?: boolean }) => ({
    hasWebGL2: true, renderer: settings.renderer, reducedMotion: false, lightEffects: false, forced, explicit,
    coarsePointer: false, viewportWidth: 1440, devicePixelRatio: 1,
  }),
}));
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
    settings.explicit = false;
    settings.renderer = "ANGLE (AMD Radeon)";
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ mode: "test", siteKey: "test" })))));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("conserva contacto, formulario, CV, destino anterior y datos estructurados", async () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Cabina de la Ranger" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Escribir un mensaje" })).toHaveAttribute("href", "#transmision");
    // Un solo botón hacia el formulario: el de la primera pantalla.
    expect(document.querySelectorAll('a[href="#transmision"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "o abrir mi correo" })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
    expect(screen.getByRole("form", { name: "Enviar un mensaje a Jonás" })).toBeVisible();
    expect(screen.getByRole("link", { name: /CV español/ })).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: /CV English/ })).toHaveAttribute("href", "/cv/jonas-javier-cv-en-ats.pdf");
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", expect.stringContaining("github.com"));
    const navigation = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(navigation).getByRole("link")).toHaveAttribute("href", "/es/experimentos");
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"telephone":"+18498625049"');
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar transmisión" })).toBeEnabled());
  });

  it("sin WebGL2 se queda con la vista fija del túnel, sin canvas", async () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    await waitFor(() => expect(document.querySelector(".ranger-view canvas")).toBeNull());
    expect(screen.queryByRole("button", { name: /vuelo/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".ranger-view__tunnel path")).toHaveLength(150);
    expect(document.querySelector(".ranger-view__ring")).not.toBeNull();
    expect(document.querySelector(".ranger-view")).toHaveAttribute("data-flight", "off");
  });

  it("obedece al interruptor único de movimiento: vuela, se congela sin soltar el cuadro y libera el contexto al salir", async () => {
    const { loseContext } = stubWebGL2();
    const { rerender, unmount } = render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    const bridge = screen.getByRole("region", { name: "Cabina de la Ranger" });
    const flight = () => screen.getByText("Vuelo").nextElementSibling as HTMLElement;
    expect(bridge).toHaveAttribute("data-motion", "on");
    expect(document.querySelector(".ranger-view")).toHaveAttribute("data-flight", "on");
    expect(flight()).toHaveTextContent("En travesía");
    const canvas = document.querySelector(".ranger-view canvas");
    expect(canvas).not.toBeNull();
    // Ningún interruptor propio: el de la bandeja gobierna todo el sitio.
    expect(screen.queryByRole("button", { name: /vuelo/ })).toBeNull();
    settings.motion = false;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(bridge).toHaveAttribute("data-motion", "off");
    expect(document.querySelector(".ranger-view")).toHaveAttribute("data-flight", "off");
    expect(flight()).toHaveTextContent("Detenido");
    // Apagar congela el último fotograma: el mismo canvas, el mismo contexto.
    expect(document.querySelector(".ranger-view canvas")).toBe(canvas);
    expect(loseContext).not.toHaveBeenCalled();
    settings.motion = true;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).toBe(canvas);
    unmount();
    // Se suelta una tarea después, cuando el canvas ya no está en el documento.
    expect(loseContext).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("quien llega con el movimiento apagado no paga GPU: vista fija, sin contexto, hasta el primer vuelo", () => {
    stubWebGL2();
    settings.motion = false;
    const { rerender } = render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).toBeNull();
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".ranger-view__tunnel path")).toHaveLength(150);
    settings.motion = true;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).not.toBeNull();
    expect(document.querySelector(".ranger-view")).toHaveAttribute("data-flight", "on");
  });

  it("sin aceleración gráfica no vuela salvo que se pida: vista fija, «Detenido», y el icono lo monta", () => {
    stubWebGL2();
    settings.renderer = "google swiftshader";
    const { rerender } = render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).toBeNull();
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalledWith("webgl2", expect.anything());
    expect(screen.getByText("Vuelo").nextElementSibling).toHaveTextContent("Detenido");
    // Pulsar el icono es la petición explícita: ahí sí despega.
    settings.explicit = true;
    rerender(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    expect(document.querySelector(".ranger-view canvas")).not.toBeNull();
    expect(screen.getByText("Vuelo").nextElementSibling).toHaveTextContent("En travesía");
  });

  it("apuntar una frecuencia la sintoniza en su módulo y soltarla lo limpia", () => {
    stubWebGL2();
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    const tuned = document.querySelector(".ranger-channels__tuned") as HTMLElement;
    expect(tuned).toHaveTextContent("Tierra ↔ Ranger");
    const email = screen.getByRole("link", { name: /01 \/ CORREO/ });
    fireEvent.pointerEnter(email.closest("article")!);
    expect(tuned).toHaveTextContent("Sintonizando 01 · Correo");
    fireEvent.pointerLeave(email.closest("article")!);
    expect(tuned).toHaveTextContent("Tierra ↔ Ranger");
    fireEvent.focus(screen.getByRole("link", { name: /03 \/ LINKEDIN/ }));
    expect(tuned).toHaveTextContent("Sintonizando 03 · LinkedIn");
  });

  it("el formulario va primero y después UN panel con canales, radar y registro de a bordo", () => {
    render(<RangerContact world={getWorld("ranger", "es")} locale="es" />);
    const bridge = screen.getByRole("region", { name: "Cabina de la Ranger" });
    const form = document.getElementById("transmision")!;
    const relay = screen.getByRole("region", { name: "Canales directos y registro de a bordo" });
    expect(bridge.contains(relay)).toBe(false);
    expect(form.compareDocumentPosition(relay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(relay).getByRole("link", { name: /01 \/ CORREO/ })).toBeInTheDocument();
    expect(within(relay).getByRole("link", { name: /CV español/ })).toHaveAttribute("download");
    expect(within(relay).getByRole("link", { name: /GitHub/ })).toBeInTheDocument();
    expect(relay.querySelector(".ranger-scope")).not.toBeNull();
    // El teléfono no va aparte (es el número del WhatsApp) y no queda otro bloque de tripulación.
    expect(screen.queryByRole("link", { name: /TELÉFONO/ })).toBeNull();
    expect(document.querySelector(".ranger-dossier")).toBeNull();
  });

  it("la hora del HUD es la de Santo Domingo, en HH:MM", () => {
    render(<RangerReadouts name="Ranger" />);
    expect(screen.getByText("Hora").nextElementSibling).toHaveTextContent(/^\d{2}:\d{2}$/);
  });

  it("expone correo, WhatsApp (con su número) y LinkedIn, y copia correo y número", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ContactChannels />);
    expect(screen.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
    expect(screen.getByRole("link", { name: /02 \/ WHATSAPP/ })).toHaveAttribute("href", expect.stringContaining("https://wa.me/18498625049"));
    expect(screen.getByRole("link", { name: /02 \/ WHATSAPP/ })).toHaveTextContent("+1 (849) 862-5049");
    expect(screen.getByRole("link", { name: /03 \/ LINKEDIN/ })).toHaveAttribute("href", expect.stringContaining("linkedin.com/in/"));
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
