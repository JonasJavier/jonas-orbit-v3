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

## Estado de GitHub

Alertas de vulnerabilidades activadas y temas del proyecto actualizados.
El repositorio mantiene su visibilidad privada.

El [run de organización](https://github.com/JonasJavier/jonas-orbit-v3/actions/runs/36322458189)
no ejecutó pasos: su anotación indica pagos fallidos o límite de gasto
insuficiente. Los resultados locales no equivalen a checks remotos verdes.

La consulta de rulesets devolvió 403 y exigió GitHub Pro o un repositorio
público. No se cambió la visibilidad para obtener protección de ramas.

## Condiciones pendientes

- Verificación multinavegador completa y auditoría Lighthouse/enlaces.
- Facturación/límite de gasto de Actions y protección de la rama según el plan
  de GitHub disponible.
- Dominio, TLS, canonical y configuración de GitHub/Cloudflare.
- Rate limiting de infraestructura y entrega real de contacto.
- Licencias de audio y valoración visual del propietario.

`wrangler whoami` confirma que este entorno no está autenticado en Cloudflare;
no se ha realizado un despliegue ni se ha creado una cuenta de preview.

El procedimiento operativo vive en
[`production-readiness.md`](../production-readiness.md).
