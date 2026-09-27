# Revisión de preparación del repositorio · 2026-09-27

## Alcance

Organización, documentación, configuración de calidad y preparación de
despliegue. La valoración visual del propietario continúa pendiente. Esta
revisión no convierte los estados de los proyectos del portafolio en un estado
de publicación de Jonás Orbit.

La limpieza retira 60 archivos (35,8 MiB) del checkout versionado. Las fuentes
fotográficas y los kits de casos se conservan; el historial sigue permitiendo
recuperar los archivos retirados y su tamaño no se ha reducido mediante una
reescritura.

## Línea base

Commit de aplicación: `4730ef8571e982255c1ad02144d4b43f47d66126`.
Windows, Node 24.16.0, npm 11.13.0, build de producción local.

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | PASS: 110 archivos, 995 tests, 34 rutas construidas |
| `npm run test:e2e` | PASS: 316/316, Chromium y 375 px |
| `npx opennextjs-cloudflare build` | PASS: Worker generado |
| JSON, YAML y enlaces locales de la documentación nueva | PASS |
| Firefox + WebKit, ejecución inicial con 8 workers | FAIL: 276 aprobadas, 40 fallidas |
| `npm audit --omit=dev`, antes de actualizar | 4 avisos: 1 crítico, 2 altos y 1 moderado |
| `npm audit`, antes de actualizar | 16 avisos: 1 crítico, 9 altos y 6 moderados |

La integración del PR de organización conserva el límite de cuatro workers
locales / dos en CI que ya tenía ese PR. La ejecución inicial multinavegador
anterior se hizo antes de integrar esa configuración.

## Actualización dedicada de seguridad

Versiones exactas: Next.js / ESLint de Next 16.3.6, OpenNext 1.20.6,
Vitest 4.1.11, Wrangler 4.141.0, PostCSS 8.5.28 y Sharp 0.35.4. Se mantienen
los overrides porque unifican las versiones transitivas parcheadas; el
lockfile también actualiza las transitivas vulnerables dentro de los rangos
compatibles. No se usó `--force` ni se sustituyó Velite.

Referencias de los mantenedores:
[Next.js 16.3.6](https://github.com/vercel/next.js/releases/tag/v16.3.6),
[aviso de Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36) y
[aviso de optimización AVIF](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).

- Instalación limpia con `npm ci`: PASS; se reintentó con dos conexiones
  después de cortes de red del registry.
- `npm audit --omit=dev`: PASS, cero avisos.
- `npm audit`: PASS, cero avisos.
- `npm run check`: PASS con las versiones nuevas, 995 tests y build.
- `npx opennextjs-cloudflare build`: PASS con Next 16.3.6 / OpenNext 1.20.6.
- CI añade una auditoría que bloquea avisos altos y críticos.
- La actualización no cierra por sí misma los fallos de compatibilidad de la
  línea base ni las condiciones externas de publicación.

## Hallazgos de compatibilidad

- Firefox informa `cancelAndHoldAtTime is not a function` en la banda sonora.
  El control de volumen necesita una alternativa cuando esa API no existe.
- Una prueba táctil de Edmunds usa CDP, exclusivo de Chromium.
- Algunas pruebas suponen que todo navegador usa SwiftShader. Firefox y WebKit
  en este equipo pueden activar otra capacidad gráfica; debe controlarse el
  perfil que se está comprobando.
- Firefox devuelve `43.999996185302734` para un blanco CSS de 44 px: la
  comprobación geométrica debe considerar la precisión subpíxel sin reducir el
  tamaño de interacción exigido.
- Otros fallos de foco, imágenes, audio y navegación necesitan verificación
  aislada. No se han convertido en pruebas omitidas ni se han relajado los gates.

### Correcciones verificadas

La banda sonora conserva sus rampas en Firefox con una alternativa a
`cancelAndHoldAtTime`. Un evento `pause` previo al permiso de autoplay no apaga
la intención del visitante. Tres regresiones nuevas cubren estos contratos.
`npm run check` pasa con 998 tests en 110 archivos y 34 rutas.

La ejecución completa de los cuatro proyectos, con cuatro workers, produjo
610 aprobadas, 20 fallidas y dos omisiones: únicamente el swipe por CDP en
Firefox/WebKit, porque esa API es exclusiva de Chromium. Los 316 casos de
Chromium desktop/móvil pasaron con las dependencias parcheadas.

Después se corrigieron las dos suposiciones pendientes de Firefox:

- Los tres tests del fondo 2D fijan la ausencia de WebGL, en vez de inferirla
  del navegador del host. Los seis casos Firefox/WebKit pasan aislados.
- Después de Shift+Tab, Firefox enfoca el `dialog` nativo y Chromium su botón.
  Se exige que el foco vuelva al visor, no un destino específico del motor;
  Escape y restauración del foco siguen comprobándose. El caso pasa aislado.

La repetición completa de Firefox, con dos workers, termina con **157 aprobadas,
una omisión por CDP y cero fallos** (`npx playwright test --project firefox
--workers 2`). No sustituye la validación de WebKit pendiente.

En el WebKit de Playwright instalado en Windows, la sonda nativa informa
`typeof AudioContext === "undefined"`: no se sustituyó el audio por un mock
para presentar resultados verdes. Los 18 fallos de WebKit incluyen audio,
recorrido por Tab, imágenes responsivas, suspensión de dibujo y navegación.
Requieren validación en el runner compatible de CI; no se declara Safari listo
a partir de este resultado. Playwright explica los
[límites de plataforma de WebKit](https://playwright.dev/docs/browsers#webkit).
Una repetición de cinco casos con un solo worker devuelve uno aprobado (Ranger)
y cuatro fallidos (reposo de Edmunds, suspensión de Miller y dos de navbar).
No se atribuyen todos los fallos a concurrencia ni a la ausencia de audio.

### Rendimiento y enlaces

Tres auditorías Lighthouse del build local de producción, perfil ligero
`/es?no3d=1`, móvil y 4G simulada:

| Medida | Resultado |
| --- | --- |
| Performance / Accessibility / Best Practices / SEO | 98 / 100 / 100 / 100 |
| LCP mediana | 2,32 s |
| TBT mediana | 66,5 ms |
| CLS | 0 en las tres pasadas |

`lhci assert --config=lighthouserc.json` pasa. El comentario de LCP se mueve
fuera de `assertions` porque LHCI lo interpretaba como un audit inexistente;
no cambia ningún umbral ni el nivel histórico `warn` de LCP.

La inspección de los once scripts iniciales de `/es` suma 202.841 bytes gzip
(198,1 KiB) en los artefactos del build. No es una medición de transferencia
del Worker. El límite antiguo de 150 KiB está sustituido por el
[pivote, §8 y §14](../plans/sistema-gargantua.md): baseline compartido congelado
y presupuesto propio de ruta. Esta suma no separa ambas capas ni certifica
sus límites; la subida respecto a la línea histórica requiere investigación.
No se acepta una nueva línea base ni se cambia el presupuesto en esta revisión.

La revisión de 24 HTML construidos encontró 401 enlaces únicos: los 351
internos responden correctamente. De los 50 externos, 48 responden 200,
incluido el prototipo de Figma por GET (HEAD devuelve 404). Netflix devuelve
403 y LinkedIn 999 al cliente automático: pendientes de comprobación humana,
no clasificados como enlaces sanos ni excluidos del gate para ocultarlos.

Evidencia local ignorada: `output/browser-compat-check.log`,
`output/browser-compat-e2e.log`, `output/fallback-verification.log`,
`output/firefox-dialog-verification.log`, `output/webkit-audio-platform.log`,
`output/firefox-final-e2e.log`, `output/webkit-isolated-verification.log`,
`output/lighthouse/` y
`output/repository-link-review.json`.

## Estado de GitHub

Alertas de vulnerabilidades activadas y temas del proyecto actualizados.
El repositorio mantiene su visibilidad privada.

La organización y el README quedaron publicados en `main` mediante el
[PR #3](https://github.com/JonasJavier/jonas-orbit-v3/pull/3), squash
`4596a1bc63f0c96d3a36795c8d5233208ab90539`. La actualización de dependencias y
la compatibilidad permanecen separadas hasta cerrar los gates correspondientes.
El dispatch manual del workflow CI permite validar el candidato en Linux con
Firefox/WebKit y enlaces antes de fusionarlo; sólo `main` puede desplegar.

El [run de main](https://github.com/JonasJavier/jonas-orbit-v3/actions/runs/36324221380)
no ejecutó pasos: su anotación indica pagos fallidos o límite de gasto
insuficiente. Los resultados locales no equivalen a checks remotos verdes.

La consulta de rulesets devolvió 403 y exigió GitHub Pro o un repositorio
público. No se cambió la visibilidad para obtener protección de ramas.

## Condiciones pendientes

- Verificación multinavegador completa y revisión de los dos enlaces externos
  bloqueados para clientes automáticos.
- Facturación/límite de gasto de Actions y protección de la rama según el plan
  de GitHub disponible.
- Dominio, TLS, canonical y configuración de GitHub/Cloudflare.
- Rate limiting de infraestructura y entrega real de contacto.
- Licencias de audio y valoración visual del propietario.

`wrangler whoami` confirma que este entorno no está autenticado en Cloudflare;
no se ha realizado un despliegue ni se ha creado una cuenta de preview.

El procedimiento operativo vive en
[`production-readiness.md`](../production-readiness.md).
