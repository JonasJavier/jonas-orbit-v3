import { describe, expect, it } from "vitest";
import { contactFormSchema, fieldErrorsFromZod } from "./contact-schema";

const validPayload = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  mission: "system" as const,
  message: "Necesitamos ordenar un proceso operativo con varias áreas.",
  website: "",
  privacyAccepted: true as const,
  turnstileToken: "verified-token",
};

describe("contactFormSchema", () => {
  it("normaliza y acepta una transmisión válida", () => {
    const result = contactFormSchema.parse({
      ...validPayload,
      name: "  Ada Lovelace  ",
      email: "  ada@example.com  ",
    });

    expect(result.name).toBe("Ada Lovelace");
    expect(result.email).toBe("ada@example.com");
  });

  it("rechaza campos inválidos con errores dirigidos", () => {
    const result = contactFormSchema.safeParse({
      ...validPayload,
      name: "",
      email: "no-es-correo",
      message: "Muy corto",
      privacyAccepted: false,
      turnstileToken: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFromZod(result.error)).toMatchObject({
        name: "Escribe tu nombre.",
        email: "Escribe un correo válido.",
        message: expect.stringContaining("20 caracteres"),
        privacyAccepted: expect.stringContaining("privacidad"),
        turnstileToken: expect.stringContaining("verificación"),
      });
    }
  });

  it("limita el token Turnstile a 2,048 caracteres", () => {
    expect(
      contactFormSchema.safeParse({
        ...validPayload,
        turnstileToken: "x".repeat(2049),
      }).success,
    ).toBe(false);
  });
});
