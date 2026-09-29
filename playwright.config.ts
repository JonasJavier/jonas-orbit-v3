import { defineConfig, devices } from "@playwright/test";

/**
 * E2E sobre build de producción: ejecutar `npm run build` antes de
 * `npm run test:e2e`. En CI el job de e2e construye primero.
 * Chromium por PR; Firefox/WebKit se añaden al job de main (plan de CI).
 */

/**
 * Puerto propio del servidor de pruebas, y no el 3000.
 *
 * `reuseExistingServer` está activo fuera de CI para no reconstruir un servidor
 * en cada ejecución local, y ahí estaba la trampa: con algo escuchando ya en el
 * 3000 —un `next dev`, o un `next start` abierto para mirar la escena—
 * Playwright NO arranca el suyo, se engancha al que hay. Y el que hay no lleva
 * las variables del bloque `env` de abajo, así que los tests de contacto y
 * Turnstile fallan contra un servidor que nunca fue configurado para ellos.
 *
 * El síntoma es cruel porque no parece un problema de entorno: salen cuarenta
 * tests en rojo repartidos por toda la suite, como si el cambio que acabas de
 * hacer hubiera roto media aplicación. Pasó dos veces en una sola sesión.
 *
 * Con un puerto propio la reutilización sigue funcionando —entre ejecuciones de
 * la propia suite, que es para lo que sirve— y deja de existir la colisión.
 */
const E2E_PORT = 3210;
const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Varias pruebas mantienen contextos WebGL y transiciones persistentes. Con
  // el paralelismo implícito de una máquina con muchos núcleos, el hilo se
  // satura y aparecen timeouts que no se reproducen aislados. Cuatro workers
  // conservan concurrencia local. En CI, un worker por trozo: con dos, un
  // runner de 2 núcleos con GPU por software se saturaba hasta que la página
  // dejaba de responder (clics sin resolver, 2026-09-28); el paralelismo lo
  // pone la matriz de trozos del workflow.
  workers: process.env.CI ? 1 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // En CI generamos también el reporte HTML: el job de e2e sube
  // playwright-report/ como artifact ante fallos (antes no existía).
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: E2E_ORIGIN,
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
    url: `${E2E_ORIGIN}/es`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // next start respeta PORT, así que no hace falta tocar el script de npm.
      PORT: String(E2E_PORT),
      CONTACT_RUNTIME_ENV: "test",
      CONTACT_DELIVERY_MODE: "test",
      TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
  },
});
