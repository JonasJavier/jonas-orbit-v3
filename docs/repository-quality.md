# Calidad del repositorio

Este documento define cómo se presenta y mantiene Jonás Orbit v3 como proyecto
de ingeniería mientras el producto continúa en desarrollo. No sustituye al plan
ni abre decisiones de producto.

## Regla de publicación

El repositorio debe ser profesional sin aparentar un grado de finalización que
todavía no existe. Por eso:

- el README separa lo implementado de lo pendiente;
- las capturas llevan un estado y una fecha verificables;
- las métricas se publican solo con comando, perfil y resultado reproducibles;
- las decisiones visuales pendientes se nombran como pendientes;
- no se inventan dominio, enlaces de producción, cifras ni licencias.

## Capturas

Las imágenes estables del README viven en `docs/media/readme/`. Las capturas de
trabajo, comparativas, trazas y reportes de navegador viven en `.shots/`,
`output/playwright/`, `test-results/` o `playwright-report/`, todos fuera de Git.

Una captura publicable debe indicar en el commit o PR:

- ruta y viewport;
- build de producción usado;
- movimiento encendido o apagado;
- fecha de captura;
- si la valoración visual del propietario está pendiente.

## Métricas

La fuente canónica de los umbrales es `lighthouserc.json` y el Appendix A del
plan. Un número solo entra al README cuando una modificación deliberada mueve
la medida en la dirección esperada y se conserva el artefacto de CI.

El perfil ligero se mide con `?no3d=1`. No se añade detección especial del
auditor. La escena completa se revisa por separado con las herramientas de
`tools/`, porque SwiftShader no representa una GPU real.

## Higiene

- No se versionan builds, logs, trazas, capturas de trabajo ni archivos `.env`.
- Los recursos de producto sí pueden versionarse cuando tienen consumidor,
  procedencia y licencia documentadas.
- Las dependencias permanecen fijadas y se actualizan en PRs dedicados.
- Knip debe permanecer en verde: no se conservan componentes o exports huérfanos.
- Los binarios grandes y duplicados requieren una auditoría específica antes de
  hacer una migración de historial o adoptar Git LFS.

## Revisión periódica

Antes de una publicación pública:

1. ejecutar `npm run check` y la matriz E2E;
2. confirmar CI, Lighthouse y enlaces en verde;
3. renovar las capturas del README;
4. comprobar procedencia y licencia de cada recurso;
5. fijar descripción, temas, dominio y visibilidad en GitHub;
6. decidir y publicar una licencia o mantener explícitamente todos los derechos.
