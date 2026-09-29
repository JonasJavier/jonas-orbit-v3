"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { playSfx } from "@/lib/sfx";
import {
  TURNSTILE_TEST_TOKEN,
  contactPayloadFromForm,
  createContactFormSchema,
  fieldErrorsFromZod,
  missionOptions,
  type ContactField,
} from "@/lib/contact-schema";
import { defineCopy } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

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

const COPY = defineCopy({
  es: {
    errors: {
      configuration: "La baliza segura no está disponible ahora. Puedes escribirme por correo o WhatsApp.",
      delivery: "La transmisión no pudo salir. Tus datos siguen aquí: inténtalo de nuevo o usa un canal directo.",
      invalid_request: "No pude interpretar la transmisión. Revisa los datos e inténtalo de nuevo.",
      turnstile: "La verificación expiró o no fue válida. Complétala de nuevo.",
      verification_unavailable: "La verificación está tardando más de lo normal. Espera un momento y reintenta.",
      validation: "Hay campos que necesitan tu atención.",
    },
    verificationFailed: "No pude completar la verificación. Reintenta en unos segundos.",
    checkFields: "Revisa los campos señalados antes de transmitir.",
    rateLimited: "Hay demasiadas transmisiones desde esta red. Espera unos minutos o usa un canal directo.",
    failed: "La transmisión falló. Tus datos no se borraron; puedes reintentar.",
    timeout: "La transmisión tardó demasiado. Tus datos siguen aquí; puedes reintentar.",
    offline: "Perdimos la señal. Comprueba tu conexión e inténtalo de nuevo.",
    heading: "Prepara tu mensaje",
    lead: "No necesitas tenerlo todo resuelto. Una idea es un buen comienzo.",
    noscript: "Para enviar el formulario necesitas JavaScript. También puedes usar el correo, WhatsApp o el teléfono de arriba.",
    form: "Enviar un mensaje a Jonás",
    name: "Nombre",
    namePlaceholder: "¿Cómo te llamas?",
    email: "Correo",
    emailPlaceholder: "tu@correo.com",
    mission: "Tipo de misión",
    missionPlaceholder: "Selecciona una ruta",
    message: "Mensaje",
    messagePlaceholder: "Qué necesitas, para quién y qué resultado te gustaría conseguir…",
    honeypot: "Sitio web",
    privacy: ["He leído la ", "nota de privacidad", " y acepto que estos datos se usen para responderme."],
    security: "Verificación de seguridad",
    testReady: "Verificación de pruebas preparada",
    preparing: "Preparando verificación…",
    sending: "Transmitiendo…",
    send: "Enviar transmisión",
  },
  en: {
    errors: {
      configuration: "The secure beacon isn’t available right now. You can reach me by email or WhatsApp.",
      delivery: "The transmission couldn’t go out. Your details are still here: try again or use a direct channel.",
      invalid_request: "I couldn’t read the transmission. Check your details and try again.",
      turnstile: "The verification expired or wasn’t valid. Please complete it again.",
      verification_unavailable: "Verification is taking longer than usual. Wait a moment and try again.",
      validation: "A few fields need your attention.",
    },
    verificationFailed: "I couldn’t complete the verification. Try again in a few seconds.",
    checkFields: "Check the highlighted fields before sending.",
    rateLimited: "Too many transmissions from this network. Wait a few minutes or use a direct channel.",
    failed: "The transmission failed. Your details weren’t erased; you can try again.",
    timeout: "The transmission took too long. Your details are still here; you can try again.",
    offline: "We lost the signal. Check your connection and try again.",
    heading: "Write your message",
    lead: "You don’t need to have it all figured out. An idea is a great place to start.",
    noscript: "Sending the form requires JavaScript. You can also use the email, WhatsApp or phone above.",
    form: "Send Jonás a message",
    name: "Name",
    namePlaceholder: "What’s your name?",
    email: "Email",
    emailPlaceholder: "you@email.com",
    mission: "Mission type",
    missionPlaceholder: "Choose a route",
    message: "Message",
    messagePlaceholder: "What you need, who it’s for and what outcome yo’d like…",
    honeypot: "Website",
    privacy: ["I’ve read the ", "privacy note", " and agree to this information being used to reply to me."],
    security: "Security check",
    testReady: "Test verification ready",
    preparing: "Preparing verification…",
    sending: "Sending…",
    send: "Send transmission",
  },
});

type ErrorCode = keyof (typeof COPY)["es"]["errors"];

function focusFirstError(errors: FieldErrors) {
  const firstField = Object.keys(errors)[0];
  if (!firstField) return;
  document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
}

export function ContactForm({
  thanksHref,
  privacyHref,
}: {
  /** La confirmación del envío, en el idioma de la página. */
  thanksHref: string;
  privacyHref: string;
}) {
  const locale = useLocale();
  const copy = COPY[locale];
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
        setFormMessage(copy.verificationFailed);
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [config, scriptReady, copy.verificationFailed]);

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
    const parsed = createContactFormSchema(locale).safeParse(payload);
    if (!parsed.success) {
      const errors = fieldErrorsFromZod(parsed.error);
      setFieldErrors(errors);
      setFormMessage(copy.checkFields);
      // Dos notas graves que bajan. Un error es una información, no un
      // castigo: nada de pitido agudo ni de disonancia.
      playSfx("reject");
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
        // El idioma viaja con el mensaje: el servidor valida en él y se lo
        // dice a Jonás en el correo.
        body: JSON.stringify({ ...parsed.data, locale }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: ErrorCode;
        fieldErrors?: FieldErrors;
      };

      if (response.ok && result.ok) {
        // El mensaje sale: dos pulsos que suben y aire que se va con ellos.
        playSfx("transmit");
        router.push(thanksHref);
        return;
      }

      playSfx("reject");
      if (response.status === 429) {
        setFormState("rate-limited");
        setFormMessage(copy.rateLimited);
      } else {
        setFormState("error");
        setFieldErrors(result.fieldErrors ?? {});
        setFormMessage((result.code && copy.errors[result.code]) ?? copy.failed);
        if (result.fieldErrors) focusFirstError(result.fieldErrors);
      }
      resetVerification();
    } catch (error) {
      setFormState("error");
      playSfx("reject");
      setFormMessage(
        error instanceof DOMException && error.name === "AbortError" ? copy.timeout : copy.offline,
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
        <h3>{copy.heading}</h3>
        <p>{copy.lead}</p>
      </div>

      <noscript><p>{copy.noscript}</p></noscript>
      <form className="contact-form" aria-label={copy.form} noValidate onSubmit={handleSubmit}>
        <div className="contact-form__grid">
          <label>
            <span>{copy.name}</span>
            <input
              aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
              aria-invalid={Boolean(fieldErrors.name)}
              autoComplete="name"
              maxLength={80}
              name="name"
              placeholder={copy.namePlaceholder}
            />
            {fieldErrors.name ? (
              <small className="field-error" id="contact-name-error">
                {fieldErrors.name}
              </small>
            ) : null}
          </label>

          <label>
            <span>{copy.email}</span>
            <input
              aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              placeholder={copy.emailPlaceholder}
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
          <span>{copy.mission}</span>
          <select
            aria-describedby={fieldErrors.mission ? "contact-mission-error" : undefined}
            aria-invalid={Boolean(fieldErrors.mission)}
            defaultValue=""
            name="mission"
          >
            <option disabled value="">
              {copy.missionPlaceholder}
            </option>
            {missionOptions(locale).map((option) => (
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
          <span>{copy.message}</span>
          <textarea
            aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
            aria-invalid={Boolean(fieldErrors.message)}
            maxLength={2000}
            name="message"
            placeholder={copy.messagePlaceholder}
            rows={5}
          />
          {fieldErrors.message ? (
            <small className="field-error" id="contact-message-error">
              {fieldErrors.message}
            </small>
          ) : null}
        </label>

        <label className="contact-form__honeypot" aria-hidden="true">
          {copy.honeypot}
          <input autoComplete="off" name="website" tabIndex={-1} />
        </label>

        <label className="privacy-check">
          <input name="privacyAccepted" type="checkbox" />
          <span>
            {copy.privacy[0]}<Link href={privacyHref}>{copy.privacy[1]}</Link>{copy.privacy[2]}
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
          // Un div sin rol no puede llevar nombre (axe: aria-allowed-attr, en
          // «Navegación agéntica» de PageSpeed); como grupo, sí y con sentido.
          role="group"
          aria-label={copy.security}
        >
          {config?.mode === "test" ? (
            <span>{copy.testReady}</span>
          ) : !config && !configError ? (
            <span>{copy.preparing}</span>
          ) : null}
        </div>
        {fieldErrors.turnstileToken ? (
          <small className="field-error">{fieldErrors.turnstileToken}</small>
        ) : null}

        <div className="contact-form__footer">
          <p aria-live="polite" className="contact-form__status" role="status">
            {configError ? copy.errors.configuration : formMessage}
          </p>
          <button
            className="button button--primary contact-form__submit"
            disabled={!securityReady || configError || formState === "submitting"}
            type="submit"
          >
            {formState === "submitting" ? copy.sending : copy.send}
          </button>
        </div>
      </form>
    </div>
  );
}
