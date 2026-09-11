"use client";

/* Images have build-time WebP variants, so the browser can use srcset without
   a second image transformation service. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { World } from "@/lib/worlds";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Creativity = NonNullable<World["prose"]["creativity"]>;
type Artwork = Creativity["artworks"][number];
type GalleryProps = Pick<Creativity, "artworks" | "collections">;

function ArtImage({ art, large = false, eager = false }: { art: Artwork; large?: boolean; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const suffix = attempt ? `?retry=${attempt}` : "";
  if (failed) return <span className="edmunds-image-error" role="status"><span>La imagen no se ha podido cargar.</span>{large ? <button type="button" onClick={() => { setAttempt(attempt + 1); setFailed(false); }}>Reintentar</button> : <span>Abre el visor para intentarlo otra vez.</span>}</span>;
  return <img src={`/art/edmunds/${art.id}-${large ? 1920 : 960}.webp${suffix}`} srcSet={large ? undefined : `/art/edmunds/${art.id}-480.webp${suffix} 480w, /art/edmunds/${art.id}-960.webp${suffix} 960w`} sizes="(max-width: 600px) 78vw, 480px" alt={art.alt} width={art.width} height={art.height} loading={eager || large ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** A fixed viewpoint; only the works move between five display positions.
 * No camera controller, render loop, WebGL context, or autoplay. */
export function EdmundsGallery({ artworks, collections }: GalleryProps) {
  const [collection, setCollection] = useState("all");
  const [active, setActive] = useState(Math.min(1, artworks.length - 1));
  const [view, setView] = useState<"space" | "grid" | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const light = useLightEffectsMode();
  const mode = view ?? (reduced || light ? "grid" : "space");
  const filtered = collection === "all" ? artworks : artworks.filter((art) => art.collection === collection);
  const current = filtered[active];
  const viewed = viewer === null ? null : filtered[viewer];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  const open = viewer !== null;
  const label = (id: string) => collections.find((item) => item.id === id)?.label ?? id;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = priorOverflow;
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const step = (direction: number) => {
    if (!filtered.length) return;
    setActive((index) => (index + direction + filtered.length) % filtered.length);
  };
  const stepViewer = (direction: number) => {
    if (!filtered.length) return;
    setViewer((index) => index === null ? null : (index + direction + filtered.length) % filtered.length);
  };
  const showViewer = (index: number, opener: HTMLElement) => {
    openerRef.current = opener;
    setViewer(index);
  };

  return (
    <section className="edmunds-gallery" id="galeria" aria-label="Archivo visual" data-view={mode} data-reduced={reduced || light}>
      <noscript><style>{`.edmunds-gallery .edmunds-controls, .edmunds-gallery .edmunds-gallery__foot, .edmunds-gallery .edmunds-gallery__hint { display: none; } .edmunds-gallery .edmunds-stage { display: block; min-height: 0; padding: 32px 24px; overflow: visible; } .edmunds-gallery .edmunds-artworks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 32px; height: auto; perspective: none; } .edmunds-gallery .edmunds-artwork { display: block; position: static; width: auto; max-width: none; transform: none; opacity: 1; visibility: visible; pointer-events: auto; } .edmunds-gallery .edmunds-artwork figcaption { display: block; }`}</style></noscript>
      <div className="edmunds-controls">
        <div className="edmunds-filters" role="group" aria-label="Filtrar por tema">
          <button type="button" aria-pressed={collection === "all"} onClick={() => { setCollection("all"); setActive(0); }}>Todo <span>{artworks.length}</span></button>
          {collections.map((item) => <button key={item.id} type="button" aria-pressed={collection === item.id} onClick={() => { setCollection(item.id); setActive(0); }}>{item.label}</button>)}
        </div>
        <div className="edmunds-view-switch" role="group" aria-label="Vista del archivo"><button type="button" aria-pressed={mode === "space"} onClick={() => setView("space")}><span aria-hidden="true">◇</span> Galería 3D</button><button type="button" aria-pressed={mode === "grid"} onClick={() => setView("grid")}><span aria-hidden="true">▦</span> Mosaico</button></div>
      </div>
      <div className="edmunds-gallery__hint"><span>{collection === "all" ? "FOTOGRAFÍA / DISEÑO / CURIOSIDAD" : collections.find((item) => item.id === collection)?.description}</span><span>{mode === "space" ? "ARRASTRA O USA LAS FLECHAS" : `${filtered.length} PIEZAS · ELIGE UNA PARA AMPLIAR`}</span></div>
      {!filtered.length ? <p className="edmunds-empty">Todavía no hay piezas en esta colección. El archivo sigue abierto.</p> : (
        <div className="edmunds-stage" role="region" aria-roledescription={mode === "space" ? "carrusel" : undefined} aria-label="Galería de obras" tabIndex={mode === "space" ? 0 : undefined}
          onKeyDown={(event) => {
            if (mode !== "space" || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            // Move focus to the stable stage before the previous card becomes inert.
            event.currentTarget.focus({ preventScroll: true });
            if (event.key === "Home") setActive(0);
            else if (event.key === "End") setActive(filtered.length - 1);
            else step(event.key === "ArrowRight" ? 1 : -1);
          }}
          onPointerDown={(event) => { if (mode === "space" && event.isPrimary && event.button === 0) { dragRef.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId }; suppressClick.current = false; } }}
          onPointerMove={(event) => {
            const start = dragRef.current;
            if (!start || start.pointer !== event.pointerId) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = dragRef.current;
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (!start || start.pointer !== event.pointerId) return;
            const dx = event.clientX - start.x;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { suppressClick.current = true; step(dx < 0 ? 1 : -1); }
          }}
          onPointerCancel={() => { dragRef.current = null; suppressClick.current = false; }}
          onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
          <ol className="edmunds-artworks">
            {filtered.map((art, index) => {
              let distance = index - active;
              if (distance > filtered.length / 2) distance -= filtered.length;
              if (distance < -filtered.length / 2) distance += filtered.length;
              const visible = mode === "grid" || Math.abs(distance) <= 2;
              return <li className="edmunds-artwork" key={art.id} data-offset={distance} data-visible={visible} style={{ "--art-ratio": art.width / art.height } as CSSProperties}>
                <figure><a href={`/art/edmunds/${art.id}-1920.webp`} aria-label={`Ampliar: ${art.title}`} onClick={(event) => {
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  if (mode === "space") setActive(index);
                  showViewer(index, event.currentTarget);
                }}><ArtImage art={art} eager={index === 1} /><span className="edmunds-artwork__expand" aria-hidden="true">↗</span></a><figcaption><span>{label(art.collection)}</span><h3>{art.title}</h3></figcaption></figure>
              </li>;
            })}
          </ol>
        </div>
      )}
      {filtered.length > 0 && <div className="edmunds-gallery__foot">
        <div className="edmunds-gallery__index"><span>{String(active + 1).padStart(2, "0")}</span><span>/ {String(filtered.length).padStart(2, "0")}</span><span className="edmunds-gallery__track" aria-hidden="true"><i style={{ width: `${((active + 1) / filtered.length) * 100}%` }} /></span></div>
        <div className="edmunds-gallery__caption" aria-live="polite" aria-atomic="true"><span>{current ? label(current.collection) : ""}</span><h2>{current?.title}</h2></div>
        <div className="edmunds-gallery__buttons"><button type="button" aria-label="Obra anterior" disabled={filtered.length < 2} onClick={() => step(-1)}>←</button><button type="button" className="edmunds-open" onClick={(event) => showViewer(active, event.currentTarget)}>Ampliar <span aria-hidden="true">↗</span></button><button type="button" aria-label="Obra siguiente" disabled={filtered.length < 2} onClick={() => step(1)}>→</button></div>
      </div>}
      <p className="edmunds-grid-count" role="status">{filtered.length} piezas en esta selección</p>
      <dialog className="edmunds-viewer" ref={dialogRef} aria-label="Visor de obras" aria-describedby="edmunds-viewer-title" onCancel={() => setViewer(null)} onClick={(event) => { if (event.target === event.currentTarget) setViewer(null); }} onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); stepViewer(event.key === "ArrowRight" ? 1 : -1); }
      }}>
        {viewed && <><div className="edmunds-viewer__bar"><span>{label(viewed.collection)} <span>/ {String(viewer! + 1).padStart(2, "0")} — {filtered.length}</span></span><button type="button" autoFocus onClick={() => setViewer(null)}>Cerrar <span aria-hidden="true">×</span></button></div><figure className="edmunds-viewer__art"><ArtImage key={viewed.id} art={viewed} large /><figcaption id="edmunds-viewer-title" aria-live="polite">{viewed.title}</figcaption></figure><div className="edmunds-viewer__nav"><button type="button" aria-label="Anterior en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(-1)}>← <span>Anterior</span></button><a href={`/art/edmunds/${viewed.id}-1920.webp`} target="_blank" rel="noopener noreferrer">Abrir imagen <span className="sr-only">en otra pestaña</span><span aria-hidden="true">↗</span></a><button type="button" aria-label="Siguiente en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(1)}><span>Siguiente</span> →</button></div></>}
      </dialog>
    </section>
  );
}
