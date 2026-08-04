import { defineConfig, devices } from "@playwright/test";

/**
 * E2E sobre build de producción: ejecutar `npm run build` antes de
 * `npm run test:e2e`. En CI el job de e2e construye primero.
 * Chromium por PR; Firefox/WebKit se añaden al job de main (plan de CI).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // En CI generamos también el reporte HTML: el job de e2e sube
  // playwright-report/ como artifact ante fallos (antes no existía).
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Mobile-first: viewport de 375px exacto (A32, "viaje usable en 375px").
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
    // Firefox y WebKit se ejecutan solo en el job de main (plan de CI); no
    // entran en `npm run test:e2e`, que se acota a los proyectos Chromium.
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/es",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      CONTACT_RUNTIME_ENV: "test",
      CONTACT_DELIVERY_MODE: "test",
      TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
  },
});
