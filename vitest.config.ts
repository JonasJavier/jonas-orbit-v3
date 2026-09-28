import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Vite resuelve los alias de tsconfig (`@/*`, `@velite`) de forma nativa.
  resolve: { tsconfigPaths: true },
  test: {
    // globals habilita el auto-cleanup de Testing Library entre tests.
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next", ".open-next", ".velite"],
  },
});
