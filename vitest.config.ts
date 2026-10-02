import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// El build de Railway corre `npm run check` con NODE_ENV=production. Heredado
// aquí, Vite resuelve como para producción (los `node:` de los tests fallan) y
// React carga su build sin `act`, que Testing Library necesita. Los tests son
// siempre `test`, los lance quien los lance.
// (`Object.assign` porque los tipos de Next declaran NODE_ENV de sólo lectura.)
Object.assign(process.env, { NODE_ENV: "test" });

export default defineConfig({
  plugins: [react()],
  // Vite resuelve los alias de tsconfig (`@/*`, `@velite`) de forma nativa.
  resolve: { tsconfigPaths: true },
  test: {
    // globals habilita el auto-cleanup de Testing Library entre tests.
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Los tests del Observatorio montan el visor entero en jsdom: en una
    // máquina cargada (el builder de Railway, un equipo con e2e en marcha)
    // uno pasó de 5 s. Un cuelgue real sigue fallando.
    testTimeout: 15_000,
    include: ["**/*.test.{ts,tsx}"],
    // `**/node_modules/**` y `.claude/**`: un worktree de otra sesión bajo
    // `.claude/worktrees/` trae su propio `node_modules` con tests ajenos, y
    // «node_modules» a secas sólo excluye el de la raíz (2026-10-02).
    exclude: ["**/node_modules/**", ".claude/**", "e2e", ".next", ".open-next", ".velite"],
  },
});
