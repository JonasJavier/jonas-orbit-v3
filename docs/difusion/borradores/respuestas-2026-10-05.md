# Respuestas propuestas — lunes 2026-10-05

Nada publicado. Cada una sale sólo con el «sí» de Jonás a esa respuesta.

## 1. dev.to — Vlad Zoff en «A bilingual Next.js site without middleware»

> The decision to model pages by identity rather than by their translated
> route is the part I'd keep even outside i18n. […] The translated slug stops
> being the identity of the content.

**Propuesta:**

Agreed, and it's the part I'd defend hardest. Once a page has an id, the slug
is just data: the sitemap, the hreflang alternates and the language switcher
all read the same table, and a Spanish slug under `/en` is a 404 at build
time instead of a broken link nobody notices. Have you used the same pattern
for renamed URLs, outside i18n?

## 2. Foro Three.js — Paladei en «g.a.d. ring» (t/94906, post 3)

Pregunta: *«When the camera moves again, do you hard-reset the history or let
it fade?»* Datos de `components/scene/gargantua-render.ts`
(`TEMPORAL_BLEND`, `VOYAGE_TEMPORAL_BLEND`, `temporalBlend`).

**Propuesta:**

It fades, with no reprojection. At rest each new frame blends in at 0.18, so
the history's weight decays as 0.82^n while the jitter walks the eight Halton
positions. While the camera moves (switching views in the observatory, or the
page transition on the main site) the weight is held at 0.55: a bit of
smoothing, no visible trail. A hard cut is just `accumulated = 0`: the blend
is `max(base, 1 / (accumulated + 1))`, so the first frame after it gets
weight 1 and overwrites the history, and I never have to clear the target.

Thanks for the breakdown. One shared mirror path inside and a split at every
exit facet is a neat way to keep it a single loop, and extra rays only where
the exit-plane index changes sounds like the right fix for the crawl.

## 3. Foro Three.js — _postminimal en «Tesseract, an interactive audiovisual piece» (t/94996, post 3) — opcional

Contestó a la pregunta de Jonás (todo son rotaciones: arrastre en XW/YW,
scroll en ZW, shift + arrastre en 3D). No hace falta responder; si se quiere
cerrar el hilo:

**Propuesta:**

That clears it up, thanks. If the universe is the surface of a 4D ball, then
moving through it and rotating it are the same gesture, which is a lovely
idea. Giving ZW its own input is a nice touch too.

## Sin novedades

- LinkedIn: sin comentarios nuevos («My posts» vacío). Aviso de LinkedIn: el
  #1 (OMSTA) sigue programado y sale mañana martes 6.
- Foro, tema propio t/94960 (Gargantua): sin respuestas nuevas desde las dos
  de Jonás del 10-04.
- Hacker News (`JonasJavier`): sin envíos ni comentarios todavía.
