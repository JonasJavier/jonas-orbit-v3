// portfolio-content/omsta/scripts/capture_screenshots.mjs
//
// Captura automatizada de pantallas de OMSTA (CristecnoViajes_SRL) para el caso
// de estudio del portafolio. Inicia sesión una sola vez con el usuario demo de
// desarrollo y recorre las rutas reales del sistema tomando capturas
// consistentes a 1440x900 (desktop) y 390x844 (mobile).
//
// Requisitos: ejecutarse desde la raíz del repo OMSTA (para resolver
// `playwright` desde su node_modules) con el servidor Django corriendo en
// http://127.0.0.1:8000 y el usuario demo creado.
//
// Uso:
//   node <ruta>/capture_screenshots.mjs
//
// No modifica datos: solo hace GET a las páginas (no envía formularios).

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

// Resuelve playwright desde el node_modules del repo OMSTA sin depender del cwd.
const OMSTA_REPO =
  process.env.OMSTA_REPO || "C:/Users/savage/Documents/GitHub/CristecnoViajes_SRL";
const require = createRequire(OMSTA_REPO + "/package.json");
const { chromium } = require("playwright");

const BASE = process.env.OMSTA_BASE_URL || "http://127.0.0.1:8000";
const USER = process.env.OMSTA_DEMO_USER || "demo_portafolio";
const PASS = process.env.OMSTA_DEMO_PASS || "OmstaDemo2026!portfolio";
const OUT =
  process.env.OMSTA_OUT_DIR ||
  "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/portfolio-content/omsta/screenshots/raw";

mkdirSync(OUT, { recursive: true });

// Rutas desktop a capturar (nombre de archivo -> ruta). Orden = narrativa.
const DESKTOP = [
  ["01-dashboard-panel-ejecutivo", "/"],
  ["03-reservas-listado", "/reservas/"],
  ["04-reserva-detalle", "/reservas/reserva/63/"],
  ["05-reserva-nueva-hotel-form", "/reservas/nueva/hotel/"],
  ["06-reservas-servicios-productos", "/reservas/productos/"],
  ["07-crm-clientes-listado", "/crm/"],
  ["08-crm-cliente-detalle", "/crm/entities/client/27/"],
  ["09-contabilidad-caja-pagos", "/contabilidad/pagos/"],
  ["10-cuentas-por-cobrar", "/contabilidad/cuentas-por-cobrar/"],
  ["11-cuentas-por-pagar", "/contabilidad/cuentas-por-pagar/"],
  ["12-contabilidad-pago-reserva", "/contabilidad/pagos/reserva/56/"],
  ["13-notas-cliente-ar", "/contabilidad/ar/notas/"],
  ["14-notas-proveedor-ap", "/contabilidad/ap/notas/"],
  ["15-ledger-libro-diario", "/ledger/entries/"],
  ["16-entrada-diario-form", "/contabilidad/entrada-diario/"],
  ["17-plan-de-cuentas-coa", "/catalogo-cuentas/"],
  ["18-banco-cuentas", "/banco/"],
  ["19-nomina", "/nomina/"],
  ["20-divisas-tasas", "/divisas/"],
  ["21-sucursales", "/sucursales/"],
  ["22-documentos-politicas", "/documentos/"],
  ["23-reportes", "/reportes/"],
  ["24-usuarios-roles", "/usuarios/users/"],
  ["25-auditoria-actividad", "/usuarios/activity-log/"],
  ["27-tutoriales-centro", "/tutoriales/"],
  ["28-configuracion-empresa", "/usuarios/config/"],
];

// Rutas mobile (390x844).
const MOBILE = [
  ["50-mobile-dashboard", "/"],
  ["51-mobile-reservas-listado", "/reservas/"],
  ["52-mobile-reserva-detalle", "/reservas/reserva/63/"],
  ["53-mobile-cuentas-por-cobrar", "/contabilidad/cuentas-por-cobrar/"],
];

const results = [];

async function settle(page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    /* fallback: seguimos igual */
  }
  await page.waitForTimeout(1600); // deja asentar gráficos/animaciones
}

async function capture(page, name, path, fullPage = false) {
  const url = BASE + path;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page);
    const file = `${OUT}/${name}.png`;
    await page.screenshot({ path: file, fullPage });
    const title = await page.title();
    results.push({ name, path, title, ok: true });
    console.log(`OK   ${name}  <-  ${path}  [${title}]`);
  } catch (e) {
    results.push({ name, path, ok: false, error: String(e).slice(0, 200) });
    console.log(`FAIL ${name}  <-  ${path}  ${String(e).slice(0, 160)}`);
  }
}

async function login(page) {
  await page.goto(BASE + "/usuarios/login/", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(USER);
  await page.locator('input[type="password"]').first().fill(PASS);
  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(1500);
  const t = await page.title();
  if (/Acceso|login/i.test(t)) {
    throw new Error("Login parece haber fallado; título=" + t);
  }
  console.log("LOGIN OK -> " + t);
}

const browser = await chromium.launch({ headless: true });

// --- Desktop ---
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "es-DO",
});
const page = await ctx.newPage();
await login(page);
for (const [name, path] of DESKTOP) {
  await capture(page, name, path);
}
const storage = await ctx.storageState();
await ctx.close();

// --- Mobile (reutiliza sesión) ---
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  locale: "es-DO",
  storageState: storage,
});
const mpage = await mctx.newPage();
for (const [name, path] of MOBILE) {
  await capture(mpage, name, path);
}
await mctx.close();

await browser.close();

writeFileSync(`${OUT}/_capture_log.json`, JSON.stringify(results, null, 2));
const ok = results.filter((r) => r.ok).length;
console.log(`\n== DONE ${ok}/${results.length} capturas OK ==`);
