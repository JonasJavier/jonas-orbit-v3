# Estado real de F1A — 2026-08-03

Fuente de verdad arquitectónica: `docs/plans/jonas-orbit-v3-mission-endurance.md`.
Este archivo es una fotografía de ejecución, no reemplaza el plan.

## Dictamen

**F1A está en construcción recruiter-first. WP0-WP4 están cerrados y WP6 tiene
su parte de código cerrada (auditoría del 2026-08-03, más abajo).**
El sitio ya tiene dirección visual, shell profesional, Endurance, las cuatro
rutas de proyecto F1A y Ranger como centro de conversión seguro. OMSTA funciona
como caso completo publicable. La narrativa espacial ya sincroniza scroll, menú,
HUD, anclas e historial sobre un starfield 2D ligero. Delicaté permanece
adelantado como caso completo de F1B.

F1A todavía **no puede cerrarse ni desplegarse**. Los bloqueos restantes pertenecen
a Edmunds, distribución, dominio, secrets y verificación final de release.

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
| Distribución | Parcial | Oferta freelance, correo/WhatsApp y CV cerrados; faltan perfiles alineados y lista de aplicaciones |
| Dirección visual | Cerrado para WP0-WP4 | Contrato en `docs/design/wp0-visual-contract.md`; Ranger usa violeta orbital, WP4 añade telemetría/HUD y coral queda reservado para error |
| Narrativa espacial | Cerrado | Zustand 5.0.14 + Motion 12.42.2; un solo contrato scroll→estado, historial push/replace, starfield diferido y reduced-motion completo |
| Contacto | Cerrado en el repo | Oferta, canales directos, formulario, Turnstile server-side, honeypot, Resend, privacidad y gracias; activar producción requiere secrets |
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
| WP3 · Ranger y conversión | Cerrado | Oferta concreta, email/WhatsApp/LinkedIn/GitHub, CV ES/EN, formulario accesible, Turnstile server-side, honeypot, Resend, rate limit IaC, privacidad y gracias; A12, A13, A21, A25, A26, A31 y A32 verdes |
| WP4 · narrativa y movimiento | Cerrado | Store de progreso, menú/HUD activos, anclas/historial, Motion y starfield 2D diferido; una sola fuente de scroll; A6-A8, A16, A17, A22, A24, A28 y A29 verdes |
| WP5 · Edmunds | **Bloqueado por material** | No existe ninguna foto ni diseño en el repo. Requiere 8-12 fotos + 3-4 diseños con título, alt y orden; luego galería/visor accesible y viaje móvil; A14, A15 y A32 verdes |
| WP6 · release | Código cerrado; decisiones externas abiertas | SEO técnico, sitemap, robots, OG, JSON-LD, `?no3d=1`, Lighthouse/enlaces/deploy en CI y auditoría de bundle hechos. Faltan dominio/301, secrets y la verificación del deploy real |

## Auditoría de WP6 — 2026-08-03

### Lo que se construyó

- **`?no3d=1`** (`lib/effects-mode.ts`): override explícito del perfil ligero,
  acotado al slot de fondo. NO se conflaciona con `prefers-reduced-motion`:
  uno es preferencia de accesibilidad, el otro de capacidad. 3 pruebas e2e,
  incluida una contraprueba de que la URL canónica sí monta el starfield.
- **SEO técnico:** `app/sitemap.ts` (gracias excluida), `app/robots.ts`,
  canonical y `x-default` solo sobre idiomas publicados, OG/Twitter heredados,
  JSON-LD Person+WebSite y una imagen OG generada en build.
- **`lib/site-url.ts`:** origen canónico. Rompe el build si
  `NEXT_PUBLIC_SITE_URL` está definida pero es inválida; cae a localhost solo
  si no está definida.
- **CI:** Lighthouse del perfil ligero por PR, comprobación de enlaces en main
  y deploy a Cloudflare que se omite solo mientras falten los secrets.
- **`content/site.data.ts`** centraliza perfil y canales: el JSON-LD ya no
  puede divergir de los enlaces reales de Ranger.

### Dos defectos encontrados y corregidos

1. **Turnstile se cargaba en todas las visitas al home, incluso en modo test.**
   La guarda era `config?.mode !== "test"`, y con `config` aún `undefined` daba
   `true` en el primer render: el script de un tercer origen acababa en el HTML
   de arranque de una página cuyo formulario vive al final. Corregido a
   `config && config.mode !== "test"` con `lazyOnload`. El home ya no hace
   **ninguna** petición a terceros (verificado con Lighthouse).
2. **La tipografía era exclusivamente de Windows.** Las tres pilas nombraban
   solo fuentes de Microsoft, así que en macOS, iOS y Android el display y el
   texto caían a `sans-serif` genérico y la identidad tipográfica desaparecía.
   Revisado desde Windows 11 el fallo era invisible. Añadidos equivalentes de
   Apple, Android y Linux conservando el orden Windows-first y la decisión de
   "sin transferencia" del contrato visual.

### Medición real (Lighthouse 12, móvil, build de producción)

Perfil ligero y predeterminado dan resultados idénticos, lo que confirma que el
starfield diferido ya no pesa en el arranque:

| Métrica | Valor | Objetivo | |
| --- | --- | --- | --- |
| Performance | 97 | ≥ 90 | ✅ |
| Accessibility | 100 | ≥ 90 | ✅ |
| Best Practices | 100 | ≥ 90 | ✅ |
| SEO | 100 | ≥ 90 | ✅ |
| CLS | 0 | — | ✅ |
| TBT | 10 ms | — | ✅ |
| Peticiones a terceros | 0 | — | ✅ |
| LCP | 2.6 s | < 2.5 s | ❌ |
| JS inicial | 231 KiB gz | < 150 KB gz | ❌ |

### Tensión abierta: el presupuesto de JS es inalcanzable en este stack

Los dos fallos son el mismo problema. El LCP no lo causa la latencia (TTFB 4 ms)
ni el bloqueo de hilo (TBT 10 ms), sino los 231 KiB de JS bajo 4G simulada.

El dato decisivo: **`/es/privacidad`, una página casi sin interactividad, ya
carga 147.7 KiB gz.** Ese es el baseline de Next 16 + React 19 con App Router y
consume el 98 % del presupuesto de 150 KB antes de escribir una línea de
aplicación. Ninguna refactorización del código de Jonás lo mete por debajo.

Opciones, en orden de menor a mayor coste:

1. **Revisar el presupuesto** a una cifra alcanzable (~230 KiB gz) dejando
   constancia de por qué. Lighthouse ya da 97 y las cuatro categorías pasan.
2. **Retirar Motion del home** y dejar la revelación en CSS. El chunk de
   Motion + código de narrativa son ~75 KiB gz. Choca con "Motion es la base
   universal" del plan.
3. **Aceptar el desvío** documentándolo como deuda consciente.

Es una decisión del plan, no de implementación. Mientras tanto, el gate de LCP
en `lighthouserc.json` está en `warn`, no en `error`: dejarlo en rojo bloquearía
main por algo que nadie puede arreglar sin esa decisión.

### Decisiones externas restantes

- **Curaduría Edmunds:** selección final de 8-12 fotos y 3-4 diseños. Puede
  delegarse a Codex, pero Jonás conserva la aprobación editorial.
- **Dominio y URLs v2:** dominio canónico y mapa de redirects 301.
- **Distribución:** lista concreta de puestos/clientes y actualización final de
  LinkedIn/GitHub. No bloquea el desarrollo; sí bloquea considerar F1A “en uso”.

No hace falta esperar esas decisiones para implementar WP0-WP4.

### Checkpoints de entrega

1. **F1A.1 · Preview útil:** WP0-WP3 cerrados en el repo. Hero, CV, OMSTA y
   contacto seguro son evaluables en móvil y teclado; falta publicar una URL de
   preview con los secrets reales para validar entrega externa.
2. **F1A.2 · Experiencia completa:** WP4 cerrado; falta WP5. Los siete mundos,
   movimiento e historial están listos; resta la curaduría y el visor de Edmunds.
3. **F1A.3 · Release:** WP6. Auditorías, distribución, dominio y deploy público.

Los previews sirven para revisión; únicamente F1A.3 satisface el cierre de fase.

## Qué ya prueba la base y qué no

- Ya están probados el modelo `WorldId`, la paridad ES, los gates del contenido,
  el redirect raíz, deep links con `content-visibility`, push/replace y
  Atrás/Adelante, los CTAs, el PDF y el recorrido responsive/reduced-motion.
- Ya existen el shell final de F1A.1, la navegación, el índice Endurance, cuatro
  rutas estáticas de proyecto, el caso OMSTA, su galería editorial, metadata/OG,
  la 404 y Ranger con su flujo completo de contacto y confirmación.
- Ya existen el store de scroll, el HUD, el menú activo, las entradas Motion y el
  starfield 2D diferido. Todavía no existen el visor modal de Edmunds ni la capa
  completa de SEO/release; sus pruebas siguen abiertas.

## Estado de producción de proyectos

- **OMSTA:** en producción.
- **Delicaté, Izak's Photos, Wiki Universe y Network 3.0:** listos para producción;
  se cambiarán a “en producción” después de verificar sus URLs públicas.

La intención de desplegar todos los proyectos queda registrada, pero no se usa como
hecho consumado en el contenido público.

## Verificación de esta entrega

- `npm run check`: correcto — lint, TypeScript, Knip, 56 pruebas y build SSG.
- `npm run test:e2e`: correcto — 34 pruebas en Chromium desktop y móvil; A24
  también se repitió 5 veces por viewport para descartar carreras de historial.
- Revisión de bundle WP4: el HUD usa CSS + store y Motion queda en su runtime
  `mini`; el chunk cliente mayor bajó de 429.3 KiB a 310.2 KiB sin comprimir.
- Gate específico de proyectos: 7 pruebas para paridad F1A, duplicados, orden,
  textos alternativos y existencia de assets.
- Flujo Ranger: validación, honeypot, Siteverify, escape de entrega, doble-submit,
  aborto al navegar, error/reintento, gracias `noindex`, CV y 375 px cubiertos.

Velite mantiene avisos informativos por el cuerpo MDX vacío de seis mundos; su
prosa estructurada ya existe en frontmatter y esos avisos no bloquean el build.
