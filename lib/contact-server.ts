import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Locale } from "@/content/site.data";
import {
  TURNSTILE_TEST_SITE_KEY,
  TURNSTILE_TEST_TOKEN,
  createContactFormSchema,
  fieldErrorsFromZod,
  missionOptions,
  type ContactFormData,
} from "./contact-schema";
import { clientAddress } from "./rate-limit";

const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const MAX_REQUEST_BYTES = 12_000;
const REQUEST_TIMEOUT_MS = 8_000;

const CONTACT_ENV_KEYS = [
  "CONTACT_RUNTIME_ENV",
  "CONTACT_DELIVERY_MODE",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_EXPECTED_HOSTNAME",
  "RESEND_API_KEY",
  "CONTACT_FROM_EMAIL",
  "CONTACT_TO_EMAIL",
] as const;

type ContactEnvKey = (typeof CONTACT_ENV_KEYS)[number];
export type ContactBindings = Partial<Record<ContactEnvKey, string>>;
export type ContactRuntimeMode = "development" | "test" | "production";

type FetchImplementation = typeof fetch;

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type ContactApiResult = {
  status: number;
  body:
    | { ok: true }
    | {
        ok: false;
        code:
          | "configuration"
          | "delivery"
          | "invalid_request"
          | "turnstile"
          | "verification_unavailable"
          | "validation";
        fieldErrors?: ReturnType<typeof fieldErrorsFromZod>;
      };
};

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isOfficialTestKey(value: string | undefined) {
  return value?.startsWith("1x00000000000000000000") ?? false;
}

export function readContactBindings(): ContactBindings {
  let cloudflareBindings: ContactBindings = {};

  try {
    cloudflareBindings = getCloudflareContext().env as ContactBindings;
  } catch {
    // `next start` does not expose the Cloudflare request context. Environment
    // variables keep the same contract for local production-style previews.
  }

  const runtimeOverride = clean(process.env.CONTACT_RUNTIME_ENV);
  const preferProcessEnvironment =
    runtimeOverride === "test" || runtimeOverride === "development";

  return Object.fromEntries(
    CONTACT_ENV_KEYS.map((key) => [
      key,
      preferProcessEnvironment
        ? clean(process.env[key]) ?? clean(cloudflareBindings[key])
        : clean(cloudflareBindings[key]) ?? clean(process.env[key]),
    ]),
  ) as ContactBindings;
}

export function getContactRuntimeMode(
  bindings: ContactBindings,
): ContactRuntimeMode {
  const configured = bindings.CONTACT_RUNTIME_ENV;
  if (configured === "production" || configured === "test") {
    return configured;
  }
  return "development";
}

export function getPublicContactConfig(bindings: ContactBindings): {
  mode: ContactRuntimeMode;
  siteKey: string;
} {
  const mode = getContactRuntimeMode(bindings);
  const configuredSiteKey = clean(bindings.TURNSTILE_SITE_KEY);

  if (mode === "production") {
    if (!configuredSiteKey || isOfficialTestKey(configuredSiteKey)) {
      throw new Error("Invalid production Turnstile sitekey configuration.");
    }
    return { mode, siteKey: configuredSiteKey };
  }

  return {
    mode,
    siteKey: configuredSiteKey ?? TURNSTILE_TEST_SITE_KEY,
  };
}

function getServerContactConfig(bindings: ContactBindings) {
  const publicConfig = getPublicContactConfig(bindings);
  const secret =
    clean(bindings.TURNSTILE_SECRET_KEY) ??
    (publicConfig.mode === "development" ? TURNSTILE_TEST_SECRET : undefined);

  if (publicConfig.mode === "production") {
    if (!secret || isOfficialTestKey(secret)) {
      throw new Error("Invalid production Turnstile secret configuration.");
    }
    if (!clean(bindings.TURNSTILE_EXPECTED_HOSTNAME)) {
      throw new Error("Missing expected Turnstile hostname.");
    }
  }

  return {
    ...publicConfig,
    secret,
    expectedHostname: clean(bindings.TURNSTILE_EXPECTED_HOSTNAME),
    deliveryMode: clean(bindings.CONTACT_DELIVERY_MODE),
    resendApiKey: clean(bindings.RESEND_API_KEY),
    fromEmail: clean(bindings.CONTACT_FROM_EMAIL),
    toEmail: clean(bindings.CONTACT_TO_EMAIL),
  };
}

/** Readiness for a production deployment: never expose which credential is missing. */
export function isProductionContactReady(
  bindings: ContactBindings,
  siteUrl: string,
): boolean {
  try {
    const config = getServerContactConfig(bindings);
    const site = new URL(siteUrl);
    return (
      config.mode === "production" &&
      site.protocol === "https:" &&
      config.expectedHostname === site.hostname &&
      config.deliveryMode !== "test" &&
      Boolean(config.resendApiKey && config.fromEmail && config.toEmail)
    );
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  fetchImplementation: FetchImplementation,
  input: string,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImplementation(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyTurnstile({
  secret,
  token,
  remoteIp,
  mode,
  expectedHostname,
  fetchImplementation = fetch,
}: {
  secret: string;
  token: string;
  remoteIp?: string;
  mode: ContactRuntimeMode;
  expectedHostname?: string;
  fetchImplementation?: FetchImplementation;
}) {
  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetchWithTimeout(
    fetchImplementation,
    TURNSTILE_VERIFY_URL,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    throw new Error("Turnstile verification service unavailable.");
  }

  const verification = (await response.json()) as TurnstileResponse;
  if (!verification.success) return false;

  if (mode === "production") {
    return (
      verification.action === "contact" &&
      verification.hostname === expectedHostname
    );
  }

  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

/** Jonás lee el correo en español, escriba en el idioma que escriba el visitante. */
function missionLabel(mission: ContactFormData["mission"]) {
  return missionOptions("es").find((option) => option.value === mission)?.label ?? mission;
}

const LANGUAGE_NAME: Record<Locale, string> = { es: "Español", en: "Inglés" };

export async function deliverContactMessage({
  data,
  locale = "es",
  apiKey,
  fromEmail,
  toEmail,
  fetchImplementation = fetch,
}: {
  data: ContactFormData;
  /** El idioma en que escribió el visitante: así sabe Jonás en cuál responder. */
  locale?: Locale;
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  fetchImplementation?: FetchImplementation;
}) {
  const mission = missionLabel(data.mission);
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeMission = escapeHtml(mission);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, "<br />");

  const response = await fetchWithTimeout(fetchImplementation, RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: data.email,
      subject: `[Jonás Orbit] ${mission}`,
      text: `Nombre: ${data.name}\nCorreo: ${data.email}\nMisión: ${mission}\nIdioma: ${LANGUAGE_NAME[locale]}\n\n${data.message}`,
      html: `<h1>Nueva transmisión</h1><p><strong>Nombre:</strong> ${safeName}</p><p><strong>Correo:</strong> ${safeEmail}</p><p><strong>Misión:</strong> ${safeMission}</p><p><strong>Idioma:</strong> ${LANGUAGE_NAME[locale]}</p><hr /><p>${safeMessage}</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Contact delivery failed.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleContactRequest(
  request: Request,
  bindings = readContactBindings(),
  fetchImplementation: FetchImplementation = fetch,
): Promise<ContactApiResult> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return { status: 413, body: { ok: false, code: "invalid_request" } };
  }

  let payload: unknown;
  try {
    const rawPayload = await request.text();
    if (new TextEncoder().encode(rawPayload).byteLength > MAX_REQUEST_BYTES) {
      return { status: 413, body: { ok: false, code: "invalid_request" } };
    }
    payload = JSON.parse(rawPayload) as unknown;
  } catch {
    return { status: 400, body: { ok: false, code: "invalid_request" } };
  }

  if (!isRecord(payload)) {
    return { status: 400, body: { ok: false, code: "invalid_request" } };
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return { status: 200, body: { ok: true } };
  }

  // Los errores por campo vuelven en el idioma del formulario; sin idioma
  // declarado, en español (el contrato anterior de la API).
  const locale: Locale = payload.locale === "en" ? "en" : "es";
  const parsed = createContactFormSchema(locale).safeParse(payload);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "validation",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      },
    };
  }

  let config: ReturnType<typeof getServerContactConfig>;
  try {
    config = getServerContactConfig(bindings);
  } catch {
    return { status: 503, body: { ok: false, code: "configuration" } };
  }

  if (config.mode === "test") {
    if (parsed.data.turnstileToken !== TURNSTILE_TEST_TOKEN) {
      return { status: 422, body: { ok: false, code: "turnstile" } };
    }
  } else {
    if (!config.secret) {
      return { status: 503, body: { ok: false, code: "configuration" } };
    }
    try {
      const verified = await verifyTurnstile({
        secret: config.secret,
        token: parsed.data.turnstileToken,
        remoteIp: clientAddress(request.headers),
        mode: config.mode,
        expectedHostname: config.expectedHostname,
        fetchImplementation,
      });
      if (!verified) {
        return { status: 422, body: { ok: false, code: "turnstile" } };
      }
    } catch {
      return {
        status: 503,
        body: { ok: false, code: "verification_unavailable" },
      };
    }
  }

  if (config.mode === "test" || config.deliveryMode === "test") {
    return { status: 200, body: { ok: true } };
  }

  if (!config.resendApiKey || !config.fromEmail || !config.toEmail) {
    return { status: 503, body: { ok: false, code: "configuration" } };
  }

  try {
    await deliverContactMessage({
      data: parsed.data,
      locale,
      apiKey: config.resendApiKey,
      fromEmail: config.fromEmail,
      toEmail: config.toEmail,
      fetchImplementation,
    });
  } catch {
    return { status: 502, body: { ok: false, code: "delivery" } };
  }

  return { status: 200, body: { ok: true } };
}
