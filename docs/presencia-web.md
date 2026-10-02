# Presencia web — el proyecto entero, no sólo el sitio (2026-10-02)

Este repositorio es el centro de la presencia pública de Jonás Javier
Encarnación: el sitio (`jonasjavier.dev`) y, alrededor, los canales que lo
hacen visible. Todo lo que se publica fuera sale de material que ya está
aquí (casos, registros, documentos de diseño, código) y vuelve aquí como
enlace. Este documento manda en **canales, cadencia y proceso editorial**; el
texto de cada canal y las guías paso a paso siguen en
[`docs/difusion/README.md`](difusion/README.md).

## 1. Los canales y para qué sirve cada uno

| Canal | Qué hace por Jonás | Estado (2026-10-02) | Dueño de la tarea |
| --- | --- | --- | --- |
| **Sitio** `jonasjavier.dev` | Casa de todo: casos, blog, servicios, Observatorio. Donde se gana el posicionamiento. | Publicado; blog con 6 entradas ES/EN | Repo (Claude + Jonás) |
| **Google Search Console** | Dice si Google indexa y por qué consultas llega la gente. | Dominio verificado; datos desde 09-29 | Jonás revisa; Claude audita |
| **Google Business Profile** | Búsquedas locales («desarrollador web Santo Domingo»); mapa y reseñas. | Verificado y configurado el 02-10 (kit §1 «Estado»); 0 reseñas | Jonás (reseñas reales); Claude (novedades) |
| **dev.to** `dev.to/jonasjavier` | Lectores técnicos el mismo día y un enlace fuerte al original (`canonical_url`). | Perfil completo; 6 entradas en la serie «Building Jonás Orbit» | Claude publica; Jonás responde comentarios |
| **LinkedIn** | Reclutadores y clientes; el perfil es la ficha que más leen. | Auditado; calendario de dos posts por semana en `docs/linkedin-audit/calendario-publicaciones.md` (#0 publicado el 02-10) | Jonás publica; Claude redacta |
| **GitHub** `github.com/JonasJavier` | Donde un reclutador técnico comprueba que el código existe; cada commit cuenta como actividad. | Repo público; README del perfil pendiente | Jonás (README del perfil, repos fijados) |
| **X (Twitter)** | La comunidad de Three.js y WebGL vive ahí (`#threejs`, `#webgl`); un clip de 15 s del agujero negro llega a quien contrata 3D. | Pendiente | Jonás (clips desde el Observatorio) |
| **Instagram / YouTube Shorts / TikTok** | Vídeo corto de Gargantúa y el Observatorio; une su fotografía con el 3D. Mucho alcance, nada de SEO directo. | Pendiente | Jonás |
| **CodePen** | Demos pequeñas de shaders: el nicho 3D las comparte y enlaza. | Pendiente | Jonás (una demo al mes basta) |
| **Behance / Dribbble** | El lado de diseño UX/UI: pantallas de los casos para clientes que buscan diseñador. | Pendiente | Jonás |
| **Foro de Three.js (Showcase)** | El público exacto del nicho 3D. | Pendiente | Jonás (kit §3) |
| **Reddit** r/threejs, r/webdev (sábados), r/nextjs | Volumen; sólo con la entrada que encaje en cada sub. | Pendiente | Jonás (kit §4) |
| **Show HN** | Mucho tráfico si sube; se intenta una vez. | Pendiente | Jonás (kit §5) |
| **Awwwards / CSS Design Awards / The FWA** | Enlaces de autoridad; tardan semanas. | Pendiente | Jonás (kit §6) |
| **Bing Webmaster Tools** | Bing y DuckDuckGo; importa la propiedad de Search Console en un clic. | Pendiente | Jonás |

## 2. Cadencia y calendario semanal

| Día | Qué | Hora (Santo Domingo) | Quién |
| --- | --- | --- | --- |
| Lunes | La rutina deja el borrador de la entrada (§4). Revisión de comentarios de dev.to. | 08:00 | Claude → Jonás |
| Martes | **Post 1 en LinkedIn** (calendario en `docs/linkedin-audit/calendario-publicaciones.md`). | 09:00 | Jonás |
| Miércoles | La entrada revisada entra al sitio y a dev.to. | tarde | Claude (sesión local) + Jonás |
| Jueves | **Post 2 en LinkedIn**. Novedad en Google Business Profile (la misma pieza, en 2–3 frases, imagen 4:3 y botón «Más información» a la entrada). | 09:00 | Jonás |
| Viernes | Un clip o captura del Observatorio en X / Instagram, enlazando la entrada. | 12:00 | Jonás |
| Sábado | r/webdev («Showoff Saturday») sólo si la entrada de la semana encaja. | mañana | Jonás |
| Día 27 de cada mes | Search Console, estadísticas de dev.to y LinkedIn; reordenar la cola. | — | Claude + Jonás |

LinkedIn: martes y jueves a las 9:00 porque es cuando más gente de RD y de
la costa este de EE. UU. mira el feed (antes de empezar el día); el
alcance cae a partir del viernes al mediodía y el fin de semana. Si una
semana se pierde el martes, el post va el miércoles a la misma hora, no el
sábado. La cuenta sin verificar tiene un límite diario de publicaciones y
programar cuenta para ese límite.

- **Una entrada nueva por semana** en el blog del sitio (ES y EN) y su copia
  en dev.to. Semanal y no diaria a propósito: dev.to y Google premian la
  constancia, no el volumen, y una entrada diaria en una cuenta nueva se lee
  como spam. Si una semana no hay material honesto, no se publica.
- **El borrador llega el lunes** por la rutina de Claude (§4); se revisa y se
  publica durante la semana.
- **dev.to: una publicación cada cinco minutos como máximo** (límite de la
  cuenta) y las respuestas a comentarios el mismo día.
- **Cada mes** (≈ día 27): consultas y páginas en Search Console, estadísticas
  de dev.to, y se ajusta la cola de temas con lo que la gente busca de verdad.

## 3. Proceso editorial de una entrada

1. **Tema** de la cola (§5), en orden salvo que una búsqueda real pida otro.
2. **Borrador** en `docs/difusion/borradores/<id>/` con `es.mdx`, `en.mdx`
   (mismo esquema que `content/{es,en}/articles/*.mdx`) y `notas.md` (fuentes
   usadas, figuras que faltan, dudas). Datos sólo del código y del registro;
   nada inventado; voz de Jonás (primera persona, directo, sin adjetivos de
   relleno).
3. **Revisión de Jonás**: cambia lo que no suene a él. Es la única parte que
   no se delega.
4. **Entrada al sitio**: los MDX pasan a `content/{es,en}/articles/`, el id a
   `content/articles.data.ts` (tema, carpeta de figuras, portada, espécimen),
   las figuras a `public/images/articulos/<carpeta>/` en `-800.webp` y
   `-1600.webp` (capturas con GPU real: `tools/README.md`), `npm run check` y
   el e2e del blog (`e2e/blog.spec.ts` cuenta las entradas), publicación en
   `production`.
5. **dev.to**: `node --experimental-strip-types tools/prepare-devto.mjs`,
   pegar `docs/difusion/devto/<id>.md` entero en Create Post (editor «basic
   markdown») y guardar. Si el botón no hace nada, es el límite de cinco
   minutos.
6. **Difusión**: la fila del kit que corresponda (foro de Three.js para 3D,
   r/nextjs para Next.js, LinkedIn para freelance), un sitio por día.
7. **Cola**: la fila del tema pasa a «publicado» con la fecha y los enlaces.

## 4. La rutina semanal de Claude

Rutina en la nube **«Borrador semanal del blog (jonasjavier.dev)»**
(`trig_01S7Qc3xTXMzBZsDq4c3UGBD`, <https://claude.ai/code/routines>), los
lunes a las 08:00 de Santo Domingo (12:00 UTC), con Opus y sin conectores. Trabaja sobre una copia
del repo en GitHub, sin acceso a esta máquina ni a dev.to, y hace sólo el
paso 2: elige el primer tema «pendiente» de la cola, lee sus fuentes en el
repo, escribe `es.mdx`, `en.mdx` y `notas.md` en
`docs/difusion/borradores/<id>/`, marca la fila como «borrador» y hace un
commit en `main` (sólo documentación: no toca `content/`, `app/`, `lib/`,
`components/` ni `public/`). No publica nada: lo que la gente ve sigue
pasando por la revisión de Jonás y por los gates del repo.

Si el push a `main` falla, abre un PR desde una rama `routine/<id>` y lo dice
en el título; Jonás lo fusiona y borra la rama (regla «todo en `main`»).

## 5. Cola de temas

Orden pensado para alternar públicos: 3D, freelance, ciencia, ingeniería del
sitio. `estado`: pendiente → borrador (fecha) → publicado (fecha, enlaces).

| # | id | Título de trabajo | Tema | Fuentes en el repo | Estado |
| --- | --- | --- | --- | --- | --- |
| 1 | `miller-ocean-webgl2` | El océano de Miller: agua en WebGL2 que se mueve sin parar la página | webgl (espécimen `miller`) | `docs/design/miller-formacion.md` §«Océano en WebGL2…», `docs/design/world-visual-language.md` §9 quinquies, `components/miller-ocean.tsx`, registro «Rendimiento móvil» (el agua espera a `after-load-idle`) | pendiente |
| 2 | `written-proposal` | Qué tiene que decir una propuesta por escrito antes de empezar un proyecto | freelance | `components/services-page.tsx` (proceso y preguntas), `content/*/articles/hire-freelance-developer-dr.mdx`, registro «Servicios y notas de taller» | pendiente |
| 3 | `miller-time-dilation` | Por qué una hora son siete años en el planeta de Miller | space (espécimen `miller`) | `content/*/articles/interstellar-black-hole-physics.mdx` (lo ya dicho, no repetir), `docs/design/miller-formacion.md` | pendiente |
| 4 | `wormhole-voyage` | La travesía por el agujero de gusano: un shader, 2,6 segundos y un sonido sintetizado | webgl (espécimen `ranger`) | `docs/design/ranger-contacto.md` §«Travesía…», `docs/design/travesia-espaciotemporal.md`, `lib/voyage-audio.ts`, registro «Travesía…» | pendiente |
| 5 | `omsta-case` | Cómo se hizo OMSTA: un ERP con app móvil para una agencia de viajes real | freelance | `content/*/projects/omsta.mdx`, `docs/design/endurance-proyectos.md` §18, registro «OMSTA» | pendiente |
| 6 | `endurance-twelve-modules` | Doce módulos y tres siluetas: la Endurance en 3D | webgl (espécimen `endurance`) | `docs/design/endurance-jerarquia.md` §«Cuarto pase», `components/scene/bodies.ts` (sólo la parte de Endurance, por función) | pendiente |
| 7 | `measure-without-cheating` | Medir un sitio 3D sin hacer trampa: Lighthouse en CI, A/B y las trampas que costaron una entrega | performance | `AGENTS.md` §«Trampas de medición», registro «Rendimiento móvil — PageSpeed…», `tools/README.md` | pendiente |
| 8 | `web-or-mobile-app` | ¿App web o app móvil? Cómo decidirlo antes de pagar por una | freelance | `content/*/projects/omsta.mdx` (web + app), `components/services-page.tsx` | pendiente |
| 9 | `edmunds-geology` | Edmunds: geología, no textura | webgl (espécimen `edmunds`) | `docs/design/world-visual-language.md` §9 sexies, `docs/design/edmunds-creatividad.md`, registro «Cielo de la cubierta de Edmunds» | pendiente |
| 10 | `site-sound` | El sonido de un sitio: un solo bus de audio, dos grabaciones y quién lo apaga | nextjs | `docs/design/sonido-del-sitio.md`, `lib/audio-bus.ts`, `lib/audio-samples.ts`, `lib/sfx.ts` | pendiente |
| 11 | `wormholes-physics` | Agujeros de gusano: lo que Interstellar inventó y lo que no | space (espécimen `ranger`) | `docs/design/ranger-contacto.md` §«Travesía…»; física general (Einstein-Rosen, Thorne 1988, DNGR 2015), sin cifras inventadas | pendiente |
| 12 | `delicate-case` | Cómo se hizo Delicaté: una tienda con catálogo que la clienta administra | freelance | `content/*/projects/delicate-4-0.mdx`, `docs/design/endurance-proyectos.md` §20 | pendiente |
| 13 | `observatory-instrument` | Diseñar un instrumento, no un visor: el Observatorio en seis pases | webgl | `docs/design/tesseract-experimentos.md` (V1–V6, por sección), `components/observatory-viewer.tsx` (por función) | pendiente |
| 14 | `share-card` | La tarjeta que Discord, LinkedIn y WhatsApp enseñan: Open Graph bien hecho en Next.js | nextjs | registro «Tarjeta para compartir…», `app/[locale]/opengraph-image.tsx`, `lib/site-metadata.ts` | pendiente |
| 15 | `adaptive-resolution` | Resolución adaptable en el teléfono: subir sólo lo que el móvil sostiene | performance | registro «Resolución adaptable…», `lib/resolution-governor.ts` | pendiente |
| 16 | `image-seo` | El retrato que Google indexa: SEO de imágenes en un portafolio | nextjs | registro «SEO — auditoría, especímenes con imagen…», `app/sitemap.ts`, `components/structured-data.tsx` | pendiente |

Temas que **no** van: precios («depende del alcance» es la única respuesta
honesta), clientes que no confirmaron que se les nombre, cifras que no estén
medidas en el registro.

## 6. Qué se mide y cuándo

- **Search Console** (mensual): consultas con impresiones y sin clics (títulos
  a mejorar), páginas indexadas frente a enviadas, enlaces entrantes nuevos.
- **dev.to** (mensual): lecturas por entrada, reacciones, seguidores, comentarios
  sin responder.
- **Contacto** (siempre): de dónde dice la gente que viene. Es la única métrica
  que paga facturas.
