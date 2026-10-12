# Respuestas propuestas — lunes 2026-10-12

Nada publicado. Cada una sale sólo con el «sí» de Jonás a esa respuesta.
Brave con la extensión de Claude no estaba conectado: dev.to, foro y HN se
revisaron por sus API públicas; **LinkedIn no se pudo revisar** (necesita la
sesión).

## 1. dev.to — amirkhanian en «A pixel-ratio governor…» (10-10)

Escalera de degradación medida en una GPU Intel UHD: el bloom costaba más que
la ciudad entera (7,8 ms → 18,7 ms); primero pixel ratio, luego sombras
2048 → 1024, luego bloom fuera; al subir, sólo el pixel ratio; calienta
shaders con `renderer.compile`.

> The bloom number is the part I didn't have. My governor only touches the
> pixel ratio, and I never measured bloom on its own on an integrated GPU,
> so your ladder points at a gap in mine. Going back up only on the cheapest
> rung makes sense for the same reason I close a failed step: anything else
> oscillates. On warm-up, same conclusion here. The scene compiles with
> `compileAsync` before the first frame, with the render target it will draw
> into already bound, or the first real frame builds a different program.
> Did you let the pixel ratio drop below 1 before touching shadows?

Fuentes: `components/scene/resolution-governor.ts` (sólo pixel ratio, suelo
1); `components/scene/system-scene.ts` (comentario de `compileAsync` y el
render target).

## 2. dev.to — Vlad Zoff responde en «A bilingual Next.js site…» (10-12)

Para URL renombradas: identidad estable + redirección explícita del slug
viejo; cuidado con la unicidad de slugs por idioma y con la política de
traducciones que faltan.

> Both of those are build checks in mine. Velite fails the build if two
> pieces share a slug in the same language, and a page without its
> translation doesn't ship at all, so there's no fallback policy to get
> wrong. The redirect part I haven't needed yet: the two routes I renamed
> did it before launch, and they're plain 404s on purpose, because nothing
> pointed at them. The first time a published slug changes, I'd do what you
> describe: the old slug in the content as data, and the redirect generated
> from it.

Fuentes: `content/en/articles/nextjs-bilingual.mdx` (§ garantías de
Velite); `AGENTS.md` (`/es/desarrollo` y `/es/laboratorio` son 404 sin
alias); `next.config.ts` (no hay redirecciones de slugs).

## 3. Foro Three.js — satyasairay en «Banyan…» (t/95092, post 3, 10-08)

Responde a la pregunta de Jonás: el camino paralelo no llenaba la caché de
programas de Chrome en visitas siguientes; su sonda decide si la visita es
fría o caliente. Pregunta (a) si la diferencia del render target venía del
target o de estado como MSAA/sRGB, y (b) qué Chrome y GPU para el TBT
7,95 → 2 s.

> The return-visit trap is new to me. I never measured a second visit, so I
> can't tell you whether my parallel path fills Chrome's program cache. I'll
> check it.
>
> On the target: in my scene it's the state the target implies, not the
> target object. All three passes draw into a render target (the history
> buffer or the composer), and the program depends on output color space
> and tone mapping. Compiled against the screen, those would be different
> programs. I didn't isolate MSAA.
>
> The 7.95 → ~2.0 s was Lighthouse mobile on a laptop with an integrated AMD
> GPU, ANGLE on D3D11. I didn't log the Chrome version, sorry.

Fuentes: registro (entrada con «compileAsync», 7,95 s → ~2,0 s, «GPU real
(AMD integrada, ANGLE/D3D11)»); comentario en `system-scene.ts` («Se compila
con un render target activo… espacio de color y tone mapping»). La versión
de Chrome no está en el repo: por eso se dice.

## Sin respuesta propuesta

- dev.to, davidmenon12499 en el post de freelance (10-07): «great points on
  freelance». No pide nada; si Jonás quiere, un «Thanks, David.» basta.
- Foro t/95073 (gamut/HDR): gtnbssn preguntó tras el post de Jonás y
  donmccurdy (mantenedor de three.js) ya lo contestó del todo. Nada que
  añadir.
- Foro t/94960 (Gargantua), t/94906 (Paladei) y t/94996 (_postminimal): sin
  novedades desde las propuestas del 10-05.
- HN: la cuenta no tiene envíos ni comentarios (karma 1); el Show HN del
  10-06 no consta como enviado.
