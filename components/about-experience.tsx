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

type Photo = { src: string; alt: string; title: string; caption: string };

/** Progressive enhancement: every photo is a real image link without JS.
 * The story stays server-rendered; this boundary owns only navigation, motion
 * visibility and one native modal. It never controls the system camera. */
export function AboutExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const motion = useMotionEnabled();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chapters = [...root.querySelectorAll<HTMLElement>("section[id]")];
    const links = [
      ...root.querySelectorAll<HTMLAnchorElement>(
        ".about-journey-nav a:not(.about-back-map)",
      ),
    ];
    let frame = 0;
    const update = () => {
      frame = 0;
      const active = chapters
        .filter(
          (section) =>
            section.getBoundingClientRect().top <= window.innerHeight * 0.4,
        )
        .at(-1)?.id;
      for (const link of links) {
        if (link.hash === `#${active}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
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
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", visible);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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
          onCancel={() => setPhoto(null)}
          onClose={() => setPhoto(null)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const box = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              setPhoto(null);
          }}
        >
          <div className="about-dialog-head">
            <h2 id="about-photo-title">{photo.title}</h2>
            <button type="button" autoFocus onClick={() => setPhoto(null)}>
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
