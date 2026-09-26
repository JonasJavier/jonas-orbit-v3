// portfolio-content/omsta-2026/scripts/capture_web.mjs
//
// Captura la web de OMSTA con Playwright para el paquete omsta-2026 y, en la
// misma pasada, audita cada pantalla (regla principal del paquete: si falla o
// no se ve bien, no se incluye).
//
// Uso (desde cualquier carpeta):
//   node capture_web.mjs <shots.json> [filtro]
//
// Variables:
//   OMSTA_BASE_URL   http://127.0.0.1:8130 (servidor de portafolio, BD omsta_portfolio)
//   OMSTA_SESSION    clave de sesión (la imprime session_key.py); no se teclean contraseñas
//   OMSTA_REPO       raíz del repo OMSTA (para resolver playwright de su node_modules)
//   OMSTA_OUT        carpeta de salida (por defecto ../web/screenshots/raw)
//
// shots.json: [{ "name": "w01-dashboard", "url": "/", "mobile": false,
//                "fullPage": false, "click": "css", "wait": "css", "scrollTo": "css" }]
//
// Por cada toma escribe <name>.png y añade una entrada a audit.json con: estado
// HTTP, errores JS y de consola, peticiones fallidas, imágenes rotas, desborde
// horizontal y textos sospechosos (Traceback, TODO, próximamente…).

import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.OMSTA_REPO || "C:/Users/savage/Documents/GitHub/CristecnoViajes_SRL";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");

const BASE = process.env.OMSTA_BASE_URL || "http://127.0.0.1:8130";
const SESSION = process.env.OMSTA_SESSION;
const OUT = process.env.OMSTA_OUT || path.resolve(HERE, "../web/screenshots/raw");
if (!SESSION) throw new Error("Falta OMSTA_SESSION (usa session_key.py)");

const shots = JSON.parse(readFileSync(process.argv[2], "utf8").replace(/^﻿/, ""));
const filtro = process.argv[3] ? new RegExp(process.argv[3]) : null;
mkdirSync(OUT, { recursive: true });

const auditPath = path.join(OUT, "audit.json");
const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, "utf8")) : {};

const SOSPECHOSOS = [
  /Traceback/i, /Server Error/i, /Page not found/i, /NoReverseMatch/i,
  /TemplateSyntaxError/i, /\bTODO\b/, /pr[oó]ximamente/i, /lorem ipsum/i,
  /\bundefined\b/, /\bNaN\b/, /\{\{|\}\}|\{%|%\}/, /\bNone\b/,
];

const browser = await chromium.launch();
const host = new URL(BASE).hostname;

const pendientes = shots.filter((s) => !filtro || filtro.test(s.name));
const PARALELO = Number(process.env.OMSTA_PARALLEL || 3);
await Promise.all(Array.from({ length: PARALELO }, async () => {
  while (pendientes.length) await capturar(pendientes.shift());
}));
await browser.close();

async function capturar(shot) {
  const mobile = !!shot.mobile;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "es-DO",
    timezoneId: "America/Santo_Domingo",
    permissions: [], // sin geolocalización: nunca hay ubicación real en pantalla
    colorScheme: "light",
    // UA de Chrome estable: las pantallas de sesiones muestran el navegador.
    userAgent: mobile
      ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  });
  // anon: sin sesión (pantalla de login).
  if (!shot.anon) await context.addCookies([{ name: "sessionid", value: SESSION, domain: host, path: "/" }]);
  const page = await context.newPage();
  const consola = [];
  const fallidas = [];
  page.on("pageerror", (e) => consola.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") consola.push(`console: ${m.text()}`); });
  page.on("requestfailed", (r) => fallidas.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) fallidas.push(`${r.status()} ${r.url()}`); });

  let status = null;
  try {
    // «load» y luego red en calma acotada: algunas pantallas sondean (avisos,
    // presencia) y nunca llegan a networkidle.
    const calma = () => page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
    const resp = await page.goto(BASE + shot.url, { waitUntil: "load", timeout: 45000 });
    status = resp?.status() ?? null;
    await calma();
    await page.evaluate(() => document.fonts && document.fonts.ready);
    for (const sel of [].concat(shot.click || [])) { await page.locator(sel).first().click(); await calma(); }
    if (shot.wait) await page.waitForSelector(shot.wait, { timeout: 15000 });
    if (shot.scrollTo) await page.locator(shot.scrollTo).first().scrollIntoViewIfNeeded();
    // Sin spinners, tooltips ni cursor: esperar a que asienten animaciones.
    await page.mouse.move(0, 0);
    await page.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important}" });
    await page.waitForTimeout(shot.delay ?? 900);
    const dom = await page.evaluate(() => {
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.offsetParent !== null).map((i) => i.src);
      const doc = document.documentElement;
      const text = document.body ? document.body.innerText : "";
      const spinners = [...document.querySelectorAll(".spinner-border,.spinner-grow,.htmx-request,[aria-busy='true']")].filter((e) => e.offsetParent !== null).length;
      return { imgs, overflowX: doc.scrollWidth - doc.clientWidth, text, title: document.title, finalUrl: location.pathname + location.search, spinners };
    });
    const hallazgos = SOSPECHOSOS.filter((re) => re.test(dom.text)).map((re) => {
      const m = dom.text.match(re); const i = m.index;
      return `${re}: «${dom.text.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, " ")}»`;
    });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), fullPage: !!shot.fullPage });
    audit[shot.name] = {
      url: shot.url, finalUrl: dom.finalUrl, status, title: dom.title, mobile,
      consola, fallidas, imagenesRotas: dom.imgs, desbordeX: dom.overflowX,
      spinnersVisibles: dom.spinners, textoSospechoso: hallazgos,
    };
    const flag = status >= 400 || consola.length || fallidas.length || dom.imgs.length || dom.overflowX > 0 || hallazgos.length || dom.spinners;
    console.log(`${flag ? "⚠" : "✓"} ${shot.name} ${status} ${dom.finalUrl}`);
  } catch (e) {
    audit[shot.name] = { url: shot.url, status, error: String(e).slice(0, 400), consola, fallidas };
    console.log(`✗ ${shot.name} ${String(e).slice(0, 160)}`);
  }
  await context.close();
  writeFileSync(auditPath, JSON.stringify(audit, null, 2));
}
