import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados por herramientas (no son código fuente):
    ".open-next/**",
    ".velite/**",
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
    "output/**",
    // Worktrees de sesiones de agente (excluidos de git en .git/info/exclude):
    // arrastran su propio .next y hacían fallar `npm run check` por archivos
    // generados que no son de este árbol.
    ".claude/**",
    // Referencia v2 conservada, no se lintea:
    "docs/**",
  ]),
  // Un .cjs es CommonJS por definición: `require()` es su forma de importar
  // (p. ej. los scripts de captura de `portfolio-content/*/scripts/`).
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
