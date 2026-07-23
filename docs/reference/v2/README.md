# Referencia de v2 (solo lectura)

Código de la versión anterior (`jonas-orbit` v2) conservado **únicamente como
referencia**. Excluido de `tsconfig.json` y de Knip (viven bajo `docs/`, que
ambos ignoran). No se importa desde el código de v3; se adapta al puerto nuevo
cuando su fase lo pida.

| Archivo | Uso previsto en v3 |
|---|---|
| `universe.ts` | Copy de los 7 mundos, ya migrado a `content/es/worlds/` (corrigiendo Marketing Digital a carrera terminada). |
| `use-reduced-motion.ts` | Base para la política de `prefers-reduced-motion` de F1A. |
| `use-device-capability.ts` | Base para el gate de capacidad de F2B. |
| `performance.ts` | Base para la instrumentación/gate de rendimiento de F2B — adaptar, no importar directo. |

Regla (AGENTS.md): estos archivos NO se editan como parte de v3. Si un patrón
es útil, se reimplementa en el árbol de v3 con sus propios tests.
