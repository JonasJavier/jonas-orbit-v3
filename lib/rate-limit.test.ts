import { describe, expect, it } from "vitest";
import { clientAddress, createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("admite el límite dentro de la ventana y bloquea el siguiente", () => {
    const time = clock();
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      blockMs: 600_000,
      now: time.now,
    });

    for (let index = 0; index < 5; index += 1) {
      expect(limiter.consume("203.0.113.7")).toEqual({ allowed: true });
    }
    expect(limiter.consume("203.0.113.7")).toEqual({
      allowed: false,
      retryAfterSeconds: 600,
    });
  });

  it("mantiene el bloqueo completo aunque la ventana ya haya pasado", () => {
    const time = clock();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      blockMs: 600_000,
      now: time.now,
    });

    limiter.consume("ip");
    limiter.consume("ip");
    time.advance(120_000);
    expect(limiter.consume("ip")).toEqual({
      allowed: false,
      retryAfterSeconds: 480,
    });
    time.advance(480_000);
    expect(limiter.consume("ip")).toEqual({ allowed: true });
  });

  it("olvida los envíos que salen de la ventana", () => {
    const time = clock();
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 60_000,
      blockMs: 600_000,
      now: time.now,
    });

    limiter.consume("ip");
    limiter.consume("ip");
    time.advance(60_000);
    expect(limiter.consume("ip")).toEqual({ allowed: true });
  });

  it("cuenta cada IP por separado", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, blockMs: 600_000 });

    expect(limiter.consume("a")).toEqual({ allowed: true });
    expect(limiter.consume("b")).toEqual({ allowed: true });
    expect(limiter.consume("a").allowed).toBe(false);
  });

  it("descarta la clave menos reciente al superar el tope de memoria", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      blockMs: 600_000,
      maxKeys: 2,
    });

    limiter.consume("a");
    limiter.consume("b");
    limiter.consume("c");
    // `a` salió de memoria: vuelve a empezar su cuenta.
    expect(limiter.consume("a")).toEqual({ allowed: true });
    expect(limiter.consume("c").allowed).toBe(false);
  });
});

describe("clientAddress", () => {
  it("prefiere la IP que escribe el borde de Railway", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.7",
      "cf-connecting-ip": "198.51.100.1",
      "x-forwarded-for": "192.0.2.9, 203.0.113.7",
    });
    expect(clientAddress(headers)).toBe("203.0.113.7");
  });

  it("usa la IP de Cloudflare y después x-forwarded-for", () => {
    expect(clientAddress(new Headers({ "cf-connecting-ip": "198.51.100.1" }))).toBe(
      "198.51.100.1",
    );
    expect(clientAddress(new Headers({ "x-forwarded-for": " 192.0.2.9 , 10.0.0.1" }))).toBe(
      "192.0.2.9",
    );
  });

  it("devuelve undefined sin cabeceras de IP", () => {
    expect(clientAddress(new Headers())).toBeUndefined();
  });
});
