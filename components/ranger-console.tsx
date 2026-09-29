"use client";

import { useRef, useState } from "react";
import { missionOptions } from "@/lib/contact-schema";
import { defineCopy } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";
import { ContactForm } from "./contact-form";
import { useLocale } from "./locale-provider";

/**
 * Consola de transmisión: el formulario de contacto leído como un instrumento.
 *
 * Envuelve `ContactForm` sin tocarlo. Escucha `input` y `change` que suben
 * desde el formulario y traduce el estado de los campos a una potencia de
 * señal de cuatro segmentos; los botones de misión escriben en el `<select>`
 * real, así que el dato que viaja al servidor sigue siendo uno solo. Nada de
 * esto es necesario para enviar: sin JavaScript no hay formulario y la propia
 * `ContactForm` ya explica la alternativa.
 */

type Signal = { name: boolean; email: boolean; mission: string; message: boolean };
const SILENT: Signal = { name: false, email: false, mission: "", message: false };

function readSignal(form: HTMLFormElement): Signal {
  const data = new FormData(form);
  const text = (field: string) => String(data.get(field) ?? "").trim();
  const email = text("email");
  return {
    name: text("name").length >= 2,
    email: email.includes("@") && email.lastIndexOf(".") > email.indexOf("@"),
    mission: text("mission"),
    message: text("message").length >= 20,
  };
}

const COPY = defineCopy({
  es: {
    hints: ["esperando tus datos", "sigue, va tomando forma", "a mitad de camino", "casi lista", "lista para transmitir"],
    newTransmission: "Nueva transmisión",
    channel: "Canal 06 / Ranger",
    chooseLabel: "Elegir misión",
    choose: "Elige una misión",
    signal: "Señal",
  },
  en: {
    hints: ["waiting for your details", "keep going, it’s taking shape", "halfway there", "almost ready", "ready to transmit"],
    newTransmission: "New transmission",
    channel: "Channel 06 / Ranger",
    chooseLabel: "Choose a mission",
    choose: "Pick a mission",
    signal: "Signal",
  },
});

export function RangerConsole({
  thanksHref,
  privacyHref,
}: {
  thanksHref: string;
  privacyHref: string;
}) {
  const locale = useLocale();
  const copy = COPY[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const [signal, setSignal] = useState<Signal>(SILENT);
  const strength = [signal.name, signal.email, Boolean(signal.mission), signal.message].filter(Boolean).length;

  function sync() {
    const form = rootRef.current?.querySelector("form");
    if (form) setSignal(readSignal(form));
  }

  function chooseMission(value: string) {
    const select = rootRef.current?.querySelector<HTMLSelectElement>('select[name="mission"]');
    if (!select) return;
    select.value = value;
    sync();
    playSfx("detent");
  }

  return (
    <div className="ranger-console" ref={rootRef} onInput={sync} onChange={sync}>
      <div className="ranger-console__bar">
        <span><i className="ranger-led" data-state={strength === 4 ? "ok" : "on"} aria-hidden="true" /> {copy.newTransmission}</span>
        <span aria-hidden="true">{copy.channel}</span>
      </div>
      <div className="ranger-missions" role="group" aria-label={copy.chooseLabel}>
        <p className="ranger-missions__label">{copy.choose}</p>
        <div className="ranger-missions__grid">
          {missionOptions(locale).map((option) => (
            <button key={option.value} className="ranger-mission" type="button" aria-pressed={signal.mission === option.value} onClick={() => chooseMission(option.value)}>
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ranger-meter" data-complete={strength === 4}>
        <div className="ranger-meter__bars" aria-hidden="true">
          {[0, 1, 2, 3].map((segment) => <i key={segment} data-on={segment < strength} />)}
        </div>
        <p className="ranger-meter__text">{copy.signal} {strength}/4 · {copy.hints[strength]}</p>
      </div>
      <ContactForm thanksHref={thanksHref} privacyHref={privacyHref} />
    </div>
  );
}
