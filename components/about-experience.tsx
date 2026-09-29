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
import { useLocale } from "./locale-provider";

type Photo = { src: string; alt: string; title: string; caption: string };

/** Progressive enhancement: every photo is a real image link without JS.
 * The story stays server-rendered; this boundary owns only navigation, motion
 * visibility and one native modal. It never controls the system camera. */
export function AboutExperience({ children }: { children: ReactNode }) {
  const close = useLocale() === "es" ? "Cerrar" : "Close";
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
    // The sky twinkles and the shelves drift only while on screen.
    root
      .querySelectorAll("[data-about-sky], .about-shelf")
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
    reduced.addEventListener("change", stopMotion);
    root.addEventListener("click", navigate);
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    window.addEventListener("scrollend", releaseHeight);
    document.addEventListener("visibilitychange", visible);
    return () => {
      observer.disconnect();
      motionObserver.disconnect();
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
              {close} ×
            </button>
          </div>
          <img src={photo.src} alt={photo.alt} />
          <p id="about-photo-caption">{photo.caption}</p>
        </dialog>
      ) : null}
    </article>
  );
}
