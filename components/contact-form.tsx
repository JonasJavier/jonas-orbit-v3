"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MISSION_OPTIONS,
  TURNSTILE_TEST_TOKEN,
  contactFormSchema,
  contactPayloadFromForm,
  fieldErrorsFromZod,
  type ContactField,
} from "@/lib/contact-schema";

type TurnstileWidget = {
  render: (
    target: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      theme: "dark";
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
  }
}

type PublicConfig = {
  mode: "development" | "production" | "test";
  siteKey: string;
};

type FormState = "idle" | "submitting" | "error" | "rate-limited";
type FieldErrors = Partial<Record<ContactField, string>>;

const ERROR_MESSAGES = {
  configuration:
    "La baliza segura no está disponible ahora. Puedes escribirme por correo o WhatsApp.",
  delivery:
    "La transmisión no pudo salir. Tus datos siguen aquí: inténtalo de nuevo o usa un canal directo.",
  invalid_request: "No pude interpretar la transmisión. Revisa los datos e inténtalo de nuevo.",
  turnstile: "La verificación expiró o no fue válida. Complétala de nuevo.",
  verification_unavailable:
    "La verificación está tardando más de lo normal. Espera un momento y reintenta.",
  validation: "Hay campos que necesitan tu atención.",
} as const;

function focusFirstError(errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  if (!firstField) return;
  document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
}

export function ContactForm() {
  const router = useRouter();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const requestRef = useRef<AbortController | undefined>(undefined);
  const [config, setConfig] = useState<PublicConfig>();
  const [configError, setConfigError] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formState, setFormState] = useState<FormState>("idle");
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/contact", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Contact config unavailable");
        return (await response.json()) as PublicConfig;
      })
      .then((nextConfig) => {
        setConfig(nextConfig);
        if (nextConfig.mode === "test") {
          setTurnstileToken(TURNSTILE_TEST_TOKEN);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConfigError(true);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (
      !config ||
      config.mode === "test" ||
      !scriptReady ||
      !window.turnstile ||
      !widgetContainerRef.current ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: config.siteKey,
      action: "contact",
      appearance: "interaction-only",
      theme: "dark",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setFormMessage("No pude completar la verificación. Reintenta en unos segundos.");
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [config, scriptReady]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  function resetVerification() {
    if (config?.mode === "test") {
      setTurnstileToken(TURNSTILE_TEST_TOKEN);
      return;
    }
    setTurnstileToken("");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formState === "submitting") return;

    const payload = contactPayloadFromForm(new FormData(event.currentTarget));
    payload.turnstileToken = turnstileToken;
    const parsed = contactFormSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = fieldErrorsFromZod(parsed.error);
      setFieldErrors(errors);
      setFormMessage("Revisa los campos señalados antes de transmitir.");
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    setFormMessage("");
    setFormState("submitting");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: keyof typeof ERROR_MESSAGES;
        fieldErrors?: FieldErrors;
      };

      if (response.ok && result.ok) {
        router.push("/es/contacto/gracias");
        return;
      }

      if (response.status === 429) {
        setFormState("rate-limited");
        setFormMessage(
          "Hay demasiadas transmisiones desde esta red. Espera unos minutos o usa un canal directo.",
        );
      } else {
        setFormState("error");
        setFieldErrors(result.fieldErrors ?? {});
        setFormMessage(
          (result.code && ERROR_MESSAGES[result.code]) ??
            "La transmisión falló. Tus datos no se borraron; puedes reintentar.",
        );
        if (result.fieldErrors) focusFirstError(result.fieldErrors);
      }
      resetVerification();
    } catch (error) {
      setFormState("error");
      setFormMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "La transmisión tardó demasiado. Tus datos siguen aquí; puedes reintentar."
          : "Perdimos la señal. Comprueba tu conexión e inténtalo de nuevo.",
      );
      resetVerification();
    } finally {
      window.clearTimeout(timeout);
      requestRef.current = undefined;
      setFormState((current) => (current === "submitting" ? "idle" : current));
    }
  }

  const securityReady = Boolean(config && turnstileToken);

  return (
    <div className="contact-form-shell">
      {/*
        Solo se carga Turnstile cuando la config YA llegó y NO es modo test.
        Antes la condición era `config?.mode !== "test"`, que con `config`
        todavía `undefined` daba true en el primer render: el script de un
        tercer origen acababa en el HTML de todas las visitas al home —también
        en test— y entraba en la ruta crítica de un formulario que vive al final
        de la página. Esperar a `config` lo saca del arranque y evita el
        contacto con Cloudflare antes de que exista intención de contactar.
      */}
      {config && config.mode !== "test" ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="lazyOnload"
          onLoad={() => setScriptReady(true)}
        />
      ) : null}

      <div className="contact-form-shell__heading">
        <h3>Prepara tu mensaje</h3>
        <p>
          No necesitas tenerlo todo resuelto. Una idea es un buen comienzo.
        </p>
      </div>

      <noscript><p>Para enviar el formulario necesitas JavaScript. También puedes usar el correo, WhatsApp o el teléfono de arriba.</p></noscript>
      <form className="contact-form" aria-label="Enviar un mensaje a Jonás" noValidate onSubmit={handleSubmit}>
        <div className="contact-form__grid">
          <label>
            <span>Nombre</span>
            <input
              aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="name"
              maxLength={80}
              name="name"
              placeholder="¿Cómo te llamas?"
            />
            {fieldErrors.name ? (
              <small className="field-error" id="contact-name-error">
                {fieldErrors.name}
              </small>
            ) : null}
          </label>

          <label>
            <span>Correo</span>
            <input
              aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              placeholder="tu@correo.com"
              type="email"
            />
            {fieldErrors.email ? (
              <small className="field-error" id="contact-email-error">
                {fieldErrors.email}
              </small>
            ) : null}
          </label>
        </div>

        <label>
          <span>Tipo de misión</span>
          <select
            aria-describedby={fieldErrors.mission ? "contact-mission-error" : undefined}
            aria-invalid={Boolean(fieldErrors.mission)}
            defaultValue=""
            name="mission"
          >
            <option disabled value="">
              Selecciona una ruta
            </option>
            {MISSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.mission ? (
            <small className="field-error" id="contact-mission-error">
              {fieldErrors.mission}
            </small>
          ) : null}
        </label>

        <label>
          <span>Mensaje</span>
          <textarea
            aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
            aria-invalid={Boolean(fieldErrors.message)}
            maxLength={2000}
            name="message"
            placeholder="Qué necesitas, para quién y qué resultado te gustaría conseguir…"
            rows={5}
          />
          {fieldErrors.message ? (
            <small className="field-error" id="contact-message-error">
              {fieldErrors.message}
            </small>
          ) : null}
        </label>

        <label className="contact-form__honeypot" aria-hidden="true">
          Sitio web
          <input autoComplete="off" name="website" tabIndex={-1} />
        </label>

        <label className="privacy-check">
          <input name="privacyAccepted" type="checkbox" />
          <span>
            He leído la <Link href="/es/privacidad">nota de privacidad</Link> y acepto
            que estos datos se usen para responderme.
          </span>
        </label>
        {fieldErrors.privacyAccepted ? (
          <small className="field-error" id="contact-privacy-error">
            {fieldErrors.privacyAccepted}
          </small>
        ) : null}

        <input name="turnstileToken" type="hidden" value={turnstileToken} readOnly />
        <div
          className="contact-form__turnstile"
          ref={widgetContainerRef}
          aria-label="Verificación de seguridad"
        >
          {config?.mode === "test" ? (
            <span>Verificación de pruebas preparada</span>
          ) : !config && !configError ? (
            <span>Preparando verificación…</span>
          ) : null}
        </div>
        {fieldErrors.turnstileToken ? (
          <small className="field-error">{fieldErrors.turnstileToken}</small>
        ) : null}

        <div className="contact-form__footer">
          <p aria-live="polite" className="contact-form__status" role="status">
            {configError ? ERROR_MESSAGES.configuration : formMessage}
          </p>
          <button
            className="button button--primary contact-form__submit"
            disabled={!securityReady || configError || formState === "submitting"}
            type="submit"
          >
            {formState === "submitting" ? "Transmitiendo…" : "Enviar transmisión"}
          </button>
        </div>
      </form>
    </div>
  );
}
