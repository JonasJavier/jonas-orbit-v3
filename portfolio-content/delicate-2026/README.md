# Delicaté 4.0 — material de portafolio (2026)

| Dato | Valor |
| --- | --- |
| Fecha de la investigación | 25 de septiembre de 2026, 22:30 (UTC−4) |
| Commit HEAD analizado | `9f134109a31d5bb30ca071af649b6467779c8685` (rama `main`, árbol limpio) |
| Repositorio | `JonasJavier/Delicate-4.0`, **privado** (comprobado con `gh repo view`) |
| Producción | <https://delicate.jonasjavier.dev> — responde 200 hoy (ver [overview.md](overview.md)) |
| Entorno de captura | Windows 11 · Python 3.14.5 (venv del repo) · Node 24.16.0 · Playwright 1.61.1 (Chromium) |
| Servidores de captura | Django `runserver` en `127.0.0.1:8000` (DEBUG) + build de producción de React con `vite preview` en `127.0.0.1:4173` |
| Datos | Base SQLite **local y desechable** en `%TEMP%/delicate-portfolio-demo`, sembrada con [scripts/seed_demo.py](scripts/seed_demo.py) |

Nada de este trabajo cambió código ni hizo commits en `Delicate-4.0` ni en `jonas-orbit-v3` (`git status` limpio en Delicate-4.0 al terminar).

## Actualización posterior (25-09-2026, noche)

Después de esta investigación el repositorio se hizo **público** con un historial limpio. Cambia lo siguiente:

- **Cliente real:** Jonás confirmó que Delicaté es el negocio de una clienta (responde a la Pregunta 1). El README público dice «Diseño y desarrollo: Jonas Javier Encarnacion, para Delicaté».
- **Repo público:** <https://github.com/JonasJavier/Delicate-4.0> (CI en verde). El historial original, que contenía credenciales y datos personales de 2024, quedó en el repo privado `Delicate-4.0-private-archive`. El nuevo se reescribió sin esos archivos: 25 commits de la historia original + 3 nuevos, código idéntico al commit `9f134109`.
- **Emoji de WhatsApp corregido:** el saludo es ahora «¡Hola, Delicaté!» sin emoji (commit `1c17018`). La página de WhatsApp lo muestra bien. Deja de ser un motivo de exclusión para un paso a WhatsApp nuevo, pero las capturas `raw/19` y `raw/48` siguen mostrando el defecto anterior.
- **Railway** despliega ahora desde el repo nuevo (commit `0d31ad0`, 200 en producción).

Los hashes citados en esta carpeta son del historial original. Equivalencias en el repo público:

| Original (privado) | Público | Commit |
| --- | --- | --- |
| `9f134109` | `20b9246` | docs: dominio propio |
| `6425386d` | `ca28efb` | fotos en el volumen de Railway |
| `71c62255` | `987c07f` | tipo MIME del manifest |
| `25b8b833` | `688c156` | despliegue Docker/Railway |
| `1cbc0c3d` | `78a25b9` | carrito sincronizado y mejoras móviles |
| `0139dba7` | `6c86b5b` | Django listo para producción |
| `9585f7ab` | — (eliminado: sólo borraba archivos que ya no existen) | dejar de versionar `.env` |
| `41d3654b` | `8f7fccc` | licencia propietaria |
| `65a15e7b` | `bdff36a` | catálogo de 10 productos |
| `226fe32e` | `6a2f40b` | validación y UI |
| `fbf22e62` | `92bdfcf` | reconstrucción 2026 |
| `44f824fb` | `eda7589` | última versión 2024 |
| — | `1c17018`, `1a84abf`, `0d31ad0` | emoji, CI, README público |

## Estado del material

| Entregable | Estado |
| --- | --- |
| Capturas en `screenshots/raw/` | 56 (escritorio 1440×900 y móvil 390×844, `deviceScaleFactor` 2) |
| Capturas publicables en `screenshots/principales/` | 42, en orden narrativo |
| Capturas excluidas | 14, con motivo en [excluded.md](excluded.md) |
| Funciones documentadas | 44 en [features.md](features.md) (28 con captura publicable) |
| Pruebas del repo | 18/18 en verde (`manage.py test`, 25-09-2026) |
| Scripts reproducibles | [scripts/](scripts/) (sembrado, servidores y captura) |

## Índice

- [overview.md](overview.md) — qué es, para quién, estado real.
- [case-notes.md](case-notes.md) — notas factuales para el caso.
- [features.md](features.md) — todas las funciones y pantallas.
- [stack.md](stack.md) — tecnologías con versión y evidencia.
- [design-decisions.md](design-decisions.md) — 6 pares problema → decisión.
- [metrics.md](metrics.md) — sólo cifras comprobables.
- [cv-notes.md](cv-notes.md) — viñetas para el CV (ES/EN).
- [excluded.md](excluded.md) — lo que quedó fuera y por qué.
- [architecture/](architecture/) — `system-overview.md`, `data-flow.md`, `nodes.yaml`, `diagrams/`.
- [screenshots/manifest.md](screenshots/manifest.md) — ficha de cada captura.
- [screenshots/capture-report.json](screenshots/capture-report.json) — errores de consola, peticiones fallidas, imágenes rotas y desborde por captura.

## Lo publicado que estaba mal o viejo

Fuente: `content/es/projects/delicate.mdx` y `public/media/projects/delicate/` en jonas-orbit-v3.

| # | Afirmación publicada | Realidad hoy | Evidencia | Etiqueta |
| --- | --- | --- | --- | --- |
| 1 | `statusLabel`: «Listo para producción; salida comercial pendiente» y §16 «no se etiqueta aún como en producción» | Desplegado en Railway desde el 25-09-2026 y en línea en `delicate.jonasjavier.dev` | `curl` 200 a `/`, `/api/health/` y `/api/products/`; `docs/DEPLOY_RAILWAY.md` | comprobado |
| 2 | §17 «la URL pública se añadirá después del despliegue» | Ya existe URL pública | ídem | comprobado |
| 3 | «12 pruebas de API en verde» (highlights, `scope`, §14) | Hay **18** pruebas y no todas son de API (2 del gestor de usuarios, 5 de salud/media/cabeceras) | `manage.py test` → `Ran 18 tests … OK` | comprobado |
| 4 | §9 «frontend y backend corren como dos servicios independientes» | Sólo en desarrollo. En producción es **un** contenedor Docker: Django sirve el build de React con WhiteNoise | `Dockerfile`, `backend/backend/settings.py` (`WHITENOISE_ROOT`) | comprobado |
| 5 | §10 «un producto de unas 2.200 líneas» | ~2.600 líneas de código fuente hoy (backend Python sin migraciones 1.230 · `frontend/src` 1.365) | `wc -l` sobre `git ls-files` | comprobado |
| 6 | §6 «no se guardan datos de compradores» | La tienda no los pide, pero existen endpoints públicos `POST /api/contact/` y `/api/newsletter/` que guardan nombre, correo y teléfono si alguien los llama | `backend/contact/models.py`, `backend/contact/urls.py` | comprobado |
| 7 | §8 muestra el mensaje con «Hola Delicaté 👋» | El sitio lo codifica bien, pero al abrir `wa.me` WhatsApp lo redirige y el emoji llega como «�» | `capture-report.json` → `emojiReplaced: true`; captura `raw/19-whatsapp-handoff-desktop.png` | comprobado |
| 8 | Portada destacada `01-home-desktop.png` | A 1440 px, con la cabecera transparente, una hoja de la foto tapa «Hablemos» | `raw/01-home-desktop.png` (recorte en excluded.md) | comprobado |
| 9 | `technologies`: «WhatsApp» | Es un enlace `wa.me` con texto prearmado, no una integración con la API de WhatsApp | `frontend/src/config.js` (`whatsappUrl`) | comprobado |
| 10 | «4.ª versión» / «Esta es la cuarta versión» | Git sólo muestra dos generaciones (2024 y 2026); no hay evidencia de las versiones 2 y 3 | `git log` | pendiente |
| 11 | Faltan en lo publicado | Despliegue Docker/Railway, dominio propio, carrito que se sincroniza con precios y existencias, lectura de todas las páginas del catálogo, CSP y demás cabeceras, healthcheck con base de datos, vista previa para WhatsApp | commits `0139dba7`, `1cbc0c3d`, `25b8b833`, `6425386d`, `9f134109` | comprobado |
| 12 | §13 capturas del 23-09-2026 | El set se rehízo entero hoy; las 8 imágenes publicadas quedan obsoletas | `screenshots/principales/` | comprobado |

Afirmaciones publicadas que **sí** se verificaron: versión 2024 con login de Google, blog, historial de pedidos y carrito en servidor (árbol del commit `44f824fb`); eliminación de `Cart`, `CartItem`, `Review` y `UserProfile` por migraciones (`shop/0006`, `accounts/0005`); seis categorías; `<dialog>` nativo, foco atrapado en el carrito, Escape en el menú, enlace para saltar al contenido, `aria-pressed` y `prefers-reduced-motion`; validación de imágenes (JPG/PNG/WebP, 5 MB); límites de 10 mensajes/h y 5 suscripciones/h; `seed_products` que rechaza fotos repetidas o ausentes; JS de producción ≈ 69 KB gzip (68.470 B hoy).

## Preguntas para Jonás

1. **¿Delicaté es un negocio real (cliente, familiar o propio) o una marca de portafolio?** El README del repo dice «Proyecto de portafolio personal», pero el sitio usa un WhatsApp comercial real y está en producción.
2. **¿Los 10 productos y precios son el catálogo real?** Producción tiene exactamente los 10 productos del comando demo (`count: 10`); el propio repo los llama «de demostración».
3. **¿La foto de «Jardín Botánico» es la correcta?** Muestra un jabón amarillo con panal y abeja, pero su descripción habla de «hierbas y arcillas».
4. **¿Qué significa «4.ª versión»?** Sólo hay evidencia de la versión 2024 y de la 4.0 de 2026.
5. **¿Quién hizo el levantamiento de necesidades y con qué negocio?** El rol publicado lo afirma, pero no hay evidencia en el repo.
6. **¿Ya creaste el usuario administrador en producción y activaste las copias de seguridad?** No se verificó (no se tocó producción salvo lecturas GET).
7. **¿Se probó un pedido real desde un teléfono?** Falta confirmar si el emoji también llega roto al abrir `wa.me` directamente en la app móvil; aquí sólo se comprobó la página web de WhatsApp.
8. **¿Hay ventas, visitas o pedidos medibles?** No hay analítica en el código; no se incluye ninguna métrica de negocio.
9. **¿Quieres mencionar que los commits del 25-09-2026 se hicieron con asistencia de IA?** Siete llevan el trailer `Co-Authored-By: Claude` (endurecimiento, despliegue y dominio).
10. **¿Mantener los endpoints `/api/contact/` y `/api/newsletter/`?** Ninguna pantalla los usa.
