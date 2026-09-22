"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_PROFILE } from "@/content/site.data";
import { useRangerCockpit, type Frequency } from "./ranger-cockpit";
import { playSfx } from "@/lib/sfx";

const WHATSAPP_HREF = `https://wa.me/${SITE_PROFILE.whatsapp}?text=Hola%20Jon%C3%A1s%2C%20quiero%20conversar%20sobre%20un%20proyecto.`;
const DISPLAY_PHONE = SITE_PROFILE.phone.replace(/^(\+\d)(\d{3})(\d{3})(\d{4})$/, "$1 ($2) $3-$4");

const FREQUENCIES = {
  email: { id: "01", name: "Correo", value: SITE_PROFILE.email },
  whatsapp: { id: "02", name: "WhatsApp", value: "Un hola, sin rodeos." },
  phone: { id: "03", name: "Teléfono", value: DISPLAY_PHONE },
} satisfies Record<string, NonNullable<Frequency>>;

/**
 * Las tres frecuencias del panel: correo, WhatsApp y teléfono. Enlaces reales
 * (mailto, wa.me, tel) que funcionan sin JavaScript; apuntarlas enciende su
 * LED y escribe la frecuencia en el HUD; copiar confirma de forma accesible.
 *
 * Los botones de copiar se nombran por el DATO que copian y no por «correo» o
 * «teléfono»: el formulario de abajo tiene un campo «Correo», y un botón cuyo
 * nombre accesible contuviera esa palabra es un segundo candidato para quien
 * busca el campo por su etiqueta —lector de pantalla o Playwright por igual.
 */
export function ContactChannels() {
  const { setFrequency } = useRangerCockpit();
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState<"email" | "phone" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRef = useRef(0);

  useEffect(() => () => { clearTimeout(timerRef.current); requestRef.current += 1; }, []);

  async function copy(value: string, channel: "email" | "phone") {
    const request = ++requestRef.current;
    clearTimeout(timerRef.current);
    try {
      await navigator.clipboard.writeText(value);
      if (request !== requestRef.current) return;
      setCopied(channel);
      setFeedback(channel === "email" ? "Correo copiado." : "Número copiado.");
      timerRef.current = setTimeout(() => { setCopied(null); setFeedback(""); }, 2600);
    } catch {
      if (request !== requestRef.current) return;
      setCopied(null);
      setFeedback("No se pudo copiar. Puedes seleccionar el dato o usar el enlace directo.");
    }
  }

  /*
    Sintonizar un canal. El blip es el mismo que el del mapa —apuntar es
    apuntar— y sube de altura con la frecuencia, que es lo que ya dice el
    panel en pantalla: los tres canales son tres frecuencias y suenan como
    tres frecuencias.
  */
  const tune = (frequency: Frequency, pitch: number) => ({
    onPointerEnter: () => { setFrequency(frequency); playSfx("proximity", { pitch }); },
    onPointerLeave: () => setFrequency(null),
    onFocus: () => { setFrequency(frequency); playSfx("proximity", { pitch }); },
    onBlur: () => setFrequency(null),
  });

  return (
    <div className="ranger-channels" aria-label="Canales directos">
      <div className="ranger-module__label"><span>Frecuencias</span><span aria-hidden="true">Tierra ↔ Ranger</span></div>
      <div className="ranger-freq-list">
        <article className="ranger-freq" {...tune(FREQUENCIES.email, 1)}>
          <a href={`mailto:${SITE_PROFILE.email}`}>
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" style={{ "--i": 0 } as React.CSSProperties} />01 / CORREO</span>
            <span className="ranger-freq__value"><strong>{SITE_PROFILE.email}</strong><span className="ranger-freq__hint">Las buenas conversaciones empiezan aquí.</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={() => copy(SITE_PROFILE.email, "email")} data-copied={copied === "email"} aria-label={copied === "email" ? "Copiado" : `Copiar ${SITE_PROFILE.email}`}>{copied === "email" ? "✓" : <CopyIcon />}</button>
        </article>
        <article className="ranger-freq" {...tune(FREQUENCIES.whatsapp, 1.25)}>
          <a href={WHATSAPP_HREF} rel="noreferrer" target="_blank">
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" style={{ "--i": 1 } as React.CSSProperties} />02 / WHATSAPP</span>
            <span className="ranger-freq__value"><strong>Un hola, sin rodeos.</strong><span className="ranger-freq__hint">Abrir conversación</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
        </article>
        <article className="ranger-freq" {...tune(FREQUENCIES.phone, 1.5)}>
          <a href={`tel:${SITE_PROFILE.phone}`}>
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" style={{ "--i": 2 } as React.CSSProperties} />03 / TELÉFONO</span>
            <span className="ranger-freq__value"><strong>{DISPLAY_PHONE}</strong><span className="ranger-freq__hint">Hablemos de tu próxima idea.</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={() => copy(SITE_PROFILE.phone, "phone")} data-copied={copied === "phone"} aria-label={copied === "phone" ? "Copiado" : `Copiar ${DISPLAY_PHONE}`}>{copied === "phone" ? "✓" : <CopyIcon />}</button>
        </article>
      </div>
      <p className="ranger-copy-status" role="status" aria-live="polite">{feedback}</p>
      <noscript><style>{`.ranger-freq > button { display: none; }`}</style></noscript>
    </div>
  );
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="1" /><path d="M15 5V3H3v13h2" /></svg>;
}
