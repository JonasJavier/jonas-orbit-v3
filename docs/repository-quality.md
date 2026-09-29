# Repository quality

This document defines how Jonás Orbit v3 is presented and maintained as an engineering project while the product continues to evolve.

## Publication standard

Present the repository professionally without implying that unfinished work is complete:

- Separate implemented features from pending work in the README.
- Record the state, date, and reproducible capture profile of screenshots.
- Publish metrics only with a verifiable command and result.
- Identify visual decisions awaiting owner review.
- Do not invent domains, measurements, clients, or license terms.

## Source and generated files

- `public/` contains only resources served by the application. Master PNG screenshots stay outside it; browsers receive optimized WebP variants.
- `assets/`, `Fotos/`, `Disenos/`, and `portfolio-content/` hold source files and evidence outside the public Git history as of 2026-09-28. Their earlier history is preserved in the private `JonasJavier/jonas-orbit-v3-archivo` repository.
- Keep `.next/`, `.open-next/`, `.velite/`, `output/`, `mesa-shots/`, `.shots/`, reports, logs, and temporary comparisons out of Git.
- A lasting documentation artifact belongs under `docs/media/` with a description of how it was produced.

## Screenshots

A publishable screenshot records its route and viewport, build, motion state, capture date, and owner review status. Working screenshots remain in ignored directories; the tools under `tools/` default to `.shots/`.

## Metrics

`lighthouserc.json` and Appendix A of the project plan define canonical thresholds. Add a number to the README only when a deliberate change moves the measurement in the expected direction and reproducible evidence is retained.

Measure the lightweight profile with `?no3d=1`. Review the full scene separately because SwiftShader does not represent a real GPU.

## Hygiene

- Do not commit secrets, builds, logs, traces, or working screenshots.
- Keep dependencies pinned and update them in dedicated pull requests.
- Keep Knip green; remove orphaned components and exports.
- Audit large binaries before considering a history migration or Git LFS.
- Preserve accessibility, meaningful HTML without JavaScript, and a usable 375 px layout with every interface change.
