// Captura de profundidad: nómina, sucursales, usuarios/roles, CRM empresa.
import { createRequire } from "node:module";
const require = createRequire("C:/Users/savage/Documents/GitHub/CristecnoViajes_SRL/package.json");
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8000";
const OUT = "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/portfolio-content/omsta/screenshots/raw";

const TARGETS = [
  ["19-nomina", "/nomina/"], // recaptura con datos
  ["29-nomina-empleados", "/nomina/empleados/"],
  ["30-nomina-periodos", "/nomina/periodos/"],
  ["31-nomina-periodo-detalle", "/nomina/periodos/14/"],
  ["32-nomina-retenciones", "/nomina/configuracion/retenciones/"],
  ["33-sucursal-detalle", "/sucursales/170/"],
  ["34-sucursal-reporte", "/sucursales/170/reporte/"],
  ["35-usuario-editar-roles", "/usuarios/users/363/edit/"],
  ["36-crm-empresa-detalle", "/crm/entities/company/3/"],
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "es-DO" });
const page = await ctx.newPage();

await page.goto(BASE + "/usuarios/login/", { waitUntil: "domcontentloaded" });
await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill("demo_portafolio");
await page.locator('input[type="password"]').first().fill("OmstaDemo2026!portfolio");
await Promise.all([
  page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(1500);
console.log("login ->", await page.title());

for (const [name, path] of TARGETS) {
  try {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log("OK  ", name, "->", path, "[", await page.title(), "]");
  } catch (e) {
    console.log("FAIL", name, "->", path, String(e).slice(0, 140));
  }
}
await browser.close();
