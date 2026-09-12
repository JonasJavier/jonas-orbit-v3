"use client";

/* Images have build-time WebP variants, so the browser can use srcset without
   a second image transformation service. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { World } from "@/lib/worlds";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

type Creativity = NonNullable<World["prose"]["creativity"]>;
type Artwork = Creativity["artworks"][number];
type Collection = Creativity["collections"][number];
type GalleryProps = Pick<Creativity, "artworks" | "collections">;

/** Works kept in the DOM on either side of the active one. Beyond this they are
 * `display: none`, so their images are never requested. */
const VISIBLE_SPAN = 3;
/** Quiet time before the controls dim and leave the works alone. */
const CINEMA_DELAY = 3500;
/** Horizontal travel, in px, that turns a drag into a page. */
const DRAG_THRESHOLD = 45;
const pad = (value: number) => String(value).padStart(2, "0");

function ArtImage({ art, large = false, eager = false }: { art: Artwork; large?: boolean; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const suffix = attempt ? `?retry=${attempt}` : "";
  if (failed) return <span className="edmunds-image-error" role="status"><span>La imagen no se ha podido cargar.</span>{large ? <button type="button" onClick={() => { setAttempt(attempt + 1); setFailed(false); }}>Reintentar</button> : <span>Abre el visor para intentarlo otra vez.</span>}</span>;
  return <img src={`/art/edmunds/${art.id}-${large ? 1920 : 960}.webp${suffix}`} srcSet={large ? undefined : `/art/edmunds/${art.id}-480.webp${suffix} 480w, /art/edmunds/${art.id}-960.webp${suffix} 960w`} sizes="(max-width: 700px) 84vw, 700px" alt={art.alt} width={art.width} height={art.height} loading={eager || large ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** The deck: a fixed viewpoint over a ring of works on a full viewport, with
 * only the sector filter above and the work's title below. Only the works move.
 * No camera controller, render loop, WebGL context or autoplay; the pointer
 * adds at most two degrees of parallax, a drag carries the ring with it until
 * it is released, and after a few quiet seconds the controls dim. None of that
 * happens under reduced motion or the light profile. */
export function EdmundsGallery({ artworks, collections }: GalleryProps) {
  const [collection, setCollection] = useState("all");
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"space" | "grid" | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [finePointer, setFinePointer] = useState(false);
  const [idle, setIdle] = useState(false);
  const reduced = usePrefersReducedMotion();
  const light = useLightEffectsMode();
  const mode = view ?? (reduced || light ? "grid" : "space");
  const still = reduced || light;
  const filtered = collection === "all" ? artworks : artworks.filter((art) => art.collection === collection);
  const current = filtered[active];
  const viewed = viewer === null ? null : filtered[viewer];
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; pointer: number; engaged: boolean } | null>(null);
  const frame = useRef(0);
  const idleTimer = useRef(0);
  const suppressClick = useRef(false);
  const open = viewer !== null;
  const parallax = mode === "space" && finePointer && !still;
  const cinema = mode === "space" && !still && !open;
  const label = (id: string) => collections.find((item) => item.id === id)?.label ?? id;
  const sector = (id: string) => Math.max(0, collections.findIndex((item) => item.id === id));
  const segments = useMemo(() => {
    const list: { collection: Collection; start: number; count: number }[] = [];
    filtered.forEach((art, index) => {
      const last = list[list.length - 1];
      if (last && last.collection.id === art.collection) last.count += 1;
      else list.push({ collection: collections.find((item) => item.id === art.collection) ?? { id: art.collection, label: art.collection, description: "" }, start: index, count: 1 });
    });
    return list;
  }, [filtered, collections]);
  const groups = collection === "all"
    ? collections.map((item) => ({ collection: item, items: filtered.filter((art) => art.collection === item.id) })).filter((group) => group.items.length)
    : segments.map((segment) => ({ collection: segment.collection, items: filtered.slice(segment.start, segment.start + segment.count) }));

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(pointer: fine)");
    const read = () => setFinePointer(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

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

  /** Restart the quiet countdown; the state only flips inside the timer. */
  const arm = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    if (!cinema) return;
    idleTimer.current = window.setTimeout(() => setIdle(true), CINEMA_DELAY);
  }, [cinema]);
  /** Any input wakes the controls; moving between works re-arms the countdown. */
  const wake = () => { setIdle(false); arm(); };
  useEffect(() => {
    arm();
    return () => window.clearTimeout(idleTimer.current);
  }, [arm, active, collection]);

  const step = (direction: number) => {
    if (!filtered.length) return;
    setActive((index) => (index + direction + filtered.length) % filtered.length);
  };
  /** Jump to the first work of the neighbouring sector, wrapping around. */
  const stepSector = (direction: number) => {
    if (!segments.length) return;
    const here = segments.findIndex((segment) => segment.start <= active && active < segment.start + segment.count);
    setActive(segments[(here + direction + segments.length) % segments.length].start);
  };
  const stepViewer = (direction: number) => {
    if (!filtered.length) return;
    setViewer((index) => index === null ? null : (index + direction + filtered.length) % filtered.length);
  };
  const showViewer = (index: number, opener: HTMLElement) => {
    openerRef.current = opener;
    setViewer(index);
  };
  const select = (id: string) => {
    setCollection(id);
    setActive(0);
  };
  /** One style write per frame; no state, no re-render. */
  const write = (values: Record<string, string>) => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { for (const [key, value] of Object.entries(values)) stage.style.setProperty(key, value); });
  };
  const endDrag = (dx: number, dy: number) => {
    const stage = stageRef.current;
    if (stage) { stage.dataset.dragging = "false"; cancelAnimationFrame(frame.current); stage.style.setProperty("--drag-px", "0px"); }
    if (Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) { suppressClick.current = true; step(dx < 0 ? 1 : -1); }
  };

  const renderWork = (art: Artwork, index: number, distance: number) => {
    const visible = mode === "grid" || Math.abs(distance) <= VISIBLE_SPAN;
    return <li className="edmunds-artwork" key={art.id} data-offset={distance} data-visible={visible} data-sector={sector(art.collection)} style={{ "--art-ratio": art.width / art.height, "--o": distance, "--oa": Math.abs(distance) } as CSSProperties}>
      <figure>
        <a href={`/art/edmunds/${art.id}-1920.webp`} aria-label={`Ampliar: ${art.title}`} aria-current={mode === "space" && distance === 0 ? "true" : undefined} draggable={false} onDragStart={(event) => event.preventDefault()} onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          // On the deck a side work first comes to the centre; only the centred one opens.
          if (mode === "space" && distance !== 0) { setActive(index); return; }
          showViewer(index, event.currentTarget);
        }}>
          <ArtImage art={art} eager={mode === "space" && distance === 0} />
          <span className="edmunds-artwork__brackets" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="edmunds-artwork__expand" aria-hidden="true">↗</span>
        </a>
        <figcaption><h3>{art.title}</h3></figcaption>
      </figure>
    </li>;
  };

  return (
    <section className="edmunds-gallery" id="galeria" aria-label="Archivo visual" data-view={mode} data-reduced={still} data-idle={idle && cinema}
      onPointerMove={wake} onPointerDown={wake} onKeyDown={wake} onFocus={wake} onTouchStart={wake}>
      <noscript><style>{`.edmunds-gallery .edmunds-controls, .edmunds-gallery .edmunds-gallery__foot, .edmunds-gallery .edmunds-deck__sky, .edmunds-gallery .edmunds-stage__floor { display: none; } .edmunds-gallery[data-view="space"] { height: auto; min-height: 0; overflow: visible; } .edmunds-gallery .edmunds-stage { position: static; inset: auto; display: block; height: auto; min-height: 0; padding: 24px var(--page-gutter) 40px; overflow: visible; } .edmunds-gallery .edmunds-stage__space, .edmunds-gallery .edmunds-deck { position: static; inset: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artworks { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 32px; height: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artwork { display: block; position: static; width: auto; max-width: none; transform: none; opacity: 1; filter: none; visibility: visible; pointer-events: auto; } .edmunds-gallery .edmunds-artwork figcaption { display: block; }`}</style></noscript>
      {mode === "space" && current && <div className="edmunds-deck__sky" aria-hidden="true"><span className="edmunds-deck__nebula" /><span className="edmunds-deck__stars" /><span className="edmunds-deck__stars edmunds-deck__stars--far" /><span className="edmunds-deck__dust" /><img key={current.id} className="edmunds-deck__ambient" src={`/art/edmunds/${current.id}-480.webp`} alt="" width={current.width} height={current.height} decoding="async" draggable={false} /><span className="edmunds-deck__planet" /><span className="edmunds-deck__dune" /></div>}
      <div className="edmunds-top">
        <div className="edmunds-controls">
          <div className="edmunds-filters" role="group" aria-label="Filtrar por sector">
            <button type="button" aria-pressed={collection === "all"} onClick={() => select("all")}>Todo</button>
            {collections.map((item, index) => <button key={item.id} type="button" data-sector={index} aria-pressed={collection === item.id} onClick={() => select(item.id)}><i aria-hidden="true" />{item.label}</button>)}
          </div>
          <div className="edmunds-view-switch" role="group" aria-label="Vista del archivo"><button type="button" aria-pressed={mode === "space"} onClick={() => setView("space")}>Galería 3D</button><button type="button" aria-pressed={mode === "grid"} onClick={() => setView("grid")}>Mosaico</button></div>
        </div>
      </div>
      {!filtered.length ? <p className="edmunds-empty">Todavía no hay piezas en este sector. El archivo sigue abierto.</p> : (
        <div className="edmunds-stage" ref={stageRef} role="region" aria-roledescription={mode === "space" ? "carrusel" : undefined} aria-label="Galería de obras" tabIndex={mode === "space" ? 0 : undefined}
          onKeyDown={(event) => {
            if (mode !== "space") return;
            if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); showViewer(active, event.currentTarget); return; }
            if (!["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
            event.preventDefault();
            // Move focus to the stable stage before the previous card becomes inert.
            event.currentTarget.focus({ preventScroll: true });
            if (event.key === "Home") setActive(0);
            else if (event.key === "End") setActive(filtered.length - 1);
            else if (event.key === "PageDown" || event.key === "PageUp") stepSector(event.key === "PageDown" ? 1 : -1);
            else step(event.key === "ArrowRight" ? 1 : -1);
          }}
          onPointerDown={(event) => { if (mode === "space" && event.isPrimary && event.button === 0) { dragRef.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId, engaged: false }; suppressClick.current = false; } }}
          onPointerMove={(event) => {
            const start = dragRef.current;
            if (start && start.pointer === event.pointerId) {
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (!start.engaged && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
                start.engaged = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                event.currentTarget.dataset.dragging = "true";
              }
              // The ring follows the hand while the drag lasts.
              if (start.engaged) write({ "--drag-px": `${still ? 0 : dx}px` });
              return;
            }
            if (!parallax) return;
            const rect = event.currentTarget.getBoundingClientRect();
            write({ "--px": (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3), "--py": (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3) });
          }}
          onPointerLeave={() => { if (parallax && !dragRef.current) write({ "--px": "0", "--py": "0" }); }}
          onPointerUp={(event) => {
            const start = dragRef.current;
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (!start || start.pointer !== event.pointerId) return;
            endDrag(event.clientX - start.x, event.clientY - start.y);
          }}
          onPointerCancel={() => { dragRef.current = null; suppressClick.current = false; endDrag(0, 0); }}
          onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
          {mode === "space" ? (
            <>
              <div className="edmunds-stage__floor" aria-hidden="true"><span className="edmunds-deck__floor" /></div>
              <div className="edmunds-stage__space">
                <div className="edmunds-deck">
                  <ol className="edmunds-artworks">
                    {filtered.map((art, index) => {
                      let distance = index - active;
                      if (distance > filtered.length / 2) distance -= filtered.length;
                      if (distance < -filtered.length / 2) distance += filtered.length;
                      return renderWork(art, index, distance);
                    })}
                  </ol>
                </div>
              </div>
            </>
          ) : groups.map(({ collection: item, items }) => (
            <section className="edmunds-group" key={item.id} data-sector={collections.indexOf(item)} aria-labelledby={`edmunds-group-${item.id}`}>
              <h2 id={`edmunds-group-${item.id}`} className="edmunds-group__label"><i aria-hidden="true" />{item.label}</h2>
              <ol className="edmunds-artworks">{items.map((art) => renderWork(art, filtered.indexOf(art), 0))}</ol>
            </section>
          ))}
        </div>
      )}
      {mode === "space" && current && <div className="edmunds-gallery__foot">
        <button type="button" aria-label="Obra anterior" disabled={filtered.length < 2} onClick={() => step(-1)}>←</button>
        <div className="edmunds-gallery__caption" key={current.id} aria-live="polite" aria-atomic="true"><span>{label(current.collection)} · {pad(active + 1)} / {pad(filtered.length)}</span><h2>{current.title}</h2><button type="button" className="edmunds-open" onClick={(event) => showViewer(active, event.currentTarget)}>Ampliar <span aria-hidden="true">↗</span></button></div>
        <button type="button" aria-label="Obra siguiente" disabled={filtered.length < 2} onClick={() => step(1)}>→</button>
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
        {viewed && <><span className="edmunds-viewer__frame" aria-hidden="true"><i /><i /><i /><i /></span><div className="edmunds-viewer__bar"><span>{label(viewed.collection)} <span>· {pad(viewer! + 1)} / {pad(filtered.length)}</span></span><button type="button" autoFocus onClick={() => setViewer(null)}>Cerrar <span aria-hidden="true">×</span></button></div><figure className="edmunds-viewer__art"><ArtImage key={viewed.id} art={viewed} large /><figcaption id="edmunds-viewer-title" aria-live="polite">{viewed.title}</figcaption></figure><div className="edmunds-viewer__nav"><button type="button" aria-label="Anterior en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(-1)}>← <span>Anterior</span></button><a href={`/art/edmunds/${viewed.id}-1920.webp`} target="_blank" rel="noopener noreferrer">Abrir imagen <span className="sr-only">en otra pestaña</span><span aria-hidden="true">↗</span></a><button type="button" aria-label="Siguiente en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(1)}><span>Siguiente</span> →</button></div></>}
      </dialog>
    </section>
  );
}
