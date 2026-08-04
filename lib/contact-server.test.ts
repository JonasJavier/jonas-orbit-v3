import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_TEST_TOKEN } from "./contact-schema";
import {
  deliverContactMessage,
  getPublicContactConfig,
  handleContactRequest,
  verifyTurnstile,
  type ContactBindings,
} from "./contact-server";

const TEST_BINDINGS: ContactBindings = {
  CONTACT_RUNTIME_ENV: "test",
  CONTACT_DELIVERY_MODE: "test",
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

const VALID_PAYLOAD = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  mission: "product" as const,
  message: "Quiero construir una herramienta clara para nuestro equipo.",
  website: "",
  privacyAccepted: true as const,
  turnstileToken: TURNSTILE_TEST_TOKEN,
};

function request(payload: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

describe("configuración del contacto", () => {
  it("rechaza el sitekey oficial de pruebas en producción", () => {
    expect(() =>
      getPublicContactConfig({
        CONTACT_RUNTIME_ENV: "production",
        TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      }),
    ).toThrow(/production Turnstile/);
  });
});

describe("handleContactRequest", () => {
  it("acepta una transmisión válida en el runtime aislado de E2E", async () => {
    const result = await handleContactRequest(request(VALID_PAYLOAD), TEST_BINDINGS);
    expect(result).toEqual({ status: 200, body: { ok: true } });
  });

  it("rechaza campos inválidos con errores por campo", async () => {
    const result = await handleContactRequest(
      request({ ...VALID_PAYLOAD, email: "incorrecto", message: "corto" }),
      TEST_BINDINGS,
    );

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      ok: false,
      code: "validation",
      fieldErrors: { email: expect.any(String), message: expect.any(String) },
    });
  });

  it("silencia el honeypot antes de verificar o entregar", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const result = await handleContactRequest(
      request({ ...VALID_PAYLOAD, website: "https://spam.example" }),
      TEST_BINDINGS,
      fetchImplementation,
    );

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("solo admite el token determinista dentro del modo test", async () => {
    const result = await handleContactRequest(
      request({ ...VALID_PAYLOAD, turnstileToken: "otro-token" }),
      TEST_BINDINGS,
    );
    expect(result).toEqual({
      status: 422,
      body: { ok: false, code: "turnstile" },
    });
  });

  it("limita el cuerpo aunque el cliente omita content-length", async () => {
    const result = await handleContactRequest(
      request({ ...VALID_PAYLOAD, message: "x".repeat(13_000) }),
      TEST_BINDINGS,
    );
    expect(result).toEqual({
      status: 413,
      body: { ok: false, code: "invalid_request" },
    });
  });
});

describe("integraciones externas", () => {
  it("verifica action, hostname e IP en producción", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, action: "contact", hostname: "jonas.dev" }),
        { status: 200 },
      ),
    );

    await expect(
      verifyTurnstile({
        secret: "real-secret",
        token: "visitor-token",
        remoteIp: "203.0.113.7",
        mode: "production",
        expectedHostname: "jonas.dev",
        fetchImplementation,
      }),
    ).resolves.toBe(true);

    const init = fetchImplementation.mock.calls[0][1] as RequestInit;
    const body = init.body as URLSearchParams;
    expect(body.get("remoteip")).toBe("203.0.113.7");
    expect(body.get("response")).toBe("visitor-token");
  });

  it("rechaza una action diferente aunque Siteverify responda success", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, action: "login", hostname: "jonas.dev" }),
        { status: 200 },
      ),
    );

    await expect(
      verifyTurnstile({
        secret: "real-secret",
        token: "visitor-token",
        mode: "production",
        expectedHostname: "jonas.dev",
        fetchImplementation,
      }),
    ).resolves.toBe(false);
  });

  it("escapa HTML y configura reply_to e idempotencia en Resend", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "email-id" }), { status: 200 }));

    await deliverContactMessage({
      data: {
        ...VALID_PAYLOAD,
        name: "Ada <script>",
        message: "Hola <img src=x>\nSegunda línea segura.",
        mission: "product",
      },
      apiKey: "re_test",
      fromEmail: "Orbit <contacto@jonas.dev>",
      toEmail: "jonas@example.com",
      fetchImplementation,
    });

    const init = fetchImplementation.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.reply_to).toBe("ada@example.com");
    expect(body.html).toContain("Ada &lt;script&gt;");
    expect(body.html).not.toContain("<img src=x>");
    expect(new Headers(init.headers).get("idempotency-key")).toBeTruthy();
  });
});
