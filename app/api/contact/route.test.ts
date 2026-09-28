// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function post(ip: string) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: "{",
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/contact — límite de tasa", () => {
  it("bloquea el sexto envío por minuto de una IP durante 10 minutos", async () => {
    vi.stubEnv("CONTACT_RUNTIME_ENV", "production");

    for (let index = 0; index < 5; index += 1) {
      expect((await POST(post("203.0.113.10"))).status).toBe(400);
    }
    const blocked = await POST(post("203.0.113.10"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("600");
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    await expect(blocked.json()).resolves.toEqual({ ok: false, code: "rate_limited" });

    // Otra IP conserva su propia cuenta.
    expect((await POST(post("203.0.113.11"))).status).toBe(400);
  });

  it("no limita el modo test de e2e y CI", async () => {
    vi.stubEnv("CONTACT_RUNTIME_ENV", "test");

    for (let index = 0; index < 8; index += 1) {
      expect((await POST(post("203.0.113.20"))).status).toBe(400);
    }
  });
});
