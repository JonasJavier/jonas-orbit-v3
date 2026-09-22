"use client";

/* Images have build-time WebP variants, so the browser can use srcset without
   a second image transformation service. */
/* eslint-disable @next/next/no-img-element */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { playSfx } from "@/lib/sfx";
import { flushSync } from "react-dom";
import type { World } from "@/lib/worlds";
import { useMotionEnabled } from "@/lib/effects-mode";
import { MOSAIC_SCALES, mosaicRows } from "@/lib/mosaic-rows";

type Creativity = NonNullable<World["prose"]["creativity"]>;
type Artwork = Creativity["artworks"][number];
type Collection = Creativity["collections"][number];
type GalleryProps = Pick<Creativity, "artworks" | "collections">;

/** Works kept in the DOM on either side of the active one. Beyond this they are
 * `display: none`, so their images are never requested. */
const VISIBLE_SPAN = 3;
/** Quiet time before the controls dim and leave the works alone. */
const CINEMA_DELAY = 3500;
/** Horizontal travel, in px, that turns a short drag into a page. */
const DRAG_THRESHOLD = 45;
/** Release speed, in px/ms, that adds one more position to a drag. */
const FLICK = 0.55;
/** The ring never travels more than this many positions in one animation. */
const MAX_TRAVEL = 3;
/** Build-time WebP rungs (tools/prepare-edmunds.mjs). */
const RUNGS = [320, 480, 640, 960, 1280, 1920] as const;
/** A WebP looked at 1:1 is soft; the same photo shrunk from a bigger file is
 * crisp — that is why the viewer looked fine while the deck and the mosaic did
 * not. Every context asks for 1.5× the pixels it paints. */
const OVERSAMPLE = 1.5;
const pad = (value: number) => String(value).padStart(2, "0");
/** What the deck paints for a work of this aspect ratio, per breakpoint,
 * mirroring `--art-height` and `max-width` in the stylesheet. */
const deckSizes = (ratio: number) => {
  const r = ratio.toFixed(3);
  const paint = (height: string, max: string) => `calc(${OVERSAMPLE} * min(${r} * ${height}, ${max}))`;
  return [
    `(max-width: 700px) ${paint("clamp(180px, 40vh, 380px)", "80vw")}`,
    `(max-width: 1080px) ${paint("clamp(240px, 46vh, 520px)", "min(760px, 84vw)")}`,
    `(min-width: 1800px) ${paint("clamp(280px, 58vh, 720px)", "900px")}`,
    paint("clamp(260px, 56vh, 620px)", "min(760px, 84vw)"),
  ].join(", ");
};
/** What the mosaic paints: a justified row is as tall as the width left over
 * divided by the aspect ratios it carries (`lib/mosaic-rows.ts`), and a work is
 * that height times its own ratio. One term per band of widths. */
const gridSizes = (ratio: number) => {
  const r = ratio.toFixed(3);
  const row = (width: string, target: number) => `calc(${OVERSAMPLE} * ${r} * (${width}) / ${target})`;
  return [
    `(max-width: 480px) ${row("100vw - 55px", 1.25)}`,
    `(max-width: 700px) ${row("100vw - 80px", 1.7)}`,
    `(max-width: 1080px) ${row("100vw - 140px", 2.4)}`,
    `(max-width: 1439px) ${row("100vw - 200px", 3.4)}`,
    row("min(100vw - 144px, 1560px) - 110px", 4.4),
  ].join(", ");
};

/** Where every width cuts this sector into rows. The five bands live at once in
 * the HTML served —five tokens on one element, not five layouts— and the
 * stylesheet turns on the one that applies. */
function mosaicCuts(items: Artwork[]) {
  const ratios = items.map((art) => art.width / art.height);
  const bands = new Map<number, string[]>();
  for (const scale of MOSAIC_SCALES) for (const index of mosaicRows(ratios, scale)) bands.set(index, [...(bands.get(index) ?? []), scale.key]);
  return new Map([...bands].map(([index, keys]) => [index, keys.join(" ")] as const));
}

function ArtImage({ art, large = false, eager = false, sizes }: { art: Artwork; large?: boolean; eager?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const suffix = attempt ? `?retry=${attempt}` : "";
  if (failed) return <span className="edmunds-image-error" role="status"><span>La imagen no se ha podido cargar.</span>{large ? <button type="button" onClick={() => { setAttempt(attempt + 1); setFailed(false); }}>Reintentar</button> : <span>Abre el visor para intentarlo otra vez.</span>}</span>;
  return <img src={`/art/edmunds/${art.id}-${large ? 1920 : 960}.webp${suffix}`} srcSet={large ? undefined : RUNGS.map((width) => `/art/edmunds/${art.id}-${width}.webp${suffix} ${width}w`).join(", ")} sizes={large ? undefined : sizes} alt={art.alt} width={art.width} height={art.height} loading={eager || large ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** The deck: a fixed viewpoint over a ring of works on a full viewport, with
 * only the sector filter above and the work's title below. Only the works move.
 * No camera controller, render loop, WebGL context or autoplay; the pointer
 * adds at most two degrees of parallax, a drag turns the ring through its real
 * 3D positions until it is released, and after a few quiet seconds the
 * controls dim. None of that happens under reduced motion or the light profile.
 *
 * Every movement of the ring is ONE number: `--drag`, the fractional offset of
 * the whole ring in positions, written on the stage and inherited by the works.
 * While the hand is down it follows the pointer; on release, and for arrows,
 * keys and sector jumps, the active index changes and `--drag` jumps by the
 * same amount in the same frame — so nothing moves — and then eases back to 0
 * with a single transition. The works never transition their own transform:
 * that used to make the ring rubbery and the release abrupt. */
export function EdmundsGallery({ artworks, collections }: GalleryProps) {
  const [collection, setCollection] = useState("all");
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"space" | "grid" | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [finePointer, setFinePointer] = useState(false);
  const [idle, setIdle] = useState(false);
  /** The ambient light and the one before it: the newer fades in over the
   * older, which leaves once the fade has ended. Derived during render (the
   * documented "information from previous renders" pattern), not in an effect. */
  const [ambient, setAmbient] = useState<{ previous: Artwork | null; current: Artwork | null }>({ previous: null, current: null });
  const motion = useMotionEnabled();
  const mode = view ?? (motion ? "space" : "grid");
  // El interruptor único de movimiento del sitio decide si la cubierta gira.
  const still = !motion;
  const filtered = useMemo(() => collection === "all" ? artworks : artworks.filter((art) => art.collection === collection), [artworks, collection]);
  const current = filtered[active];
  const viewed = viewer === null ? null : filtered[viewer];
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; pointer: number; engaged: boolean; lastX: number; lastT: number; velocity: number; samples: number } | null>(null);
  const frame = useRef(0);
  const idleTimer = useRef(0);
  const suppressClick = useRef(false);
  const open = viewer !== null;
  const parallax = mode === "space" && finePointer && !still;
  const cinema = mode === "space" && !still && !open;
  if (mode === "space" && current && ambient.current?.id !== current.id) setAmbient({ previous: ambient.current, current });
  const lights = mode === "space" ? [ambient.previous, ambient.current].filter((art): art is Artwork => art !== null) : [];
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
  const groups = useMemo(() => {
    const list = collection === "all"
      ? collections.map((item) => ({ collection: item, items: filtered.filter((art) => art.collection === item.id) })).filter((group) => group.items.length)
      : segments.map((segment) => ({ collection: segment.collection, items: filtered.slice(segment.start, segment.start + segment.count) }));
    return list.map((group) => ({ ...group, cuts: mosaicCuts(group.items) }));
  }, [collection, collections, filtered, segments]);

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

  /** One style write per frame; no state, no re-render. */
  const write = (values: Record<string, string>) => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { for (const [key, value] of Object.entries(values)) stage.style.setProperty(key, value); });
  };
  /** Width of one position, from the registered `--step`; a safe default where
   * the stylesheet is not loaded (tests). */
  const stepWidth = () => {
    const stage = stageRef.current;
    const value = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--step")) : NaN;
    return Number.isFinite(value) && value > 0 ? value : 400;
  };
  /** Move to `index`. The ring is left exactly where it was — the active index
   * changes and `--drag` absorbs the difference in the same frame — and then
   * eases to rest. `from` is where the ring already is when a drag lets go. */
  const go = (index: number, from = 0) => {
    const stage = stageRef.current;
    const length = filtered.length;
    if (!length) return;
    const target = ((index % length) + length) % length;
    let travel = target - active;
    if (travel > length / 2) travel -= length;
    if (travel < -length / 2) travel += length;
    // Never further than the visible window: a long jump reads as three steps.
    travel = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, travel));
    /*
      El barrido del anillo. Va aquí y no en cada manejador porque `go` es el
      embudo de todo lo que lo mueve: flechas, teclado, salto de sector y
      soltar un arrastre. Y sólo si de verdad se mueve — pedir la obra que ya
      está centrada no gira nada, así que tampoco suena.
    */
    if (target !== active) playSfx("sweep");
    cancelAnimationFrame(frame.current);
    if (!stage || still || target === active) {
      flushSync(() => setActive(target));
      if (stage) { stage.dataset.dragging = "false"; stage.style.setProperty("--drag", "0"); }
      return;
    }
    // Same frame: new offsets, compensating drag, no transition — the works
    // stay put; then the transition takes `--drag` home.
    stage.dataset.dragging = "true";
    flushSync(() => setActive(target));
    stage.style.setProperty("--drag", String(from + travel));
    void getComputedStyle(stage).getPropertyValue("--drag");
    stage.dataset.dragging = "false";
    stage.style.setProperty("--drag", "0");
  };
  const step = (direction: number) => go(active + direction);
  /** Jump to the first work of the neighbouring sector, wrapping around. */
  const stepSector = (direction: number) => {
    if (!segments.length) return;
    const here = segments.findIndex((segment) => segment.start <= active && active < segment.start + segment.count);
    go(segments[(here + direction + segments.length) % segments.length].start);
  };
  const stepViewer = (direction: number) => {
    if (!filtered.length) return;
    setViewer((index) => index === null ? null : (index + direction + filtered.length) % filtered.length);
    playSfx("sweep", { level: 0.7 });
  };
  const showViewer = (index: number, opener: HTMLElement) => {
    openerRef.current = opener;
    setViewer(index);
    playSfx("open");
  };
  /** El visor se cierra por cuatro caminos; el sonido tiene uno solo. */
  const closeViewer = () => {
    setViewer(null);
    playSfx("close");
  };
  const select = (id: string) => {
    setCollection(id);
    setActive(0);
    stageRef.current?.style.setProperty("--drag", "0");
    playSfx("detent");
  };
  const endDrag = (dx: number, dy: number, velocity: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(frame.current);
    const horizontal = Math.abs(dx) > Math.abs(dy);
    // Where the ring is, in positions: a hand moving right carries the works
    // right, which brings the PREVIOUS work toward the centre.
    const drag = dx / stepWidth();
    let travel = horizontal ? -Math.round(drag) : 0;
    if (horizontal && !travel && Math.abs(dx) > DRAG_THRESHOLD) travel = dx < 0 ? 1 : -1;
    // One more for a flick, in the flick's direction.
    if (horizontal && Math.abs(velocity) > FLICK) travel += velocity < 0 ? 1 : -1;
    travel = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, travel));
    if (travel) { suppressClick.current = true; go(active + travel, still ? 0 : drag); }
    else { stage.dataset.dragging = "false"; stage.style.setProperty("--drag", "0"); }
  };

  const renderWork = (art: Artwork, index: number, distance: number) => {
    const visible = mode === "grid" || Math.abs(distance) <= VISIBLE_SPAN;
    const hasPrototype = Boolean(art.prototypeHref);
    return <li className="edmunds-artwork" key={art.id} data-offset={distance} data-visible={visible} data-sector={sector(art.collection)} style={{ "--art-ratio": art.width / art.height, "--o": distance, "--oa": Math.abs(distance) } as CSSProperties}>
      <figure>
        <a href={`/art/edmunds/${art.id}-1920.webp`} aria-label={`Ampliar: ${art.title}`} aria-current={mode === "space" && distance === 0 ? "true" : undefined} draggable={false} onDragStart={(event) => event.preventDefault()} onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          // On the deck a side work first comes to the centre; only the centred one opens.
          if (mode === "space" && distance !== 0) { go(index); return; }
          showViewer(index, event.currentTarget);
        }}>
          <ArtImage art={art} eager={mode === "space" && distance === 0} sizes={(mode === "space" ? deckSizes : gridSizes)(art.width / art.height)} />
          <span className="edmunds-artwork__brackets" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="edmunds-artwork__expand" aria-hidden="true">↗</span>
        </a>
        <figcaption><h3>{art.title}</h3>{hasPrototype && <a className="edmunds-project-link" href={art.prototypeHref} target="_blank" rel="noopener noreferrer">Ver proyecto en Figma <span aria-hidden="true">↗</span></a>}</figcaption>
      </figure>
    </li>;
  };

  return (
    <section className="edmunds-gallery" id="galeria" aria-label="Archivo visual" data-view={mode} data-reduced={still} data-idle={idle && cinema}
      onPointerMove={wake} onPointerDown={wake} onKeyDown={wake} onFocus={wake} onTouchStart={wake}>
      <noscript><style>{`.edmunds-gallery .edmunds-controls, .edmunds-gallery .edmunds-gallery__foot, .edmunds-gallery .edmunds-deck__sky, .edmunds-gallery .edmunds-stage__floor { display: none; } .edmunds-gallery[data-view="space"] { height: auto; min-height: 0; overflow: visible; } .edmunds-gallery .edmunds-stage { position: static; inset: auto; display: block; height: auto; min-height: 0; padding: 24px var(--page-gutter) 40px; overflow: visible; } .edmunds-gallery .edmunds-stage__space, .edmunds-gallery .edmunds-deck { position: static; inset: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artworks { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 32px; height: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artwork { display: block; position: static; width: auto; max-width: none; transform: none; opacity: 1; filter: none; visibility: visible; pointer-events: auto; } .edmunds-gallery .edmunds-artwork figcaption { display: block; }`}</style></noscript>
      {mode === "space" && current && <div className="edmunds-deck__sky" aria-hidden="true">
        <span className="edmunds-deck__nebula" />
        <span className="edmunds-deck__stars edmunds-deck__stars--far" />
        <span className="edmunds-deck__stars" />
        <span className="edmunds-deck__stars edmunds-deck__stars--bright" />
        <span className="edmunds-deck__auroras"><span className="edmunds-deck__aurora" /><span className="edmunds-deck__aurora edmunds-deck__aurora--two" /></span>
        <span className="edmunds-deck__dust" />
        {lights.map((art, index) => <img key={art.id} className={index === lights.length - 1 && lights.length > 1 ? "edmunds-deck__ambient edmunds-deck__ambient--in" : "edmunds-deck__ambient"} src={`/art/edmunds/${art.id}-480.webp`} alt="" width={art.width} height={art.height} decoding="async" draggable={false} onAnimationEnd={() => setAmbient((state) => ({ previous: null, current: state.current }))} />)}
        <span className="edmunds-deck__planet" />
        <span className="edmunds-deck__dune" />
      </div>}
      <div className="edmunds-top">
        <div className="edmunds-controls">
          <div className="edmunds-filters" role="group" aria-label="Filtrar por sector">
            <button type="button" aria-pressed={collection === "all"} onClick={() => select("all")}>Todo</button>
            {collections.map((item, index) => <button key={item.id} type="button" data-sector={index} aria-pressed={collection === item.id} onClick={() => select(item.id)}><i aria-hidden="true" />{item.label}</button>)}
          </div>
          <div className="edmunds-view-switch" role="group" aria-label="Vista del archivo"><button type="button" aria-pressed={mode === "space"} onClick={() => { setView("space"); playSfx("detent"); }}>Galería 3D</button><button type="button" aria-pressed={mode === "grid"} onClick={() => { setView("grid"); playSfx("detent"); }}>Mosaico</button></div>
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
            if (event.key === "Home") go(0);
            else if (event.key === "End") go(filtered.length - 1);
            else if (event.key === "PageDown" || event.key === "PageUp") stepSector(event.key === "PageDown" ? 1 : -1);
            else step(event.key === "ArrowRight" ? 1 : -1);
          }}
          onPointerDown={(event) => { if (mode === "space" && event.isPrimary && event.button === 0) { dragRef.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId, engaged: false, lastX: event.clientX, lastT: event.timeStamp, velocity: 0, samples: 0 }; suppressClick.current = false; } }}
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
              if (!start.engaged) return;
              // Recent speed, for the flick on release.
              const elapsed = event.timeStamp - start.lastT;
              if (elapsed > 0) { start.velocity = 0.6 * start.velocity + 0.4 * ((event.clientX - start.lastX) / elapsed); start.lastX = event.clientX; start.lastT = event.timeStamp; start.samples += 1; }
              // The ring turns with the hand, position by position, while the drag
              // lasts: `--drag` is how far the works have gone, in the hand's direction.
              write({ "--drag": still ? "0" : (dx / stepWidth()).toFixed(4) });
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
            // A hand that stopped before letting go carries no flick, and a single
            // jump of the pointer is not a gesture with a speed.
            const velocity = event.timeStamp - start.lastT > 80 || start.samples < 2 ? 0 : start.velocity;
            endDrag(event.clientX - start.x, event.clientY - start.y, start.engaged ? velocity : 0);
          }}
          onPointerCancel={() => { dragRef.current = null; suppressClick.current = false; endDrag(0, 0, 0); }}
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
          ) : groups.map(({ collection: item, items, cuts }) => (
            <section className="edmunds-group" key={item.id} data-sector={collections.indexOf(item)} aria-labelledby={`edmunds-group-${item.id}`}>
              <h2 id={`edmunds-group-${item.id}`} className="edmunds-group__label"><i aria-hidden="true" />{item.label}</h2>
              <ol className="edmunds-artworks">{items.map((art, index) => (
                <Fragment key={art.id}>
                  {cuts.has(index) && <li className="edmunds-mosaic-cut" data-at={cuts.get(index)} aria-hidden="true" />}
                  {renderWork(art, filtered.indexOf(art), 0)}
                </Fragment>
              ))}</ol>
            </section>
          ))}
        </div>
      )}
      {mode === "space" && current && <div className="edmunds-gallery__foot">
        <button type="button" aria-label="Obra anterior" disabled={filtered.length < 2} onClick={() => step(-1)}>←</button>
        <div className="edmunds-gallery__caption" key={current.id} aria-live="polite" aria-atomic="true"><span>{label(current.collection)} · {pad(active + 1)} / {pad(filtered.length)}</span><h2>{current.title}</h2>{current.prototypeHref ? <a className="edmunds-open" href={current.prototypeHref} target="_blank" rel="noopener noreferrer">Ver proyecto en Figma <span aria-hidden="true">↗</span></a> : <button type="button" className="edmunds-open" onClick={(event) => showViewer(active, event.currentTarget)}>Ampliar <span aria-hidden="true">↗</span></button>}</div>
        <button type="button" aria-label="Obra siguiente" disabled={filtered.length < 2} onClick={() => step(1)}>→</button>
      </div>}
      <p className="edmunds-grid-count" role="status">{filtered.length} piezas en esta selección</p>
      <dialog className="edmunds-viewer" ref={dialogRef} aria-label="Visor de obras" aria-describedby="edmunds-viewer-title" onCancel={closeViewer} onClick={(event) => { if (event.target === event.currentTarget) closeViewer(); }} onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); stepViewer(event.key === "ArrowRight" ? 1 : -1); }
      }}>
        {viewed && <><span className="edmunds-viewer__frame" aria-hidden="true"><i /><i /><i /><i /></span><div className="edmunds-viewer__bar"><span>{label(viewed.collection)} <span>· {pad(viewer! + 1)} / {pad(filtered.length)}</span></span><button type="button" autoFocus onClick={closeViewer}>Cerrar <span aria-hidden="true">×</span></button></div><figure className="edmunds-viewer__art"><ArtImage key={viewed.id} art={viewed} large /><figcaption id="edmunds-viewer-title" aria-live="polite">{viewed.title}</figcaption></figure><div className="edmunds-viewer__nav"><button type="button" aria-label="Anterior en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(-1)}>← <span>Anterior</span></button><span className="edmunds-viewer__actions">{viewed.prototypeHref ? <a className="edmunds-viewer__prototype" href={viewed.prototypeHref} target="_blank" rel="noopener noreferrer">Ver proyecto en Figma <span className="sr-only">en otra pestaña</span><span aria-hidden="true">↗</span></a> : <a href={`/art/edmunds/${viewed.id}-1920.webp`} target="_blank" rel="noopener noreferrer">Abrir imagen <span className="sr-only">en otra pestaña</span><span aria-hidden="true">↗</span></a>}</span><button type="button" aria-label="Siguiente en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(1)}><span>Siguiente</span> →</button></div></>}
      </dialog>
    </section>
  );
}
