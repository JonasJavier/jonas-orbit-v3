"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_PROFILE } from "@/content/site.data";
import { playSfx } from "@/lib/sfx";

const WHATSAPP_HREF = `https://wa.me/${SITE_PROFILE.whatsapp}?text=Hola%20Jon%C3%A1s%2C%20quiero%20conversar%20sobre%20un%20proyecto.`;
/** El número de WhatsApp es el mismo que el del teléfono: se muestra una vez. */
const DISPLAY_PHONE = SITE_PROFILE.phone.replace(/^(\+\d)(\d{3})(\d{3})(\d{4})$/, "$1 ($2) $3-$4");

type Frequency = { id: string; name: string };
const FREQUENCIES = {
  email: { id: "01", name: "Correo" },
  whatsapp: { id: "02", name: "WhatsApp" },
  linkedin: { id: "03", name: "LinkedIn" },
} satisfies Record<string, Frequency>;

/**
 * Las tres frecuencias: correo, WhatsApp y LinkedIn. Enlaces reales (mailto,
 * wa.me, LinkedIn) que funcionan sin JavaScript; apuntarlas enciende su LED y
 * escribe la frecuencia sintonizada en la cabecera del bloque; copiar
 * confirma de forma accesible. El teléfono no va aparte: es el mismo número
 * que el WhatsApp, que lo enseña y lo copia.
 *
 * Los botones de copiar se nombran por el DATO que copian y no por «correo» o
 * «WhatsApp»: el formulario de arriba tiene un campo «Correo», y un botón cuyo
 * nombre accesible contuviera esa palabra es un segundo candidato para quien
 * busca el campo por su etiqueta —lector de pantalla o Playwright por igual.
 */
export function ContactChannels() {
  const [frequency, setFrequency] = useState<Frequency | null>(null);
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
    apuntar— y sube de altura con la frecuencia: los tres canales son tres
    frecuencias y suenan como tres frecuencias.
  */
  const tune = (next: Frequency, pitch: number) => ({
    onPointerEnter: () => { setFrequency(next); playSfx("proximity", { pitch }); },
    onPointerLeave: () => setFrequency(null),
    onFocus: () => { setFrequency(next); playSfx("proximity", { pitch }); },
    onBlur: () => setFrequency(null),
  });

  return (
    <div className="ranger-channels" aria-label="Canales directos">
      <div className="ranger-module__label"><span>Frecuencias</span><span className="ranger-channels__tuned" aria-hidden="true" data-live={frequency ? "frequency" : undefined}>{frequency ? `Sintonizando ${frequency.id} · ${frequency.name}` : "Tierra ↔ Ranger"}</span></div>
      <div className="ranger-freq-list">
        <article className="ranger-freq" {...tune(FREQUENCIES.email, 1)}>
          <a href={`mailto:${SITE_PROFILE.email}`}>
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" />01 / CORREO</span>
            <span className="ranger-freq__value"><strong>{SITE_PROFILE.email}</strong><span className="ranger-freq__hint">Las buenas conversaciones empiezan aquí.</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={() => copy(SITE_PROFILE.email, "email")} data-copied={copied === "email"} aria-label={copied === "email" ? "Copiado" : `Copiar ${SITE_PROFILE.email}`}>{copied === "email" ? "✓" : <CopyIcon />}</button>
        </article>
        <article className="ranger-freq" {...tune(FREQUENCIES.whatsapp, 1.25)}>
          <a href={WHATSAPP_HREF} rel="noreferrer" target="_blank">
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" />02 / WHATSAPP</span>
            <span className="ranger-freq__value"><strong>{DISPLAY_PHONE}</strong><span className="ranger-freq__hint">Un hola, sin rodeos.</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={() => copy(SITE_PROFILE.phone, "phone")} data-copied={copied === "phone"} aria-label={copied === "phone" ? "Copiado" : `Copiar ${DISPLAY_PHONE}`}>{copied === "phone" ? "✓" : <CopyIcon />}</button>
        </article>
        <article className="ranger-freq" {...tune(FREQUENCIES.linkedin, 1.5)}>
          <a href={SITE_PROFILE.linkedin} rel="noreferrer" target="_blank">
            <span className="ranger-freq__id"><i className="ranger-led" aria-hidden="true" />03 / LINKEDIN</span>
            <span className="ranger-freq__value"><strong>{SITE_PROFILE.name}</strong><span className="ranger-freq__hint">Perfil profesional</span></span>
            <span className="ranger-freq__arrow" aria-hidden="true">↗</span>
          </a>
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
