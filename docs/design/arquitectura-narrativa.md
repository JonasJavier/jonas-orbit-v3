# Arquitectura narrativa — decisión del dueño, 2026-09-06

Esta es la **fuente de verdad del significado de cada destino**. Sustituye
cualquier asociación anterior entre cuerpo y sección, en todos los documentos y
en todo el código.

No cambia la escena. Ni un cuerpo, ni una posición, ni una escala, ni la cámara,
ni un material, ni el campo estelar. Es una decisión de arquitectura narrativa,
contenido y navegación.

## Mapping canónico

| Orden | WorldId | Cuerpo | Significado | Ruta ES |
|---|---|---|---|---|
| 1 | `gargantua` | Gargantúa | **Sobre mí** | `/es/sobre-mi` |
| 2 | `miller` | Miller | **Formación** | `/es/formacion` |
| 3 | `endurance` | Endurance | **Proyectos** | `/es/proyectos` |
| 4 | `edmunds` | Edmunds | **Creatividad** | `/es/creatividad` |
| 5 | `tesseract` | Tesseracto | **Experimentos** | `/es/experimentos` |
| 6 | `ranger` | Ranger | **Contacto** | `/es/contacto` |

Queda inequívocamente establecido que **ya no es cierto** ninguno de estos:

- ~~Tesseracto = Sobre mí / Historia~~
- ~~Miller = Desarrollo~~
- ~~Gargantúa = Laboratorio~~

## Por qué cada uno

**Gargantúa — Sobre mí.** Es el centro visual del sistema, así que es también
el centro de identidad del portafolio: quién soy, cómo pienso, mi enfoque, qué
me interesa construir y hacia dónde quiero crecer. Que la jerarquía visual y la
jerarquía narrativa coincidan es la razón de ser de todo el pase. En el Hero no
lleva rótulo permanente y sigue dominando por sí sola; su identidad se anuncia
al adquirirla, en el HUD, como cualquier otro destino.

**Miller — Formación.** Aprendizaje y evolución: educación, cursos,
certificaciones, formación técnica y complementaria.

El diseño de su página y el catálogo contrastado de estudios se concretan en
[Miller — formación sin punto final](miller-formacion.md) (2026-09-09).

**Endurance — Proyectos.** El trabajo de desarrollo: software, web, sistemas,
casos de estudio, producto digital, trabajo técnico entregado. Ingeniería,
ejecución y sistemas construidos para cumplir una misión. La etiqueta visible es
`Proyectos`, a secas, porque en la UI es más limpia.

**Edmunds — Creatividad.** Diseño, UI/UX, fotografía, comunicación y dirección
visual. **Los experimentos técnicos no van aquí.**

La página y su selección de fotografías y diseños se concretan en
[Edmunds — otra forma de mirar](edmunds-creatividad.md) (2026-09-11): práctica
creativa personal, galería 3D de perspectiva fija y mosaico accesible.

**Tesseracto — Experimentos.** Cosas construidas para explorar, aprender o
probar una idea: Three.js, R3F, WebGL, shaders, motion, prototipos, conceptos de
interacción, herramientas pequeñas. **No es un cajón de sobras**: representa
curiosidad técnica deliberada. El nombre visible es `Experimentos`, nunca
`Laboratorio`.

**Ranger — Contacto.** Acción y transición: el paso de explorar el portafolio a
iniciar una conversación. No cambia de propósito.

Su página se concreta en [Ranger — cabina de comunicaciones](ranger-contacto.md)
(2026-09-12): ventanal espacial, baliza interactiva, tres canales directos y
formulario, con el teléfono y el correo confirmados por el dueño.

## Orden narrativo ≠ posición visual

El orden canónico es Sobre mí → Formación → Proyectos → Creatividad →
Experimentos → Contacto, y vive en el campo `order` de
`content/worlds.data.ts`. Gobierna el raíl, el DOM, el tabulador, los destinos
contiguos y el sitemap.

**No gobierna nada de la escena.** La posición de cada cuerpo vive en
`placement` y en `lib/scene-depth.ts`, y ambos se indexan por `WorldId`. Se
comprobó al aplicar este pase: reordenar la narrativa no movió un píxel de la
composición. El único efecto de `order` fuera de la navegación es el retardo
escalonado de entrada de las etiquetas, que por definición sigue al orden de
lectura.

## Identidad y rutas

`WorldId` sigue siendo la identidad estructural canónica; el slug nunca se usa
como identidad interna. `content/worlds.data.ts` sigue sin contener una sola
palabra visible al usuario: significado, etiqueta y slug viven en el frontmatter
de `content/{locale}/worlds/*.mdx`, y por eso este pase no toca ni una línea de
routing.

`proyectos` y `contacto` son carpetas estáticas (`BESPOKE_WORLD_IDS`) porque
montan el índice de proyectos y el formulario; el mapping nuevo conserva esos
dos slugs, así que no hubo colisión. Los otros cuatro los sirve el segmento
dinámico `[mundo]`.

`/es/desarrollo` y `/es/laboratorio` quedan retirados y responden 404. **No se
crean redirecciones ni alias**: no hay tráfico histórico que preservar, y una
redirección hacia contenido distinto del que había sería mentir sobre el
destino. `e2e/smoke.spec.ts` lo comprueba.

## `/es/formacion` deja de estar vetada

El 2026-09-04, al retirar Cooper Station, se estableció que `/es/formacion`
debía responder 404 «sin sustituto ni reasignación editorial», y ese veto se
replicó como banner de autoridad en siete documentos. **Este documento lo
revoca en ese único punto.**

La distinción importa y conviene dejarla escrita: lo que se retiró entonces fue
un **cuerpo** —Cooper Station— y el sistema sigue teniendo exactamente seis. Lo
que vuelve ahora es un **significado**, asignado a un cuerpo que ya existía. No
se reintroduce ningún objeto, ni se reserva espacio en ningún array, ni se
recupera la prosa de Cooper Station.

## Contenido

| Destino | De dónde sale su prosa |
|---|---|
| Sobre mí (Gargantúa) | La prosa de identidad que estaba en `tesseract.mdx` |
| Experimentos (Tesseracto) | La prosa de laboratorio que estaba en `gargantua.mdx` |
| Formación (Miller) | **Nueva**, redactada desde `portfolio-content/cv/cv-es.md` |
| Proyectos, Creatividad, Contacto | Sin tocar |

Formación no inventa nada: CS50x (2023) y CS50W (2024) de Harvard, la carrera
de Marketing Digital completada en EducaciónIT y Manhattan University (207 h,
2024), la formación en diseño multimedia (~1 año), las cinco certificaciones de
rol de EducaciónIT respaldadas por dieciséis cursos, y el Bachiller en
Humanidades y Lenguas Modernas del MINERD (2024). Todo sale del CV del
repositorio.

Experimentos hereda un solo panel y es lo honesto: hoy el único experimento
documentado es el propio Jonás Orbit. Se prefiere una sección breve y verdadera
a rellenarla con experimentos inventados; los prototipos reales del build se
documentan en F1B.

La prosa de desarrollo que tenía Miller se retira. Su sustancia ya vive en
Endurance —los cinco proyectos con su stack— y en Sobre mí, y mantenerla habría
creado dos páginas contando lo mismo.
