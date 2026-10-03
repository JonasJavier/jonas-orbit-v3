"use client";

import { IntentLink as Link } from "@/components/intent-link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CaseHeading } from "@/lib/case-outline";

/**
 * La orientación del caso completo: la barra local que aparece al dejar atrás
 * el primer pantallazo, el índice lateral de la lectura larga y la vuelta a
 * la mesa. Las dos primeras resaltan dónde está el visitante; ninguna es
 * contenido. Sin JavaScript el índice sigue siendo una lista de enlaces
 * normales, y la barra no aparece (el HTML ya se lee de arriba abajo sin ella).
 */

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * El apartado actual: el último cuyo comienzo ya subió por encima de una línea
 * al 32 % de la ventana. Se mide al desplazar (una vez por fotograma, como
 * mucho) y no con IntersectionObserver: un salto largo —un ancla de la barra,
 * la tecla Fin— lleva un apartado de debajo de la ventana a encima de ella sin
 * cruzar nunca la franja observada, y el observador no avisaría.
 *
 * Con `endId`, el final del contenido baja la línea: los últimos apartados
 * suelen ser cortos y nunca llegarían al 32 % antes de que el texto se acabe.
 * Cuanto menos contenido queda bajo la ventana, más baja la línea, hasta el
 * pie de la ventana cuando el contenido termina: el último apartado a la
 * vista se enciende al leerlo, no al pasarlo.
 */
function useCurrentSection(ids: readonly string[], endId?: string): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const targets = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;
    const end = endId ? document.getElementById(endId) : null;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const height = window.innerHeight;
      const ramp = height * 0.68;
      const below = end ? end.getBoundingClientRect().bottom - height : Infinity;
      const line = height * 0.32 + ramp * (1 - Math.min(1, Math.max(0, below / ramp)));
      const last = [...targets].reverse().find((element) => element.getBoundingClientRect().top <= line);
      setCurrent(last ? last.id : null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [key, endId]);

  return current;
}

/**
 * «← Proyectos»: vuelve a la mesa con este proyecto elegido (`#id`). Los `#id`
 * de la mesa son los destinos de `:target` que eligen proyecto, no puntos de
 * lectura; si el enrutador saltase a ellos, la mesa —una composición de
 * pantalla completa— aparecería desplazada cientos de píxeles. La mesa lee el
 * hash por su cuenta: aquí se navega sin desplazar y desde arriba.
 */
export function CaseBackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="case-back"
      href={href}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
      scroll={false}
    >
      {children}
    </Link>
  );
}

export function CaseLocalNav({
  label,
  name,
  heroId,
  sections,
}: {
  /** Nombre accesible de la barra, en el idioma de la página. */
  label: string;
  name: string;
  /** El primer pantallazo: la barra aparece cuando su pie pasa bajo la cabecera. */
  heroId: string;
  sections: readonly { id: string; label: string }[];
}) {
  const [shown, setShown] = useState(false);
  const current = useCurrentSection(sections.map((section) => section.id));
  const list = useRef<HTMLOListElement>(null);

  // En un teléfono la barra se desplaza en horizontal: el apartado actual se
  // trae a la vista moviendo sólo la barra.
  useEffect(() => {
    const strip = list.current;
    const link = strip?.querySelector<HTMLElement>("a[aria-current]");
    if (!strip || !link || strip.scrollWidth <= strip.clientWidth) return;
    // La lista es el `offsetParent` de sus enlaces (`position: relative`).
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left - 16;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth + 16;
  }, [current]);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      // La cabecera del sitio mide 63-67 px: el pie del héroe «sale» al
      // llegar bajo ella, no al llegar al canto de la ventana.
      { rootMargin: "-120px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroId]);

  return (
    <nav aria-label={label} className="case-localnav" data-shown={shown ? "true" : undefined} inert={!shown}>
      <div className="case-localnav__inner">
        <a className="case-localnav__name" href="#top">
          {name}
        </a>
        <ol ref={list}>
          {sections.map((section) => (
            <li key={section.id}>
              <a aria-current={current === section.id ? "location" : undefined} href={`#${section.id}`}>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export function CaseReadingIndex({
  headings,
  endId,
  label,
}: {
  headings: readonly CaseHeading[];
  endId: string;
  label: string;
}) {
  const current = useCurrentSection(
    headings.map((heading) => heading.id),
    endId,
  );
  const nav = useRef<HTMLElement>(null);

  // En una ventana baja el índice no cabe entero y se desplaza por dentro: el
  // apartado actual se mantiene a la vista moviendo SÓLO el índice (nunca
  // `scrollIntoView`, que arrastraría también la página).
  useEffect(() => {
    const box = nav.current;
    const link = box?.querySelector<HTMLElement>("a[aria-current]");
    if (!box || !link || box.scrollHeight <= box.clientHeight) return;
    const top = link.offsetTop;
    const bottom = top + link.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
  }, [current]);

  return (
    <nav ref={nav} aria-label={label} className="case-index">
      <ol>
        {headings.map((heading, index) => (
          <li key={heading.id}>
            <a aria-current={current === heading.id ? "location" : undefined} href={`#${heading.id}`}>
              <span aria-hidden="true">{pad(index + 1)}</span>
              {heading.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * La lectura larga, plegada en el teléfono (pase del 2026-09-29): ocho
 * pantallas de prosa detrás de todo lo demás alargaban el caso hasta los
 * 25 000 px. Se ven los primeros párrafos, fundidos, y «Seguir leyendo» la
 * despliega entera. En escritorio el pliegue no existe (`display: contents`)
 * y sin JavaScript tampoco (`scripting: enabled`): el texto está siempre en
 * el HTML servido.
 *
 * Se abre sola si algo apunta dentro: un capítulo en el hash —al llegar o al
 * cambiarlo— o el foco del teclado en un enlace de la prosa.
 */
export function CaseFold({ bodyId, label, children }: { bodyId: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const fold = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target && fold.current?.contains(target)) setOpen(true);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <div
      ref={fold}
      className="case-fold"
      data-open={open ? "true" : undefined}
      onFocusCapture={(event) => {
        if (document.getElementById(bodyId)?.contains(event.target)) setOpen(true);
      }}
    >
      {children}
      {open ? null : (
        <button aria-controls={bodyId} aria-expanded="false" className="case-action case-fold__more" onClick={() => setOpen(true)} type="button">
          {label} <span aria-hidden="true">↓</span>
        </button>
      )}
    </div>
  );
}
