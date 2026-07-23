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
    // Referencia v2 conservada, no se lintea:
    "docs/**",
  ]),
]);

export default eslintConfig;
