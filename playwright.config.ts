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
  reporter: process.env.CI ? "github" : "list",
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
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/es",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
