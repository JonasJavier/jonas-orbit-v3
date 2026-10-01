# Kit de difusión — enlaces entrantes y clientes

Todo lo que hay que publicar FUERA del sitio para que Google lo tome en serio,
con los textos listos para pegar. Lo que está dentro del sitio ya está hecho:

- Servicios: `/es/contacto/servicios` · `/en/contact/services`
- Artículo: `/es/experimentos/como-hice-un-agujero-negro-en-webgl` ·
  `/en/experiments/how-i-built-a-black-hole-in-webgl`
- Simulador: `/en/experiments/observatory/gargantua`

**Regla de oro:** un sitio por día, no todos de golpe. Las comunidades huelen
la publicidad en masa; una publicación cuidada en cada sitio vale más que diez
copiadas.

## Antes de publicar nada (tú)

1. Lee el artículo en los dos idiomas y cambia lo que no suene a ti. Los datos
   técnicos salen del código; la voz es tuya.
2. Revisa «Cómo trabajo» en Servicios (conversación → propuesta → construcción
   → lanzamiento). Si alguna promesa no es como trabajas, se cambia.

## Orden recomendado

| Día | Dónde | Por qué primero |
| --- | --- | --- |
| 1 | Google Business Profile | Lo que más pesa en búsquedas locales; la verificación tarda días |
| 2 | dev.to | Enlace estable con canonical al artículo |
| 3 | Foro de Three.js (Showcase) | El público exacto del nicho 3D |
| 4 | r/threejs | Mismo público, más volumen |
| 5–6 | Show HN (martes a jueves, 8–10 a. m. hora de Nueva York) | Mucho tráfico si sube; se intenta una vez |
| 7+ | Awwwards, CSS Design Awards, The FWA | Enlaces de autoridad; tardan semanas en votarse |
| Sábado | r/webdev («Showoff Saturday») | Sólo se permite autopromoción los sábados |

---

## 1. Google Business Profile (perfil de empresa)

Entra en <https://business.google.com> con tu cuenta y pulsa **Añadir
empresa**.

- **Nombre:** `Jonás Javier Encarnación`. Sólo tu nombre o una marca real.
  Google prohíbe meter palabras clave en el nombre («Jonás · Desarrollador web
  Santo Domingo»); hacerlo puede suspender el perfil.
- **Categoría principal:** `Diseñador de sitios web`. Añade como secundarias
  las que el buscador te ofrezca y describan lo que haces (por ejemplo
  `Empresa de software` o `Servicio de desarrollo de aplicaciones`).
- **¿Tienes un local que los clientes visitan?** → **No**. Eres un negocio de
  servicios a domicilio/remoto: tu dirección queda oculta.
- **Zona de servicio:** Santo Domingo, Distrito Nacional, Santo Domingo Este,
  Santo Domingo Norte, Santo Domingo Oeste (añade Bonao si también atiendes
  allí).
- **Teléfono:** el de WhatsApp del sitio. **Sitio web:**
  `https://jonasjavier.dev/es/contacto/servicios`.
- **Servicios** (uno por línea, como en la web): Aplicaciones web a medida ·
  Tiendas y webs de negocio · Apps móviles · Diseño UX/UI y webs 3D.
- **Descripción** (máx. 750 caracteres):

  > Desarrollador full-stack freelance en Santo Domingo. Diseño y construyo
  > aplicaciones web a medida con Django y React, tiendas en línea con catálogo
  > administrable, apps móviles con React Native y experiencias 3D interactivas
  > con Three.js. Trabajo en remoto con clientes de cualquier país y en persona
  > en Santo Domingo, en español e inglés. Proyectos publicados: un ERP con app
  > móvil para una agencia de viajes, una tienda de jabones artesanales, una
  > red social y una enciclopedia. Cada proyecto empieza con una conversación
  > y una propuesta por escrito, y termina con la publicación y acompañamiento.

- **Fotos:** tu retrato de «Sobre mí» como foto de perfil; de portada, una
  captura de la home; y capturas de los casos (están en Proyectos).
- **Verificación:** Google suele pedir un vídeo corto mostrando tu espacio de
  trabajo y algo que pruebe el negocio. Sigue sus pasos; puede tardar varios
  días.
- **Reseñas:** pídeselas a clientes REALES (la clienta de Delicaté, la agencia
  de OMSTA) con el enlace de reseñas que te da el perfil. Nunca reseñas de
  amigos que no fueron clientes: Google las borra y penaliza.

## 2. dev.to (copia del artículo con canonical)

El texto está listo en [`devto-black-hole-webgl.md`](devto-black-hole-webgl.md).
La línea `canonical_url` le dice a Google que el original es tu sitio: dev.to
te da el enlace y el tráfico, y el posicionamiento se queda en tu dominio.

1. Crea la cuenta en <https://dev.to> (con GitHub es un clic) y en el perfil
   pon `https://jonasjavier.dev` como sitio web.
2. **Create Post** → cambia el editor a Markdown si te lo pregunta → pega el
   archivo ENTERO, incluido el bloque `---` de arriba.
3. Previsualiza (imágenes y enlaces), cambia `published: false` a `true` y
   publica.

## 3. Foro de Three.js — Showcase

<https://discourse.threejs.org> → categoría **Showcase** → nuevo tema.

**Título:** `Gargantua — a ray-traced black hole in a portfolio (WebGL, one draw call)`

**Texto:**

> Hi everyone! I built my portfolio around a black hole inspired by
> Interstellar's Gargantua, and I wanted to share it here.
>
> It isn't a model or a texture: a fragment shader traces the light around a
> Schwarzschild black hole for every pixel (velocity-Verlet on the photon orbit
> equation, 190 steps per pixel, 340 on the high tier). The photon ring, the
> secondary image and the lensed starfield come out of the physics. The disk is
> Keplerian fbm noise with two cross-faded epochs so the shear never winds it
> into sub-pixel rings, plus relativistic Doppler beaming.
>
> Live: https://jonasjavier.dev/en/experiments/observatory/gargantua
> (switch to **Study** to change views and toggle Doppler / Secondary images /
> Lens one by one)
>
> Write-up with the shader code: https://jonasjavier.dev/en/experiments/how-i-built-a-black-hole-in-webgl
>
> Feedback very welcome, especially on performance on phones.

Adjunta `gargantua-cinematografica-1600.webp` y `gargantua-lente-1600.webp`
(en `public/images/articulos/agujero-negro/`).

## 4. Reddit

**r/threejs** — publicación con imagen (`gargantua-cinematografica-1600.webp`):

- **Título:** `I ray-trace a black hole per pixel in my portfolio — Doppler beaming, photon ring and lensing, all in one shader`
- **Primer comentario (tuyo, nada más publicar):**

  > Live demo: https://jonasjavier.dev/en/experiments/observatory/gargantua —
  > write-up with the GLSL: https://jonasjavier.dev/en/experiments/how-i-built-a-black-hole-in-webgl.
  > Happy to answer questions about the integrator or the bloom/shadow fix.

**r/webdev** — SÓLO un sábado, con el título empezando por `[Showoff Saturday]`:

- **Título:** `[Showoff Saturday] My portfolio is a solar system around a ray-traced black hole`
- **Texto:** dos líneas sobre qué es, el enlace a `https://jonasjavier.dev` y
  la nota de que funciona sin WebGL (versión plana con el mismo contenido).

Responde a los comentarios el mismo día: es lo que hace que una publicación
siga subiendo.

## 5. Show HN (Hacker News)

<https://news.ycombinator.com/submit>. Show HN es para cosas que la gente puede
probar: enlaza el SIMULADOR, no el artículo (los artículos no son Show HN).

- **Título:** `Show HN: A ray-traced black hole you can toggle the physics of (WebGL)`
- **URL:** `https://jonasjavier.dev/en/experiments/observatory/gargantua`
- **Primer comentario (justo después de enviarlo):**

  > I'm Jonás, a full-stack developer from the Dominican Republic. This is the
  > centrepiece of my portfolio: Gargantua from Interstellar, traced per pixel
  > in a fragment shader around a Schwarzschild metric (Kerr was too expensive
  > for real time in a browser). Switch to "Study" and turn off Doppler,
  > secondary images and lensing to see what each one contributes.
  >
  > How it's built, with the shader code:
  > https://jonasjavier.dev/en/experiments/how-i-built-a-black-hole-in-webgl
  >
  > Without WebGL2 or on a software GPU it falls back to a flat 2D version.

Si no sube en la primera hora, no lo reenvíes en días: HN lo considera spam.

## 6. Premios: Awwwards, CSS Design Awards, The FWA

- Awwwards: <https://www.awwwards.com/submit/>
- CSS Design Awards: <https://www.cssdesignawards.com/submit>
- The FWA: <https://thefwa.com/submit>

Awwwards y CSS Design Awards cobran por envío: comprueba la tarifa vigente en
su formulario antes de pagar. Aunque no ganes, la ficha publicada es un enlace
permanente a tu dominio.

Datos comunes para los formularios:

- **Nombre del sitio:** Jonás Orbit
- **URL:** `https://jonasjavier.dev`
- **Autor / estudio:** Jonás Javier Encarnación — Santo Domingo, República
  Dominicana
- **Tecnologías:** Next.js, React, TypeScript, Three.js, WebGL2, GLSL, Web
  Audio API, Velite (MDX), Railway
- **Categorías:** Portfolio, 3D, Interactive, Space
- **Descripción corta (EN):** `A developer portfolio built as a solar system around a ray-traced black hole.`
- **Descripción larga (EN):**

  > Jonás Orbit is the portfolio of Jonás Javier Encarnación, a full-stack
  > developer and designer from the Dominican Republic. The site is a still
  > solar system inspired by Interstellar: six bodies around Gargantua, each one
  > a section — About, Education, Projects, Creativity, Experiments and Contact.
  > Gargantua is ray-traced per pixel in a fragment shader (Schwarzschild light
  > paths, Doppler beaming, photon ring); travel between sections is a scripted
  > spacetime transition with synthesized sound. Every page is real HTML first:
  > without WebGL the same content and routes render as a flat 2D atlas, and the
  > site is fully bilingual (English/Spanish).

- **Capturas:** haz capturas de escritorio de la home, Proyectos, el
  Observatorio de Gargantúa y Contacto al tamaño que pida cada formulario.

## 7. Seguimiento (en 3–4 semanas)

- **Search Console → Enlaces → Sitios externos principales:** deberías ver
  dev.to, discourse.threejs.org y los premios a medida que los indexa.
- **Search Console → Rendimiento → Consultas:** qué búsquedas te traen. Con
  esas palabras se ajustan los títulos y, si hace falta, se escribe la
  siguiente nota de taller.
