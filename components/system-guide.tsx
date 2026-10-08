"use client";

import { useEffect } from "react";
import { defineCopy } from "@/lib/i18n";
import { useLocale } from "./locale-provider";
import "./system-guide.css";

/**
 * Lo único que el HUD traduce entero: una guía dice qué es este sitio y qué
 * hacer con él, y eso no es telemetría. El resto del cristal habla en inglés de
 * instrumento, y la cabecera de la guía —`NAVIGATION SYSTEM // 001`— sigue en
 * ese idioma para que se lea como parte del puesto y no como un cartel.
 */
const COPY = defineCopy({
  es: {
    region: "Guía de navegación",
    title: "Explora mi universo",
    body:
      "Cada destino es una parte de mi trabajo: proyectos, formación, experimentos y creatividad.",
    cuePointer: "Apunta a un destino para comenzar",
    cueTouch: "Toca un destino para comenzar",
    dismiss: "Entendido",
  },
  en: {
    region: "Navigation guide",
    title: "Explore my universe",
    body:
      "Each destination is a part of my work: projects, education, experiments and creativity.",
    cuePointer: "Point at a destination to begin",
    cueTouch: "Tap a destination to begin",
    dismiss: "Got it",
  },
});

/** `pending`: montada pero todavía no se ve, así que nada puede retirarla. */
export type SystemGuideState = "pending" | "visible" | "leaving" | "gone";

/**
 * La guía de entrada del System Map (2026-10-07).
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Una persona puede admirar la escena diez segundos y no descubrir que está
 * delante de un portafolio profesional: la marca dice QUIÉN y el raíl dice
 * ADÓNDE, pero nada decía QUÉ ES ESTO ni QUÉ HACER. No se resuelve con un
 * título gigante —eso destruiría el encanto— sino con una guía pequeña, en el
 * lenguaje del cristal, que aparece al entrar y se retira sola en cuanto
 * empieza la exploración.
 *
 * ── Cuándo se va ────────────────────────────────────────────────────────────
 *
 * Con el primer destino apuntado o enfocado —cuerpo o raíl, es el mismo acto—,
 * con `Escape` o con su propio botón. No se va sola por tiempo: si el visitante
 * mira sin moverse, es exactamente cuando la guía hace falta. Se muestra una
 * vez por sesión (`sessionStorage`): volver a la portada desde un mundo ya es
 * explorar, y repetirla sería un cartel.
 *
 * Y no puede retirarse antes de haberse visto. Durante el primer segundo la
 * portada es el atlas plano y el puntero que ya se movía por la pantalla entra
 * en el blanco de Gargantúa —que cubre media escena— sin que nadie apunte a
 * nada: en una captura la guía salió retirada antes de aparecer. Por eso
 * arranca `pending`, invisible e inmune, y sólo pasa a `visible` 1,1 s
 * después; desde entonces el primer destino apuntado la retira.
 *
 * ── Qué no es ───────────────────────────────────────────────────────────────
 *
 * No es modal, no atrapa el foco y no tapa nada: el texto deja pasar el puntero
 * a la escena y sólo el botón lo recoge. Es `aside`, no diálogo: una nota al
 * margen del puesto de navegación.
 */
export function SystemGuide({
  state,
  onDismiss,
}: {
  state: SystemGuideState;
  onDismiss(): void;
}) {
  const copy = COPY[useLocale()];

  useEffect(() => {
    if (state !== "visible") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onDismiss]);

  if (state === "gone" || state === "pending") return null;

  return (
    <aside className="system-guide" data-state={state} aria-label={copy.region}>
      <p className="system-guide__eyebrow" aria-hidden="true">
        Navigation system <i>{"//"}</i> 001
      </p>
      <p className="system-guide__title">{copy.title}</p>
      <p className="system-guide__body">{copy.body}</p>
      <p className="system-guide__cue">
        <span className="system-guide__cue-pointer">{copy.cuePointer}</span>
        <span className="system-guide__cue-touch">{copy.cueTouch}</span>
      </p>
      <button
        type="button"
        className="system-guide__dismiss"
        onClick={onDismiss}
      >
        {copy.dismiss}
      </button>
    </aside>
  );
}
