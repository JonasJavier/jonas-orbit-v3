"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_PROFILE } from "@/content/site.data";

const WHATSAPP_HREF = `https://wa.me/${SITE_PROFILE.whatsapp}?text=Hola%20Jon%C3%A1s%2C%20quiero%20conversar%20sobre%20un%20proyecto.`;
const DISPLAY_PHONE = SITE_PROFILE.phone.replace(/^(\+\d)(\d{3})(\d{3})(\d{4})$/, "$1 ($2) $3-$4");

export function ContactChannels() {
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

  return (
    <div className="ranger-channels" aria-label="Canales directos">
      <div className="ranger-channels__heading"><span className="ranger-kicker">ELIGE TU FRECUENCIA</span><span className="ranger-channels__destination">TIERRA ↔ RANGER</span></div>
      <div className="ranger-channels__grid">
        <article className="ranger-channel ranger-channel--email">
          <a href={`mailto:${SITE_PROFILE.email}`}><span className="ranger-channel__label"><span>01 / CORREO</span><span aria-hidden="true">↗</span></span><strong>{SITE_PROFILE.email}</strong><span className="ranger-channel__hint">Las buenas conversaciones empiezan aquí.</span></a>
          <button type="button" onClick={() => copy(SITE_PROFILE.email, "email")} aria-label={copied === "email" ? "Correo copiado" : "Copiar correo"}>{copied === "email" ? "✓" : <CopyIcon />}</button>
        </article>
        <article className="ranger-channel">
          <a href={WHATSAPP_HREF} rel="noreferrer" target="_blank"><span className="ranger-channel__label"><span>02 / WHATSAPP</span><span aria-hidden="true">↗</span></span><strong>Un hola, sin rodeos.</strong><span className="ranger-channel__hint">Abrir conversación</span></a>
        </article>
        <article className="ranger-channel">
          <a href={`tel:${SITE_PROFILE.phone}`}><span className="ranger-channel__label"><span>03 / TELÉFONO</span><span aria-hidden="true">↗</span></span><strong>{DISPLAY_PHONE}</strong><span className="ranger-channel__hint">Hablemos de tu próxima idea.</span></a>
          <button type="button" onClick={() => copy(SITE_PROFILE.phone, "phone")} aria-label={copied === "phone" ? "Número copiado" : "Copiar teléfono"}>{copied === "phone" ? "✓" : <CopyIcon />}</button>
        </article>
      </div>
      <p className="ranger-copy-status" role="status" aria-live="polite">{feedback}</p>
      <noscript><style>{`.ranger-channel > button { display: none; }`}</style></noscript>
    </div>
  );
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="1" /><path d="M15 5V3H3v13h2" /></svg>;
}
