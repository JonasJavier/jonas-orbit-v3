"use client";

import { useState } from "react";
import { SITE_PROFILE } from "@/content/site.data";

const EMAIL = SITE_PROFILE.email;
const WHATSAPP_HREF = `https://wa.me/${SITE_PROFILE.whatsapp}?text=Hola%20Jon%C3%A1s%2C%20quiero%20conversar%20sobre%20un%20proyecto.`;

export function ContactChannels() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  return (
    <div className="contact-channels" aria-label="Canales directos">
      <article className="contact-channel contact-channel--primary">
        <p>RESPUESTA DIRECTA / CORREO</p>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        <button type="button" onClick={copyEmail}>
          {copied ? "Correo copiado ✓" : "Copiar dirección"}
        </button>
      </article>

      <a
        className="contact-channel"
        href={WHATSAPP_HREF}
        rel="noreferrer"
        target="_blank"
      >
        <p>CANAL RÁPIDO</p>
        <strong>WhatsApp</strong>
        <span>Iniciar conversación ↗</span>
      </a>

      <a
        className="contact-channel"
        href={SITE_PROFILE.linkedin}
        rel="noreferrer"
        target="_blank"
      >
        <p>RED PROFESIONAL</p>
        <strong>LinkedIn</strong>
        <span>Ver perfil ↗</span>
      </a>

      <a
        className="contact-channel"
        href={SITE_PROFILE.github}
        rel="noreferrer"
        target="_blank"
      >
        <p>CÓDIGO ABIERTO</p>
        <strong>GitHub</strong>
        <span>Explorar repositorios ↗</span>
      </a>
    </div>
  );
}
