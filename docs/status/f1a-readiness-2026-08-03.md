# Estado real de F1A — 2026-08-03

Fuente de verdad arquitectónica: `docs/plans/jonas-orbit-v3-mission-endurance.md`.
Este archivo es una fotografía de ejecución, no reemplaza el plan.

## Dictamen

**F1A está en construcción recruiter-first. WP0, WP1 y WP2 están cerrados.** El
sitio ya tiene dirección visual, shell profesional, Endurance y las cuatro rutas
de proyecto F1A; OMSTA funciona como caso completo publicable. Delicaté permanece
adelantado como caso completo de F1B.

F1A todavía **no puede cerrarse ni desplegarse**. Los bloqueos restantes pertenecen
a implementación, dirección visual, Edmunds, distribución, contacto y dominio.

## Gates y evidencia

| Área | Estado | Evidencia / siguiente condición |
| --- | --- | --- |
| Setup técnico | Cerrado | Next 16, OpenNext, Velite, Tailwind, CI y tests presentes |
| Siete mundos ES | Cerrado | `content/es/worlds/` completo |
| Endurance · contenido | Cerrado | 1 caso OMSTA + 3 fichas F1A; gate automático en Velite |
| Delicaté · F1B | Material listo | Caso de 17 secciones y 6 capturas; despliegue comercial pendiente |
| CV ES descargable | Asset cerrado | `public/cv/jonas-javier-cv-es.pdf`, revisado visualmente y enlazado desde el hero |
| CV EN de distribución | Asset cerrado | `public/cv/jonas-javier-cv-en-ats.pdf`, B2 sin calificador y sin cabeceras del navegador |
| Edmunds | Abierto | Seleccionar 8-12 fotos y 3-4 diseños con título, alt y orden |
| Distribución | Abierto | Oferta freelance, canal directo, perfiles alineados y lista de aplicaciones |
| Dirección visual | Cerrado para WP0-WP2 | Contrato en `docs/design/wp0-visual-contract.md`; estados del formulario se materializan en WP3 |
| Contacto | Implementación abierta | T5 y T7 cerrados; ya puede construirse el formulario y handler |
| Dominio y redirects | Abierto | Elegir dominio y estrategia 301 para URLs públicas de v2 |
| Deploy F1A | Abierto | Requiere todos los anteriores y la matriz de tests aplicable estable |

## Orden de construcción recomendado

1. Hero con prueba inmediata y acceso al CV.
2. Endurance: tarjetas reales y ruta completa de OMSTA.
3. Ranger: canal directo, oferta freelance, página de gracias y formulario seguro.
4. Completar Edmunds y el resto de la narrativa sin romper los gates anteriores.

Este orden conserva la decisión del plan: primero lo que un reclutador o cliente
necesita comprobar, no el orden narrativo de los siete mundos.

## Tablero de implementación F1A

Tener el contenido listo no equivale a tener F1A construida. El shell actual
demuestra el pipeline y los anclajes, pero todavía faltan estas piezas de producto:

| Paquete | Estado real | Criterio de cierre |
| --- | --- | --- |
| WP0 · contrato visual / T4 | Cerrado | Dirección “instrumentación orbital editorial” documentada; tokens, arquetipos, responsive, accesibilidad, 404 y reglas de movimiento fijados |
| WP1 · shell recruiter-first | Cerrado | Hero, navegación de siete mundos, prueba visible, CTAs y CV; escritorio, 375 px, teclado y reduced-motion verificados |
| WP2 · Endurance | Cerrado | Índice y cuatro rutas `/es/proyectos/[slug]`; OMSTA completo, galería, metadata/OG, estados opcionales y 404; A17, A18, A20 y A30 verdes |
| WP3 · Ranger y conversión | Decisiones cerradas, código pendiente | Oferta freelance, email/WhatsApp, formulario, Turnstile, Worker, privacidad y gracias; A12, A13, A21, A25, A26 y A31 verdes |
| WP4 · narrativa y movimiento | Pendiente | Store de progreso, anclas/historial, Motion y starfield 2D diferido; una sola fuente de scroll; A6-A8, A16, A17, A22, A24, A28 y A29 verdes |
| WP5 · Edmunds | Curaduría y UI pendientes | 8-12 fotos + 3-4 diseños con metadata; galería/visor accesible y viaje móvil; A14, A15 y A32 verdes |
| WP6 · release | Parcial | SEO, sitemap, robots, OG, links, Lighthouse/bundle, perfiles y lista de aplicaciones; dominio/301, secrets, CI/CD y deploy verificados |

### Decisiones externas restantes

- **Curaduría Edmunds:** selección final de 8-12 fotos y 3-4 diseños. Puede
  delegarse a Codex, pero Jonás conserva la aprobación editorial.
- **Dominio y URLs v2:** dominio canónico y mapa de redirects 301.
- **Distribución:** lista concreta de puestos/clientes y actualización final de
  LinkedIn/GitHub. No bloquea el desarrollo; sí bloquea considerar F1A “en uso”.

No hace falta esperar esas decisiones para implementar WP0-WP4.

### Checkpoints de entrega

1. **F1A.1 · Preview útil:** WP0-WP2 cerrados; falta WP3. Hero, CV y OMSTA ya son
   evaluables en móvil y teclado; contacto seguro completa este checkpoint.
2. **F1A.2 · Experiencia completa:** WP4-WP5. Siete mundos, movimiento y Edmunds.
3. **F1A.3 · Release:** WP6. Auditorías, distribución, dominio y deploy público.

Los previews sirven para revisión; únicamente F1A.3 satisface el cierre de fase.

## Qué ya prueba la base y qué no

- Ya están probados el modelo `WorldId`, la paridad ES, los gates del contenido,
  el redirect raíz, los deep links base, los CTAs base, el PDF desde el hero y el
  recorrido mínimo responsive/reduced-motion.
- Ya existen el shell final de F1A.1, la navegación, el índice Endurance, cuatro
  rutas estáticas de proyecto, el caso OMSTA, su galería editorial, metadata/OG y
  la 404.
- Todavía no existen el formulario/Worker, el store de scroll, el visor modal de
  Edmunds ni la capa completa de SEO/release. Sus pruebas siguen abiertas.

## Estado de producción de proyectos

- **OMSTA:** en producción.
- **Delicaté, Izak's Photos, Wiki Universe y Network 3.0:** listos para producción;
  se cambiarán a “en producción” después de verificar sus URLs públicas.

La intención de desplegar todos los proyectos queda registrada, pero no se usa como
hecho consumado en el contenido público.

## Verificación de esta entrega

- `npm run check`: correcto — lint, TypeScript, Knip, 34 pruebas y build SSG.
- `npm run test:e2e`: correcto — 22 pruebas en Chromium desktop y móvil.
- Gate específico de proyectos: 7 pruebas para paridad F1A, duplicados, orden,
  textos alternativos y existencia de assets.

Velite mantiene avisos informativos por el cuerpo MDX vacío de seis mundos; su
prosa estructurada ya existe en frontmatter y esos avisos no bloquean el build.
