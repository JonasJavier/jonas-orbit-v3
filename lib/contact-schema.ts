// `zod/mini` y no `zod`: el formulario valida también en el navegador, y la
// API clásica llevaba ~72 KB comprimidos a cada visita (Next precarga la ruta
// de Contacto desde la portada). La mini es la misma validación, por piezas.
import * as z from "zod/mini";

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
  name: z.string().check(
    z.trim(),
    z.minLength(2, "Escribe tu nombre."),
    z.maxLength(80, "Usa un nombre de 80 caracteres o menos."),
  ),
  email: z.string().check(
    z.trim(),
    z.maxLength(254, "El correo es demasiado largo."),
    z.email("Escribe un correo válido."),
  ),
  mission: z.enum(MISSION_VALUES, {
    error: "Selecciona el tipo de misión.",
  }),
  message: z.string().check(
    z.trim(),
    z.minLength(20, "Cuéntame un poco más: usa al menos 20 caracteres."),
    z.maxLength(2000, "El mensaje debe tener 2,000 caracteres o menos."),
  ),
  website: z._default(z.optional(z.string().check(z.maxLength(120))), ""),
  privacyAccepted: z.literal(true, {
    error: "Confirma que has leído la nota de privacidad.",
  }),
  turnstileToken: z.string().check(
    z.minLength(1, "Completa la verificación de seguridad."),
    z.maxLength(2048, "La verificación de seguridad no es válida."),
  ),
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
