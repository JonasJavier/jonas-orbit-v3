// `zod/mini` y no `zod`: el formulario valida también en el navegador, y la
// API clásica llevaba ~72 KB comprimidos a cada visita (Next precarga la ruta
// de Contacto desde la portada). La mini es la misma validación, por piezas.
import * as z from "zod/mini";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "./i18n";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

/**
 * Las cuatro misiones del formulario. El valor viaja al servidor y es el mismo
 * en los dos idiomas; lo que cambia es cómo se nombra. El correo que recibe
 * Jonás las dice en español (`contact-server.ts`).
 */
const MISSION_VALUES = ["product", "system", "presence", "opportunity"] as const;
type Mission = (typeof MISSION_VALUES)[number];
type MissionCopy = Record<Mission, { label: string; description: string }>;

const MISSION_COPY: Record<Locale, MissionCopy> = defineCopy<MissionCopy>({
  es: {
    product: { label: "Construir un producto", description: "Aplicación, plataforma o herramienta desde cero." },
    system: { label: "Mejorar un sistema", description: "Procesos, arquitectura o experiencia que necesitan evolucionar." },
    presence: { label: "Crear una presencia digital", description: "Sitio profesional, e-commerce o portafolio con identidad." },
    opportunity: { label: "Oportunidad profesional", description: "Empleo, colaboración o conversación técnica." },
  },
  en: {
    product: { label: "Build a product", description: "An app, platform or tool, built from scratch." },
    system: { label: "Improve a system", description: "Processes, architecture or experience that need to evolve." },
    presence: { label: "Launch a digital presence", description: "A professional website, online store or portfolio with identity." },
    opportunity: { label: "Career opportunity", description: "A job, a collaboration or a technical conversation." },
  },
});

/** Las misiones en el orden del formulario, dichas en un idioma. */
export function missionOptions(locale: Locale) {
  return MISSION_VALUES.map((value) => ({ value, ...MISSION_COPY[locale][value] }));
}

/** Los mensajes de validación, que el servidor también devuelve por campo. */
const MESSAGES = defineCopy({
  es: {
    nameMin: "Escribe tu nombre.",
    nameMax: "Usa un nombre de 80 caracteres o menos.",
    emailMax: "El correo es demasiado largo.",
    email: "Escribe un correo válido.",
    mission: "Selecciona el tipo de misión.",
    messageMin: "Cuéntame un poco más: usa al menos 20 caracteres.",
    messageMax: "El mensaje debe tener 2,000 caracteres o menos.",
    privacy: "Confirma que has leído la nota de privacidad.",
    turnstile: "Completa la verificación de seguridad.",
    turnstileMax: "La verificación de seguridad no es válida.",
  },
  en: {
    nameMin: "Please enter your name.",
    nameMax: "Use a name of 80 characters or fewer.",
    emailMax: "That email is too long.",
    email: "Please enter a valid email.",
    mission: "Choose a mission type.",
    messageMin: "Tell me a little more: use at least 20 characters.",
    messageMax: "The message must be 2,000 characters or fewer.",
    privacy: "Please confirm you\u2019ve read the privacy note.",
    turnstile: "Please complete the security check.",
    turnstileMax: "The security check isn\u2019t valid.",
  },
});

/** El esquema del formulario, con los errores en el idioma de quien escribe. */
export function createContactFormSchema(locale: Locale) {
  const m = MESSAGES[locale];
  return z.object({
    name: z.string().check(z.trim(), z.minLength(2, m.nameMin), z.maxLength(80, m.nameMax)),
    email: z.string().check(z.trim(), z.maxLength(254, m.emailMax), z.email(m.email)),
    mission: z.enum(MISSION_VALUES, { error: m.mission }),
    message: z.string().check(z.trim(), z.minLength(20, m.messageMin), z.maxLength(2000, m.messageMax)),
    website: z._default(z.optional(z.string().check(z.maxLength(120))), ""),
    privacyAccepted: z.literal(true, { error: m.privacy }),
    turnstileToken: z.string().check(z.minLength(1, m.turnstile), z.maxLength(2048, m.turnstileMax)),
  });
}

/** El esquema en español, el idioma del correo que llega a Jonás. */
export const contactFormSchema = createContactFormSchema("es");

export type ContactFormInput = Omit<
  z.input<typeof contactFormSchema>,
  "privacyAccepted"
> & { privacyAccepted: boolean };
export type ContactFormData = z.output<typeof contactFormSchema>;
export type ContactField = keyof ContactFormInput;

export function contactPayloadFromForm(form: FormData): ContactFormInput {
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    mission: String(form.get("mission") ?? "") as ContactFormInput["mission"],
    message: String(form.get("message") ?? ""),
    website: String(form.get("website") ?? ""),
    privacyAccepted: form.get("privacyAccepted") === "on",
    turnstileToken: String(form.get("turnstileToken") ?? ""),
  };
}

export function fieldErrorsFromZod(
  error: z.core.$ZodError,
): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
