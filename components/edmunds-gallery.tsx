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
type GalleryProps = Pick<Creativity, "artworks" | "collections" | "heroLine"> & { title: string; intro: string };

const MEDIUM: Record<Artwork["medium"], string> = { photo: "Fotografía", poster: "Cartel", composite: "Fotomontaje", editorial: "Portada", interface: "Interfaz" };
/** Works kept in the DOM on either side of the active one. Beyond this they are
 * `display: none`, so their images are never requested. */
const VISIBLE_SPAN = 3;
/** Quiet time before the instrumentation dims and leaves the works alone. */
const CINEMA_DELAY = 3500;
const pad = (value: number) => String(value).padStart(2, "0");

function ArtImage({ art, large = false, eager = false }: { art: Artwork; large?: boolean; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const suffix = attempt ? `?retry=${attempt}` : "";
  if (failed) return <span className="edmunds-image-error" role="status"><span>La imagen no se ha podido cargar.</span>{large ? <button type="button" onClick={() => { setAttempt(attempt + 1); setFailed(false); }}>Reintentar</button> : <span>Abre el visor para intentarlo otra vez.</span>}</span>;
  return <img src={`/art/edmunds/${art.id}-${large ? 1920 : 960}.webp${suffix}`} srcSet={large ? undefined : `/art/edmunds/${art.id}-480.webp${suffix} 480w, /art/edmunds/${art.id}-960.webp${suffix} 960w`} sizes="(max-width: 700px) 84vw, 640px" alt={art.alt} width={art.width} height={art.height} loading={eager || large ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** The observation deck: a fixed viewpoint over a ring of works, filling the
 * viewport with the heading, controls and caption laid over it. Only the works
 * move between positions. No camera controller, render loop, WebGL context or
 * autoplay; the pointer adds at most two degrees of parallax, and never under
 * reduced motion or the light profile. After a few quiet seconds the
 * instrumentation dims — cinema mode — and any input brings it back. */
export function EdmundsGallery({ artworks, collections, heroLine, title, intro }: GalleryProps) {
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
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const parallaxFrame = useRef(0);
  const idleTimer = useRef(0);
  const suppressClick = useRef(false);
  const open = viewer !== null;
  const parallax = mode === "space" && finePointer && !still;
  const cinema = mode === "space" && !still && !open;

  /** Catalogue register per work: sector number and position inside it. */
  const registry = useMemo(() => {
    const map = new Map<string, { code: string; sector: number; label: string }>();
    collections.forEach((item, sector) => {
      artworks.filter((art) => art.collection === item.id).forEach((art, index) => map.set(art.id, { code: `${pad(sector + 1)}.${pad(index + 1)}`, sector, label: item.label }));
    });
    return map;
  }, [artworks, collections]);
  const entry = (art: Artwork) => registry.get(art.id) ?? { code: "—", sector: 0, label: art.collection };
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
  /** Any input wakes the instrumentation; moving between works re-arms it. */
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
  const goToSector = (id: string) => {
    select(id);
    sectionRef.current?.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "start" });
  };
  const setTilt = (x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(parallaxFrame.current);
    parallaxFrame.current = requestAnimationFrame(() => {
      stage.style.setProperty("--px", x.toFixed(3));
      stage.style.setProperty("--py", y.toFixed(3));
    });
  };

  const renderWork = (art: Artwork, index: number, distance: number) => {
    const visible = mode === "grid" || Math.abs(distance) <= VISIBLE_SPAN;
    const meta = entry(art);
    return <li className="edmunds-artwork" key={art.id} data-offset={distance} data-visible={visible} data-sector={meta.sector} style={{ "--art-ratio": art.width / art.height, "--o": distance, "--oa": Math.abs(distance) } as CSSProperties}>
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
        <figcaption><span>{meta.code} · {meta.label} · {MEDIUM[art.medium]}</span><h3>{art.title}</h3><p>{art.caption}</p></figcaption>
      </figure>
    </li>;
  };

  return (
    <>
      <section className="edmunds-gallery" id="galeria" ref={sectionRef} aria-label="Archivo visual" data-view={mode} data-reduced={still} data-idle={idle && cinema}
        onPointerMove={wake} onPointerDown={wake} onKeyDown={wake} onFocus={wake} onTouchStart={wake}>
        <noscript><style>{`.edmunds-gallery .edmunds-controls, .edmunds-gallery .edmunds-gallery__foot, .edmunds-gallery .edmunds-deck__sky, .edmunds-gallery .edmunds-stage__floor, .edmunds-gallery .edmunds-hud__readouts { display: none; } .edmunds-gallery[data-view="space"] { height: auto; min-height: 0; overflow: visible; } .edmunds-gallery[data-view="space"] .edmunds-top { position: static; background: none; } .edmunds-gallery .edmunds-stage { position: static; inset: auto; display: block; height: auto; min-height: 0; padding: 24px var(--page-gutter) 40px; overflow: visible; } .edmunds-gallery .edmunds-stage__space, .edmunds-gallery .edmunds-deck { position: static; inset: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artworks { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 32px; height: auto; perspective: none; transform: none; } .edmunds-gallery .edmunds-artwork { display: block; position: static; width: auto; max-width: none; transform: none; opacity: 1; filter: none; visibility: visible; pointer-events: auto; } .edmunds-gallery .edmunds-artwork figcaption { display: block; }`}</style></noscript>
        {mode === "space" && current && <div className="edmunds-deck__sky" aria-hidden="true"><span className="edmunds-deck__nebula" /><span className="edmunds-deck__stars" /><span className="edmunds-deck__stars edmunds-deck__stars--far" /><span className="edmunds-deck__dust" /><img key={current.id} className="edmunds-deck__ambient" src={`/art/edmunds/${current.id}-480.webp`} alt="" width={current.width} height={current.height} decoding="async" draggable={false} /><span className="edmunds-deck__planet" /><span className="edmunds-deck__dune" /></div>}
        <div className="edmunds-top">
          <header className="edmunds-hud">
            <div className="edmunds-hud__id">
              <p className="edmunds-eyebrow"><span className="edmunds-hud__dot" aria-hidden="true" /> DESTINO 04 <span>/</span> EDMUNDS <span className="edmunds-hud__deck">/</span> <span className="edmunds-hud__deck">CUBIERTA DE OBSERVACIÓN</span></p>
              <h1>{title}<em>{heroLine}</em></h1>
            </div>
            <p className="edmunds-hud__intro">{intro}</p>
            <dl className="edmunds-hud__readouts" aria-label="Lectura de la cubierta">
              {mode === "space" && current
                ? <><div><dt>Obra</dt><dd>{pad(active + 1)} <span>/ {pad(filtered.length)}</span></dd></div><div><dt>Sector</dt><dd>{entry(current).label}</dd></div><div><dt>Registro</dt><dd>{entry(current).code}</dd></div></>
                : <><div><dt>Piezas</dt><dd>{pad(filtered.length)}</dd></div><div><dt>Sector</dt><dd>{collection === "all" ? "Todos" : collections.find((item) => item.id === collection)?.label}</dd></div><div><dt>Vista</dt><dd>Mosaico</dd></div></>}
            </dl>
          </header>
          <div className="edmunds-controls">
            <div className="edmunds-filters" role="group" aria-label="Filtrar por sector">
              <button type="button" aria-pressed={collection === "all"} onClick={() => select("all")}>Todo <span>{artworks.length}</span></button>
              {collections.map((item, sector) => <button key={item.id} type="button" data-sector={sector} aria-pressed={collection === item.id} onClick={() => select(item.id)}><i aria-hidden="true" />{item.label} <span>{artworks.filter((art) => art.collection === item.id).length}</span></button>)}
            </div>
            <div className="edmunds-view-switch" role="group" aria-label="Vista del archivo"><button type="button" aria-pressed={mode === "space"} onClick={() => setView("space")}><span aria-hidden="true">◇</span> Galería 3D</button><button type="button" aria-pressed={mode === "grid"} onClick={() => setView("grid")}><span aria-hidden="true">▦</span> Mosaico</button></div>
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
            onPointerDown={(event) => { if (mode === "space" && event.isPrimary && event.button === 0) { dragRef.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId }; suppressClick.current = false; } }}
            onPointerMove={(event) => {
              const start = dragRef.current;
              if (start && start.pointer === event.pointerId) {
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }
              if (!parallax) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setTilt(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
            }}
            onPointerLeave={() => { if (parallax) setTilt(0, 0); }}
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
                <header className="edmunds-group__head"><span className="edmunds-eyebrow">SECTOR {pad(collections.indexOf(item) + 1)}</span><h2 id={`edmunds-group-${item.id}`}>{item.label}</h2><p>{item.description}</p><span>{items.length} piezas</span></header>
                <ol className="edmunds-artworks">{items.map((art) => renderWork(art, filtered.indexOf(art), 0))}</ol>
              </section>
            ))}
          </div>
        )}
        {mode === "space" && current && <div className="edmunds-gallery__foot">
          <div className="edmunds-gallery__buttons"><button type="button" aria-label="Obra anterior" disabled={filtered.length < 2} onClick={() => step(-1)}>←</button><button type="button" className="edmunds-open" onClick={(event) => showViewer(active, event.currentTarget)}>Ampliar <span aria-hidden="true">↗</span></button><button type="button" aria-label="Obra siguiente" disabled={filtered.length < 2} onClick={() => step(1)}>→</button></div>
          <div className="edmunds-gallery__caption" aria-live="polite" aria-atomic="true"><span>{entry(current).code} · {entry(current).label} · {MEDIUM[current.medium]}</span><h2>{current.title}</h2><p>{current.caption}</p></div>
          <div className="edmunds-track" role="group" aria-label="Posición en el archivo">
            <span className="edmunds-track__index"><span>{pad(active + 1)}</span> / {pad(filtered.length)}</span>
            <div className="edmunds-track__rail">
              {segments.map((segment) => <button key={segment.collection.id} type="button" data-sector={collections.indexOf(segment.collection)} data-current={segment.start <= active && active < segment.start + segment.count} style={{ flexGrow: segment.count }} aria-label={`${segment.collection.label}: ${segment.count} piezas`} onClick={() => setActive(segment.start)}><i aria-hidden="true" /></button>)}
              <i className="edmunds-track__marker" aria-hidden="true" style={{ left: `${((active + 0.5) / filtered.length) * 100}%` }} />
            </div>
            <span className="edmunds-track__hint" aria-hidden="true">{finePointer ? "ARRASTRA · ← → · AV PÁG · ENTER" : "DESLIZA PARA RECORRER"}</span>
          </div>
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
          {viewed && <><span className="edmunds-viewer__frame" aria-hidden="true"><i /><i /><i /><i /></span><div className="edmunds-viewer__bar"><span>{entry(viewed).code} · {entry(viewed).label} · {MEDIUM[viewed.medium]} <span>/ {pad(viewer! + 1)} — {pad(filtered.length)}</span></span><button type="button" autoFocus onClick={() => setViewer(null)}>Cerrar <span aria-hidden="true">×</span></button></div><figure className="edmunds-viewer__art"><ArtImage key={viewed.id} art={viewed} large /><figcaption id="edmunds-viewer-title" aria-live="polite"><strong>{viewed.title}</strong><span>{viewed.caption}</span></figcaption></figure><div className="edmunds-viewer__nav"><button type="button" aria-label="Anterior en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(-1)}>← <span>Anterior</span></button><a href={`/art/edmunds/${viewed.id}-1920.webp`} target="_blank" rel="noopener noreferrer">Abrir imagen <span className="sr-only">en otra pestaña</span><span aria-hidden="true">↗</span></a><button type="button" aria-label="Siguiente en el visor" disabled={filtered.length < 2} onClick={() => stepViewer(1)}><span>Siguiente</span> →</button></div></>}
        </dialog>
      </section>
      <nav className="edmunds-sectors" aria-label="Sectores del archivo">
        <div className="edmunds-sectors__head"><p className="edmunds-eyebrow">BITÁCORA · {artworks.length} PIEZAS · {collections.length} SECTORES</p><h2>Siete sectores, <em>una misma curiosidad.</em></h2><p>Cada sector agrupa una forma de mirar. Elige uno para recorrerlo en la cubierta.</p></div>
        <ol className="edmunds-sectors__list">
          {collections.map((item, sector) => {
            const items = artworks.filter((art) => art.collection === item.id);
            const cover = items[0];
            return <li key={item.id} data-sector={sector}>
              <button type="button" aria-pressed={collection === item.id} onClick={() => goToSector(item.id)}>
                <span className="edmunds-sector__cover" aria-hidden="true">{cover && <img src={`/art/edmunds/${cover.id}-480.webp`} alt="" width={cover.width} height={cover.height} loading="lazy" decoding="async" draggable={false} />}</span>
                <span className="edmunds-sector__meta"><span className="edmunds-eyebrow">SECTOR {pad(sector + 1)}</span><span className="edmunds-sector__name">{item.label}</span><span className="edmunds-sector__desc">{item.description}</span><span className="edmunds-sector__count">{items.length} piezas <span aria-hidden="true">→</span></span></span>
              </button>
            </li>;
          })}
        </ol>
      </nav>
    </>
  );
}
