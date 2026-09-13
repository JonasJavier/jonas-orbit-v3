"use client";

import { useRef, useState } from "react";
import { MISSION_OPTIONS } from "@/lib/contact-schema";
import { ContactForm } from "./contact-form";

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

const HINTS: Record<number, string> = {
  0: "esperando tus datos",
  1: "sigue, va tomando forma",
  2: "a mitad de camino",
  3: "casi lista",
  4: "lista para transmitir",
};

export function RangerConsole() {
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
  }

  return (
    <div className="ranger-console" ref={rootRef} onInput={sync} onChange={sync}>
      <div className="ranger-console__bar">
        <span><i className="ranger-led" data-state={strength === 4 ? "ok" : "on"} aria-hidden="true" /> Nueva transmisión</span>
        <span aria-hidden="true">Canal 06 / Ranger</span>
      </div>
      <div className="ranger-missions" role="group" aria-label="Elegir misión">
        <p className="ranger-missions__label">Elige una misión</p>
        <div className="ranger-missions__grid">
          {MISSION_OPTIONS.map((option) => (
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
        <p className="ranger-meter__text">Señal {strength}/4 · {HINTS[strength]}</p>
      </div>
      <ContactForm />
    </div>
  );
}
