# Calidad del repositorio

Este documento define cómo se presenta y mantiene Jonás Orbit v3 como proyecto
de ingeniería mientras el producto continúa en desarrollo.

## Regla de publicación

El repositorio debe ser profesional sin aparentar un grado de finalización que
todavía no existe:

- el README separa lo implementado de lo pendiente;
- las capturas llevan estado, fecha y perfil reproducible;
- las métricas se publican sólo con comando y resultado verificables;
- las decisiones visuales pendientes se nombran como pendientes;
- no se inventan dominio, cifras, clientes ni licencias.

## Archivos fuente y generados

- `public/` contiene sólo recursos que sirve la aplicación: las PNG maestras
  de las capturas NO (el navegador sólo recibe sus peldaños WebP).
- `assets/`, `Fotos/`, `Disenos/` y `portfolio-content/` conservan fuentes y
  evidencia en disco, **fuera de Git** desde 2026-09-28 (repositorio público);
  su historial vive en el privado `JonasJavier/jonas-orbit-v3-archivo`.
- `.next/`, `.open-next/`, `.velite/`, `output/`, `mesa-shots/`, `.shots/`,
  reportes, logs y comparativas temporales permanecen fuera de Git.
- Un artefacto estable de documentación debe vivir bajo `docs/media/` y explicar
  cómo se obtuvo.

## Capturas

Una captura publicable debe indicar:

- ruta y viewport;
- build utilizado;
- movimiento encendido o apagado;
- fecha de captura;
- estado de la valoración visual del propietario.

Las capturas de trabajo permanecen en directorios ignorados. Las herramientas
de `tools/` usan `.shots/` por defecto.

## Métricas

La fuente canónica de umbrales es `lighthouserc.json` y el Appendix A del plan.
Un número sólo entra al README cuando una modificación deliberada mueve la
medida en la dirección esperada y se conserva evidencia reproducible.

El perfil ligero se mide con `?no3d=1`. La escena completa se revisa por
separado porque SwiftShader no representa una GPU real.

## Higiene

- No se versionan secretos, builds, logs, trazas ni capturas de trabajo.
- Las dependencias permanecen fijadas y se actualizan en PRs dedicados.
- Knip debe permanecer en verde: no se conservan componentes o exports huérfanos.
- Los binarios grandes requieren una auditoría específica antes de migrar el
  historial o adoptar Git LFS.
- Todo cambio de interfaz conserva accesibilidad, HTML sin JavaScript y 375 px.
