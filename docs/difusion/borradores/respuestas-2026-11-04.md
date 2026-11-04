# Respuestas propuestas — 2026-11-04 (tarea del lunes, corrida el miércoles)

Nada publicado. Cada respuesta sale sólo tras el «sí» de Jonás, una a una.

## dev.to

### 1. Kunj Hirapara — «Next.js 16, one year on…» (2026-11-02)

Contesta a la pregunta de Jonás (smoke test propio o acción de CI): es un
script de Bash propio, y recomienda comprobar texto en la página y no sólo un
200. Responder en <https://dev.to/kunjhirapara/comment/3jmcg>.
Comprobado en el repo: el healthcheck de Railway es `/api/health`
(`docs/production-readiness.md`) y las pruebas sin JavaScript están en
`e2e/*.spec.ts` (`javaScriptEnabled: false`).

> No worries, and thanks for the detail. The empty-shell 200 is a good catch: my host's healthcheck only hits /api/health, so it would happily pass a page that broke during rendering. What covers that for me is Playwright with JavaScript disabled, checking that each section's served HTML has its real text. It runs in CI before deploy, though, not against the live site, so your curl step is the part I'm missing.

### 2. Hasan Alp Güngör — «How I turned my logo into 3D glass…» (2026-11-02)

Contesta: sólo baja de nivel, nunca vuelve a subir en la visita; el nivel
inicial sale de pistas del dispositivo. Responder en
<https://dev.to/hasanalpgungor/comment/3jnin>.

> Starting from device hints and only ever stepping down is a clean way to avoid flip-flopping, and skipping refraction entirely on lite is a lever people can actually see. Mine runs the other way: it starts low, only steps up, and a step that fails closes that ceiling for the visit, for the same reason as yours. Does PerformanceMonitor ignore frames while the tab is hidden, or do you guard that yourself?

## LinkedIn — post #0 (presentación, 2 oct), tres comentarios sin respuesta

<https://www.linkedin.com/feed/update/urn:li:ugcPost:7511821645578366976/>

### 3. A Eduardo Antonio Vicente Herrera (y Mario Luciano, que contestó en su hilo)

> ¡Gracias, Eduardo! Y gracias, Mario. La apuesta era que fuera inmersivo sin tapar lo importante, que son los proyectos. Si lo abren en el móvil y algo se siente raro, me lo cuentan.

### 4. A Anderson Tejeda Duarte

> ¡Gracias, Anderson! Dale, compártelo por aquí cuando esté. Si te sirve, en el blog cuento cómo hice varias partes: https://jonasjavier.dev/es/blog

## Sin respuesta (cierran el hilo)

- Foro t/95358/5 (gamaccho, 11-03): agradece y se queda con su equilibrio actual.
- Foro t/96083/3 (metaltab, 10-30): agradece.
- Foro t/95930/9 (scenariofour, 10-30): confirma el arreglo; en su traza las lecturas de estado no le afectan.
- Foro t/95932: NINE contestó el 11-02 con cifras del iPhone; la respuesta de Jonás (#5) ya salió hoy.
- Foro t/96183 (teseracto, 10-31): sin respuestas.
- Hacker News: la cuenta `JonasJavier` no tiene envíos ni hilos.
