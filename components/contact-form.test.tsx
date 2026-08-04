import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./contact-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Ada Lovelace" },
  });
  fireEvent.change(screen.getByLabelText("Correo"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Tipo de misión"), {
    target: { value: "product" },
  });
  fireEvent.change(screen.getByLabelText("Mensaje"), {
    target: { value: "Quiero construir una herramienta clara para nuestro equipo." },
  });
  fireEvent.click(
    screen.getByLabelText(/He leído la nota de privacidad/),
  );
}

describe("ContactForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse({
          mode: "test",
          siteKey: "1x00000000000000000000AA",
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra validación dirigida sin enviar datos incompletos", async () => {
    render(<ContactForm />);
    const button = await screen.findByRole("button", { name: "Enviar transmisión" });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    expect(await screen.findByText("Escribe tu nombre.")).toBeVisible();
    expect(screen.getByText("Escribe un correo válido.")).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("transmite una vez y navega a la confirmación", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ ok: true })
        : jsonResponse({ mode: "test", siteKey: "test-sitekey" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactForm />);
    fillValidForm();

    const button = screen.getByRole("button", { name: "Enviar transmisión" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/es/contacto/gracias"));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("conserva los datos y permite reintentar después de un error", async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((input, init) =>
        init?.method === "POST"
          ? jsonResponse({ ok: false, code: "delivery" }, 502)
          : jsonResponse({ mode: "test", siteKey: "test-sitekey" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactForm />);
    fillValidForm();

    const button = screen.getByRole("button", { name: "Enviar transmisión" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(await screen.findByText(/Tus datos siguen aquí/)).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ada Lovelace");
    expect(button).toBeEnabled();
  });

  it("bloquea duplicados durante una API lenta y aborta al navegar fuera", async () => {
    let postSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (init?.method !== "POST") {
          return jsonResponse({ mode: "test", siteKey: "test-sitekey" });
        }
        postSignal = init.signal ?? undefined;
        return new Promise((_, reject) => {
          postSignal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<ContactForm />);
    fillValidForm();

    const button = screen.getByRole("button", { name: "Enviar transmisión" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByRole("button", { name: "Transmitiendo…" });
    fireEvent.click(button);

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    unmount();
    expect(postSignal?.aborted).toBe(true);
  });
});
