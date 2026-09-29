"use client";

/* Peldaños WebP ya preparados (tools/prepare-projects.mjs): el optimizador de
   Next no elige entre archivos que existen. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { TableScreen } from "@/lib/engineering-table";
import { defineCopy } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

const COPY = defineCopy({
  es: {
    current: (name: string, index: number, total: number) => `${name}: pantalla ${index} de ${total}`,
    all: (name: string) => `Pantallas de ${name}`,
    close: "Cerrar",
    previous: "Pantalla anterior",
    next: "Pantalla siguiente",
  },
  en: {
    current: (name: string, index: number, total: number) => `${name}: screen ${index} of ${total}`,
    all: (name: string) => `${name} screens`,
    close: "Close",
    previous: "Previous screen",
    next: "Next screen",
  },
});

/**
 * EL VISOR DE PANTALLAS DEL CASO — una captura a pantalla completa
 * (`<dialog>` nativo: Esc cierra y ← → recorren TODAS las del proyecto).
 *
 * Lo abre cualquier pantalla de la página —la composición del primer
 * pantallazo, la de cada decisión, la rejilla de las que no salieron antes—:
 * todas son enlaces `a[data-case-shot]` a su captura grande, servidos en el
 * HTML. Sin JavaScript abren el archivo; con él, el visor, que escucha los
 * clics desde el documento: una sola puerta para las tres.
 *
 * Al cerrar, el foco vuelve a quien lo abrió; si fue la rejilla, a la
 * miniatura de la pantalla que se estaba mirando.
 */

type Shot = Pick<TableScreen, "alt" | "caption" | "frame" | "sources">;

const pad = (value: number) => String(value).padStart(2, "0");

/** El `sizes` del visor: el mismo al pintar y al adelantar las vecinas. */
const viewerSizes = (shot: Shot) => (shot.frame === "mobile" ? "(max-height: 900px) 40vh, 420px" : "92vw");

interface Opened {
  index: number;
  /** Lo que su miniatura ya descargó: el visor lo pinta mientras llega la grande. */
  placeholder: string | null;
}

export function CaseViewer({ screens, name }: { screens: readonly Shot[]; name: string }) {
  const t = COPY[useLocale()];
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [viewed, setViewed] = useState<number | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const total = screens.length;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Abrir en otra pestaña sigue siendo cosa del visitante.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLElement>("a[data-case-shot]") : null;
      const index = Number(link?.dataset.caseShot);
      if (!link || !Number.isInteger(index) || index < 0 || index >= total) return;
      event.preventDefault();
      opener.current = link;
      setOpened({ index, placeholder: link.querySelector("img")?.currentSrc || null });
      setViewed(index);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [total]);

  // El diálogo se abre cuando ya tiene su contenido: así el foco inicial cae
  // en «Cerrar» y no en un diálogo vacío.
  useEffect(() => {
    const element = dialog.current;
    if (viewed !== null && element && !element.open) element.showModal();
  }, [viewed]);

  // Las vecinas se piden mientras se mira ésta: la flecha no abre un hueco.
  useEffect(() => {
    if (viewed === null || total < 2) return;
    for (const delta of [1, -1]) {
      const shot = screens[(viewed + delta + total) % total];
      const image = new Image();
      image.decoding = "async";
      image.sizes = viewerSizes(shot);
      image.srcset = shot.sources.srcSet;
      image.src = shot.sources.src;
    }
  }, [viewed, screens, total]);

  function step(delta: number) {
    setViewed((index) => (index === null ? index : (index + delta + total) % total));
  }

  function onKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  }

  function onClose() {
    const index = viewed;
    const from = opener.current;
    setViewed(null);
    setOpened(null);
    opener.current = null;
    if (!from) return;
    const group = from.closest("[data-shot-group]");
    const sibling = index === null ? null : group?.querySelector<HTMLElement>(`a[data-case-shot="${index}"]`);
    (sibling ?? from).focus();
  }

  const shot = viewed === null ? null : screens[viewed];
  // Mientras baja la captura grande se ve la que ya está en caché —la
  // miniatura de quien abrió el visor— o el peldaño más pequeño: nunca un
  // marco vacío.
  const placeholder =
    shot && opened?.index === viewed && opened.placeholder ? opened.placeholder : (shot?.sources.thumb ?? null);

  return (
    <dialog
      ref={dialog}
      aria-label={shot ? t.current(name, index1(viewed), total) : t.all(name)}
      className="case-viewer"
      onClick={(event) => {
        // Un clic en el telón —fuera de la captura, su pie y los mandos— cierra.
        const target = event.target as Element;
        if (target === event.currentTarget || target.matches(".case-viewer__body, .case-viewer__figure, .case-viewer__stage")) {
          event.currentTarget.close();
        }
      }}
      onClose={onClose}
      onKeyDown={onKey}
    >
      {shot ? (
        <div className="case-viewer__body">
          <div className="case-viewer__bar">
            <p aria-live="polite" className="case-viewer__count">
              {pad(index1(viewed))} / {pad(total)}
            </p>
            <button autoFocus className="case-viewer__close" onClick={() => dialog.current?.close()} type="button">
              {t.close} <span aria-hidden="true">×</span>
            </button>
          </div>
          <figure className="case-viewer__figure" data-frame={shot.frame}>
            <div className="case-viewer__stage">
              <img
                key={shot.sources.src}
                alt={shot.alt}
                decoding="async"
                height={shot.sources.height}
                sizes={viewerSizes(shot)}
                src={shot.sources.src}
                srcSet={shot.sources.srcSet || undefined}
                style={
                  {
                    "--ar": shot.sources.width / shot.sources.height,
                    "--luma": shot.sources.luma ?? 0.5,
                    backgroundImage: placeholder ? `url("${placeholder}")` : undefined,
                  } as CSSProperties
                }
                width={shot.sources.width}
              />
            </div>
            <figcaption>{shot.caption}</figcaption>
          </figure>
          {total > 1 ? (
            <div className="case-viewer__nav">
              <button aria-label={t.previous} onClick={() => step(-1)} type="button">
                <span aria-hidden="true">←</span>
              </button>
              <button aria-label={t.next} onClick={() => step(1)} type="button">
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

function index1(index: number | null): number {
  return (index ?? 0) + 1;
}
