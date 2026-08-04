import { z } from "zod";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

export const MISSION_OPTIONS = [
  {
    value: "product",
    label: "Construir un producto",
    description: "Aplicación, plataforma o herramienta desde cero.",
  },
  {
    value: "system",
    label: "Mejorar un sistema",
    description: "Procesos, arquitectura o experiencia que necesitan evolucionar.",
  },
  {
    value: "presence",
    label: "Crear una presencia digital",
    description: "Sitio profesional, e-commerce o portafolio con identidad.",
  },
  {
    value: "opportunity",
    label: "Oportunidad profesional",
    description: "Empleo, colaboración o conversación técnica.",
  },
] as const;

const MISSION_VALUES = MISSION_OPTIONS.map(
  (option) => option.value,
) as [
  (typeof MISSION_OPTIONS)[number]["value"],
  ...(typeof MISSION_OPTIONS)[number]["value"][],
];

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre.")
    .max(80, "Usa un nombre de 80 caracteres o menos."),
  email: z
    .string()
    .trim()
    .max(254, "El correo es demasiado largo.")
    .email("Escribe un correo válido."),
  mission: z.enum(MISSION_VALUES, {
    error: "Selecciona el tipo de misión.",
  }),
  message: z
    .string()
    .trim()
    .min(20, "Cuéntame un poco más: usa al menos 20 caracteres.")
    .max(2000, "El mensaje debe tener 2,000 caracteres o menos."),
  website: z.string().max(120).optional().default(""),
  privacyAccepted: z.literal(true, {
    error: "Confirma que has leído la nota de privacidad.",
  }),
  turnstileToken: z
    .string()
    .min(1, "Completa la verificación de seguridad.")
    .max(2048, "La verificación de seguridad no es válida."),
});

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
  error: z.ZodError,
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
