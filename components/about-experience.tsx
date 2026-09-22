"use client";

/* The viewer uses the same prebuilt images as the server-rendered chapters. */
/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useMotionEnabled } from "@/lib/effects-mode";
import { playSfx } from "@/lib/sfx";

type Photo = { src: string; alt: string; title: string; caption: string };

/** Progressive enhancement: every photo is a real image link without JS.
 * The story stays server-rendered; this boundary owns only navigation, motion
 * visibility and one native modal. It never controls the system camera. */
export function AboutExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  /** El visor se cierra por cuatro caminos; el sonido tiene uno solo. */
  const closePhoto = () => {
    setPhoto(null);
    playSfx("close");
  };
  const motion = useMotionEnabled();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chapters = [...root.querySelectorAll<HTMLElement>(".about-chapter")];
    const detail = root.querySelector<HTMLElement>(".about-detail")!;
    const slot = root.querySelector<HTMLElement>(".about-slot")!;
    const links = [
      ...root.querySelectorAll<HTMLAnchorElement>(
        ".about-node, .about-journey-nav a:not(.about-back-map)",
      ),
    ];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active: HTMLElement | undefined;
    let lastHash: string | undefined;
    let animation: Animation | undefined;
    let revision = 0;
    let releaseTimer = 0;
    let exitTimer = 0;
    let pendingCommit: (() => void) | undefined;
    let initialFrame = 0;
    const canAnimate = () =>
      !reduced.matches && root.dataset.aboutMotion === "on";
    const releaseHeight = () => {
      slot.style.minHeight = "";
      window.clearTimeout(releaseTimer);
    };
    const scrollToStart = (target: HTMLElement, smooth: boolean) => {
      const header =
        document.querySelector(".site-header")?.getBoundingClientRect()
          .height ?? 67;
      const top = target.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: smooth ? "smooth" : "instant",
      });
    };
    const select = (hash: string, intent: "initial" | "history" | "select") => {
      if (intent === "history" && hash === lastHash) return;
      lastHash = hash;
      const next = chapters.find((chapter) => `#${chapter.id}` === hash);
      /*
        Una constelación se abre o se cierra. Sólo con `select` —el gesto del
        visitante—: `initial` es el estado con el que llega la página y
        `history` es el botón de atrás, y ninguno de los dos es algo que se
        acabe de hacer. Sonar al cargar sería el sitio hablando solo.
      */
      if (intent === "select") playSfx(next ? "open" : "close");
      const previous = active;
      const token = ++revision;
      animation?.cancel();
      window.clearTimeout(exitTimer);
      pendingCommit = undefined;
      releaseHeight();
      // Keep the outgoing document height during the scroll, so selecting a
      // shorter story while reading near the bottom cannot clamp the viewport.
      if (previous && next) slot.style.minHeight = `${slot.offsetHeight}px`;
      root.dataset.active = next?.id ?? "";
      for (const link of links) {
        if (link.hash === hash) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
      const commit = () => {
        if (token !== revision) return;
        pendingCommit = undefined;
        animation?.cancel();
        for (const chapter of chapters)
          chapter.dataset.open = String(chapter === next);
        active = next;
        const selectedLink = root.querySelector<HTMLElement>(
          ".about-journey-nav [aria-current]",
        );
        const rail = selectedLink?.parentElement;
        if (selectedLink && rail && rail.scrollWidth > rail.clientWidth) {
          rail.scrollTo({
            left:
              selectedLink.offsetLeft -
              (rail.clientWidth - selectedLink.offsetWidth) / 2,
            behavior: "instant",
          });
        }
        const heading = next?.querySelector<HTMLElement>("h2");
        if (
          intent === "select" ||
          (intent === "history" && previous?.contains(document.activeElement))
        ) {
          (heading ?? root.querySelector<HTMLElement>("h1"))?.focus({
            preventScroll: true,
          });
        }
        if (intent !== "initial")
          scrollToStart(next ? detail : root, canAnimate());
        if (next && intent === "select" && canAnimate() && next.animate) {
          animation = next.animate(
            [
              { opacity: 0, transform: "translateY(10px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 180, easing: "ease-out" },
          );
        }
        if (!canAnimate()) releaseHeight();
        else releaseTimer = window.setTimeout(releaseHeight, 1000);
      };
      if (
        previous &&
        previous !== next &&
        next &&
        intent === "select" &&
        canAnimate() &&
        previous.animate
      ) {
        animation = previous.animate(
          [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(10px)" },
          ],
          { duration: 160, easing: "ease-in", fill: "forwards" },
        );
        // Navigation never waits on an animation event (or a rendered frame).
        pendingCommit = commit;
        exitTimer = window.setTimeout(commit, 160);
      } else commit();
    };
    const navigate = (event: globalThis.MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (!link || !root.contains(link)) return;
      if (
        link.hash !== "#constelacion" &&
        !chapters.some((chapter) => `#${chapter.id}` === link.hash)
      )
        return;
      event.preventDefault();
      if (window.location.hash !== link.hash)
        window.history.pushState(null, "", link.hash);
      select(link.hash, "select");
    };
    const restore = () => select(window.location.hash, "history");
    const stopMotion = () => {
      if (!canAnimate()) {
        window.clearTimeout(exitTimer);
        pendingCommit?.();
        animation?.cancel();
        releaseHeight();
      }
    };
    const visible = () => {
      root.dataset.pageVisible = String(!document.hidden);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries)
        (entry.target as HTMLElement).dataset.inView = String(
          entry.isIntersecting,
        );
    });
    root
      .querySelectorAll("[data-about-sky]")
      .forEach((element) => observer.observe(element));
    visible();
    root.dataset.enhanced = "true";
    select(window.location.hash, "initial");
    // CSS :target already opens a deep link before hydration. Align the shared
    // reading slot once, after the browser's native fragment positioning.
    if (active)
      initialFrame = requestAnimationFrame(() => scrollToStart(detail, false));
    const motionObserver = new MutationObserver(stopMotion);
    motionObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-about-motion"],
    });
    const tracks = [
      ...root.querySelectorAll<HTMLElement>(".about-shelf-track"),
    ];
    const updateShelves = () => {
      for (const track of tracks) {
        const shelf = track.closest(".about-shelf")!;
        shelf.querySelector<HTMLButtonElement>(
          '[data-shelf-step="-1"]',
        )!.disabled = track.scrollLeft <= 2;
        shelf.querySelector<HTMLButtonElement>(
          '[data-shelf-step="1"]',
        )!.disabled =
          track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      }
    };
    const resize = new ResizeObserver(updateShelves);
    for (const track of tracks) {
      resize.observe(track);
      track.addEventListener("scroll", updateShelves, { passive: true });
    }
    updateShelves();
    reduced.addEventListener("change", stopMotion);
    root.addEventListener("click", navigate);
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    window.addEventListener("scrollend", releaseHeight);
    document.addEventListener("visibilitychange", visible);
    return () => {
      observer.disconnect();
      motionObserver.disconnect();
      resize.disconnect();
      for (const track of tracks)
        track.removeEventListener("scroll", updateShelves);
      animation?.cancel();
      window.clearTimeout(exitTimer);
      ++revision;
      cancelAnimationFrame(initialFrame);
      releaseHeight();
      delete root.dataset.enhanced;
      reduced.removeEventListener("change", stopMotion);
      root.removeEventListener("click", navigate);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("scrollend", releaseHeight);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !motion) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cleanups = [
      ...root.querySelectorAll<HTMLElement>(".about-shelf"),
    ].map((shelf) => {
      const track = shelf.querySelector<HTMLElement>(".about-shelf-track")!;
      let timer = 0;
      let visible = false;
      let hovered = false;
      // Reading or operating a shelf gives control to the visitor for the rest
      // of this motion session. The shared movement switch can restart it.
      let interacted = shelf.contains(document.activeElement);
      const stop = () => {
        window.clearTimeout(timer);
        track.scrollTo({ left: track.scrollLeft, behavior: "instant" });
      };
      const schedule = () => {
        window.clearTimeout(timer);
        if (
          !visible ||
          hovered ||
          interacted ||
          document.hidden ||
          reduced.matches ||
          photo
        ) {
          stop();
          return;
        }
        timer = window.setTimeout(() => {
          const first = track.firstElementChild as HTMLElement | null;
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          const end = track.scrollWidth - track.clientWidth;
          track.scrollTo({
            left:
              track.scrollLeft >= end - 2
                ? 0
                : Math.min(
                    end,
                    track.scrollLeft + (first?.offsetWidth ?? 200) + gap,
                  ),
            behavior: "smooth",
          });
          schedule();
        }, 5500);
      };
      const enter = () => {
        hovered = true;
        schedule();
      };
      const leave = () => {
        hovered = false;
        schedule();
      };
      const takeControl = () => {
        interacted = true;
        stop();
      };
      const observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
          schedule();
        },
        { threshold: [0, 0.6] },
      );
      observer.observe(track);
      shelf.addEventListener("pointerenter", enter);
      shelf.addEventListener("pointerleave", leave);
      shelf.addEventListener("pointerdown", takeControl);
      shelf.addEventListener("focusin", takeControl);
      shelf.addEventListener("wheel", takeControl, { passive: true });
      document.addEventListener("visibilitychange", schedule);
      reduced.addEventListener("change", schedule);
      return () => {
        stop();
        observer.disconnect();
        shelf.removeEventListener("pointerenter", enter);
        shelf.removeEventListener("pointerleave", leave);
        shelf.removeEventListener("pointerdown", takeControl);
        shelf.removeEventListener("focusin", takeControl);
        shelf.removeEventListener("wheel", takeControl);
        document.removeEventListener("visibilitychange", schedule);
        reduced.removeEventListener("change", schedule);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [motion, photo]);

  useEffect(() => {
    if (!photo) return;
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
  }, [photo]);

  const openPhoto = (event: MouseEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const step = target.closest<HTMLButtonElement>("button[data-shelf-step]");
    if (step) {
      const track = document.getElementById(
        step.getAttribute("aria-controls") ?? "",
      );
      track?.scrollBy({
        left: Number(step.dataset.shelfStep) * track.clientWidth * 0.8,
        behavior:
          motion &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "instant",
      });
      return;
    }
    const anchor = target.closest<HTMLAnchorElement>("a[data-photo]");
    if (!anchor || !rootRef.current?.contains(anchor)) return;
    // Unsupported browsers keep the ordinary image navigation.
    if (
      typeof HTMLDialogElement === "undefined" ||
      !HTMLDialogElement.prototype.showModal
    )
      return;
    event.preventDefault();
    openerRef.current = anchor;
    playSfx("open");
    setPhoto({
      src: anchor.href,
      alt: anchor.querySelector("img")?.alt ?? "",
      title: anchor.dataset.title ?? "Fotografía",
      caption: anchor.dataset.caption ?? "",
    });
  };

  return (
    <article
      ref={rootRef}
      className="about-page"
      data-world="gargantua"
      data-about-motion={motion ? "on" : "off"}
      data-page-visible="false"
      onClick={openPhoto}
    >
      {children}
      {photo ? (
        <dialog
          className="about-viewer"
          ref={dialogRef}
          aria-labelledby="about-photo-title"
          aria-describedby="about-photo-caption"
          onCancel={() => closePhoto()}
          onClose={() => closePhoto()}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const box = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              closePhoto();
          }}
        >
          <div className="about-dialog-head">
            <h2 id="about-photo-title">{photo.title}</h2>
            <button type="button" autoFocus onClick={() => closePhoto()}>
              Cerrar ×
            </button>
          </div>
          <img src={photo.src} alt={photo.alt} />
          <p id="about-photo-caption">{photo.caption}</p>
        </dialog>
      ) : null}
    </article>
  );
}
