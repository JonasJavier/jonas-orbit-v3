// Captura todas las pantallas de Izak's Photos para el portafolio.
//
// Requisitos:
//   1. seed_demo.py ejecutado (base local desechable con datos demo).
//   2. serve_demo.py corriendo (Django sirve build, API y admin en :8000).
// Uso (desde cualquier carpeta):
//   node capture.mjs
//
// Resuelve Playwright desde node_modules de jonas-orbit-v3; no instala nada.
// Escritorio 1440x900 y móvil 390x844, ambos con deviceScaleFactor 2.
// prefers-reduced-motion: reduce -> el sitio muestra todo sin animar y el
// carrusel queda detenido en la primera foto (capturas deterministas).
//
// Además de los PNG escribe screenshots/capture-report.json con, por captura,
// errores de consola, peticiones fallidas, imágenes rotas y desborde horizontal.
// Los envíos del formulario van sólo a la base local; el "sin conexión" se
// simula cortando la petición con page.route (nunca sale nada a internet).

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORBIT =
  process.env.ORBIT_REPO ||
  "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/jonas-orbit-v3";
const { chromium } = createRequire(ORBIT + "/package.json")("playwright");

const SITE = process.env.DEMO_SITE_URL || "http://127.0.0.1:8000";
// Cuenta creada por seed_demo.py; sólo existe en la base local desechable.
const ADMIN_USER = "demo-admin";
const ADMIN_PASSWORD = "IzakDemo-2026!local";

const OUT = join(HERE, "..", "screenshots", "raw");
const REPORT = join(HERE, "..", "screenshots", "capture-report.json");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const report = [];
let counter = 0;

async function newPage(browser, device, lang = "en") {
  const context = await browser.newContext({ ...device, locale: lang === "es" ? "es-DO" : "en-US", reducedMotion: "reduce" });
  await context.addInitScript((l) => localStorage.setItem("izak-lang", l), lang);
  const page = await context.newPage();
  page._log = { console: [], pageErrors: [], failed: [] };
  page.on("console", (m) => m.type() === "error" && page._log.console.push(m.text()));
  page.on("pageerror", (e) => page._log.pageErrors.push(String(e)));
  page.on("requestfailed", (r) => page._log.failed.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && page._log.failed.push(`${r.status()} ${r.url()}`));
  return { context, page };
}

async function settle(page, { keepPointer = false } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  if (!keepPointer) {
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.mouse.move(2, 2);
  }
  await page.evaluate(() => document.fonts.ready);
  // Espera a que terminen las imágenes visibles (las demás son lazy) y a que
  // las miniaturas de la galería hayan hecho su fundido de entrada.
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            return r.bottom > 0 && r.top < innerHeight && r.width > 0;
          })
          .every((img) => img.complete && img.naturalWidth > 0 && (!img.closest(".masonry-button") || img.classList.contains("is-loaded"))),
      null,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(700);
}

async function scrollToSection(page, selector, offset = 84) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
    },
    [selector, offset],
  );
}

async function inspect(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const broken = [...document.images]
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.width > 0 && !(img.complete && img.naturalWidth > 0);
      })
      .map((img) => img.getAttribute("src"));
    return { overflowX: document.documentElement.scrollWidth > vw, docWidth: document.documentElement.scrollWidth, viewport: vw, brokenImages: broken };
  });
}

async function shot(page, name, { url, note, fullPage = false } = {}) {
  counter += 1;
  const file = `${String(counter).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage });
  const checks = await inspect(page);
  report.push({
    file,
    url: url || page.url().replace(SITE, ""),
    note: note || "",
    ...checks,
    consoleErrors: [...page._log.console],
    pageErrors: [...page._log.pageErrors],
    failedRequests: [...page._log.failed],
  });
  page._log.console.length = 0;
  page._log.pageErrors.length = 0;
  page._log.failed.length = 0;
  console.log(file, checks.overflowX ? "OVERFLOW" : "", checks.brokenImages.length ? "BROKEN" : "");
}

async function goto(page, path) {
  await page.goto(SITE + path, { waitUntil: "networkidle" });
  await settle(page);
}

// Mantiene retenidas las respuestas que casan con `pattern` hasta llamar a release().
function hold(page, pattern) {
  const pending = [];
  let open = true;
  const handler = (route) => (open ? pending.push(route) : route.continue());
  page.route(pattern, handler);
  return async () => {
    open = false;
    await page.unroute(pattern, handler);
    await Promise.all(pending.map((r) => r.continue().catch(() => {})));
  };
}

async function fillBooking(page, { name = "Sofía Marte", email = "sofia@example.com" } = {}) {
  await page.click(".package-list button >> nth=1");
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=phone]", "+1 (809) 555-0123");
  await page.fill("input[name=date]", "October 24, 2026");
  await page.fill("input[name=location]", "Zona Colonial");
  await page.selectOption("select[name=referral]", "Referral");
  await page.fill("textarea[name=message]", "Portraits for a new brand website: golden hour, two outfits, some street scenes.");
}

const browser = await chromium.launch();

// ---------------------------------------------------------------- Escritorio / EN
{
  const { context, page } = await newPage(browser, DESKTOP, "en");

  await goto(page, "/");
  await shot(page, "home-desktop", { note: "Hero, primera foto; carrusel detenido por reduced-motion" });
  await scrollToSection(page, ".intro");
  await settle(page);
  await shot(page, "home-intro-desktop", { url: "/ (intro)" });
  await scrollToSection(page, ".featured", 100);
  await settle(page);
  await shot(page, "home-featured-desktop", { url: "/ (selected work)" });
  await page.hover(".featured-stack .featured-card >> nth=0");
  await page.waitForTimeout(700);
  await shot(page, "home-featured-hover-desktop", { url: "/ (selected work, hover)" });
  await scrollToSection(page, ".service-grid", 110);
  await settle(page);
  await shot(page, "home-services-desktop", { url: "/ (services)" });
  await scrollToSection(page, ".process");
  await settle(page);
  await shot(page, "home-process-desktop", { url: "/ (process)" });
  await scrollToSection(page, ".testimonials");
  await settle(page);
  await shot(page, "home-testimonials-desktop", { url: "/ (testimonials)" });
  await scrollToSection(page, ".cta");
  await settle(page);
  await shot(page, "home-cta-footer-desktop", { url: "/ (cta + footer)" });

  await goto(page, "/projects");
  await shot(page, "gallery-desktop");
  await scrollToSection(page, ".gallery-toolbar", 90);
  await settle(page);
  await shot(page, "gallery-grid-desktop", { url: "/projects (grid)" });
  await page.hover(".masonry-button >> nth=1");
  await page.waitForTimeout(700);
  await shot(page, "gallery-hover-desktop", { url: "/projects (hover)" });
  await goto(page, "/projects?category=weddings");
  await scrollToSection(page, ".gallery-toolbar", 90);
  await settle(page);
  await shot(page, "gallery-weddings-desktop");
  await goto(page, "/projects?category=travel");
  await scrollToSection(page, ".gallery-toolbar", 90);
  await settle(page);
  await shot(page, "gallery-travel-desktop");

  // Estado de carga: miniaturas retenidas, se ve el marcador de posición.
  {
    const release = hold(page, "**/*.webp");
    await page.goto(SITE + "/projects?category=portraits", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".masonry-item");
    await scrollToSection(page, ".gallery-toolbar", 90);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(900);
    await shot(page, "gallery-loading-desktop", { note: "Miniaturas retenidas con page.route: marcadores de posición" });
    await release();
  }

  // Visor
  await goto(page, "/projects?photo=red-motion");
  await shot(page, "lightbox-desktop", { note: "Enlace directo ?photo=red-motion" });
  await goto(page, "/projects?photo=the-arch");
  await shot(page, "lightbox-landscape-desktop");
  {
    const release = hold(page, "**/wedding-golden-*.jpg");
    await page.goto(SITE + "/projects?photo=golden-hour", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".lightbox-figure img");
    await page.waitForTimeout(1500);
    await shot(page, "lightbox-loading-desktop", { note: "JPEG completo retenido: se ve la miniatura de fondo" });
    await release();
  }

  await goto(page, "/about");
  await shot(page, "about-desktop");
  await scrollToSection(page, ".about-story");
  await settle(page);
  await shot(page, "about-story-desktop", { url: "/about (story)" });
  await scrollToSection(page, ".about-principles");
  await settle(page);
  await shot(page, "about-principles-desktop", { url: "/about (principles + stats)" });

  await goto(page, "/booking");
  await shot(page, "booking-desktop");
  await scrollToSection(page, ".booking-section", 70);
  await fillBooking(page);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await shot(page, "booking-filled-desktop", { url: "/booking (formulario lleno)" });
  await page.click("button[type=submit]");
  await page.waitForSelector(".confirmation-panel.is-confirmed");
  await settle(page);
  await shot(page, "booking-success-desktop", { note: "Enviado a la API local (base demo)" });

  await goto(page, "/booking");
  await scrollToSection(page, ".booking-section", 70);
  await fillBooking(page, { email: "sofia@example" });
  await page.click("button[type=submit]");
  await page.waitForSelector(".field-error");
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await shot(page, "booking-validation-desktop", { note: "La API rechaza el correo (400) y el campo se marca" });

  await goto(page, "/booking");
  await scrollToSection(page, ".booking-section", 70);
  await page.route("**/api/contact/", (route) => route.abort());
  await fillBooking(page);
  await page.click("button[type=submit]");
  await page.waitForSelector(".form-status.error");
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await shot(page, "booking-offline-desktop", { note: "Petición cortada con page.route (sin conexión simulada)" });
  await page.unroute("**/api/contact/");

  await goto(page, "/esta-pagina-no-existe");
  await shot(page, "not-found-desktop");

  await context.close();
}

// ---------------------------------------------------------------- Móvil / EN
{
  const { context, page } = await newPage(browser, MOBILE, "en");

  await goto(page, "/");
  await shot(page, "home-mobile");
  await page.click(".menu-button");
  await page.waitForTimeout(800);
  await shot(page, "menu-mobile", { url: "/ (menú abierto)" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await scrollToSection(page, ".intro");
  await settle(page);
  await shot(page, "home-intro-mobile", { url: "/ (intro)" });
  await scrollToSection(page, ".featured");
  await settle(page);
  await shot(page, "home-featured-mobile", { url: "/ (selected work)" });
  await scrollToSection(page, ".service-card");
  await settle(page);
  await shot(page, "home-services-mobile", { url: "/ (services)" });
  await scrollToSection(page, ".process");
  await settle(page);
  await shot(page, "home-process-mobile", { url: "/ (process)" });
  await scrollToSection(page, ".testimonial-grid");
  await settle(page);
  await shot(page, "home-testimonials-mobile", { url: "/ (testimonials)" });
  await scrollToSection(page, ".cta");
  await settle(page);
  await shot(page, "home-cta-footer-mobile", { url: "/ (cta + footer)" });

  await goto(page, "/projects");
  await shot(page, "gallery-mobile");
  await scrollToSection(page, ".masonry", 90);
  await settle(page);
  await shot(page, "gallery-grid-mobile", { url: "/projects (grid)" });
  await goto(page, "/projects?category=weddings");
  await scrollToSection(page, ".gallery-toolbar", 90);
  await settle(page);
  await shot(page, "gallery-weddings-mobile");
  {
    const release = hold(page, "**/*.webp");
    await page.goto(SITE + "/projects?category=editorial", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".masonry-item");
    await scrollToSection(page, ".gallery-toolbar", 90);
    await page.waitForTimeout(900);
    await shot(page, "gallery-loading-mobile", { note: "Miniaturas retenidas con page.route" });
    await release();
  }

  await goto(page, "/projects?photo=red-motion");
  await shot(page, "lightbox-mobile");
  await goto(page, "/projects?photo=sunlit-walk");
  await shot(page, "lightbox-landscape-mobile");

  await goto(page, "/about");
  await shot(page, "about-mobile");
  await scrollToSection(page, ".about-story");
  await settle(page);
  await shot(page, "about-story-mobile", { url: "/about (story)" });
  await scrollToSection(page, ".about-quote");
  await settle(page);
  await shot(page, "about-quote-mobile", { url: "/about (quote)" });
  await scrollToSection(page, ".about-stats-section", 300);
  await settle(page);
  await shot(page, "about-stats-mobile", { url: "/about (principles + stats)" });

  await goto(page, "/booking");
  await shot(page, "booking-mobile");
  await scrollToSection(page, ".package-column");
  await settle(page);
  await shot(page, "booking-packages-mobile", { url: "/booking (paquetes)" });
  await fillBooking(page, { name: "Andrés Lora", email: "andres@example.com" });
  await scrollToSection(page, ".booking-form");
  await page.waitForTimeout(400);
  await shot(page, "booking-form-mobile", { url: "/booking (formulario lleno)" });
  await page.click("button[type=submit]");
  await page.waitForSelector(".confirmation-panel.is-confirmed");
  await page.waitForTimeout(1200);
  await settle(page);
  await shot(page, "booking-success-mobile", { note: "La página se desplaza sola a la confirmación" });

  await goto(page, "/booking");
  await fillBooking(page, { email: "sofia@example" });
  await page.click("button[type=submit]");
  await page.waitForSelector(".field-error");
  await scrollToSection(page, "input[name=email]", 260);
  await page.waitForTimeout(500);
  await shot(page, "booking-validation-mobile");

  await goto(page, "/esta-pagina-no-existe");
  await shot(page, "not-found-mobile");

  await context.close();
}

// ---------------------------------------------------------------- Español
{
  const { context, page } = await newPage(browser, DESKTOP, "es");
  await goto(page, "/");
  await shot(page, "home-es-desktop");
  await goto(page, "/projects");
  await scrollToSection(page, ".gallery-toolbar", 90);
  await settle(page);
  await shot(page, "gallery-es-desktop");
  await goto(page, "/booking");
  await shot(page, "booking-es-desktop");
  await context.close();
}
{
  const { context, page } = await newPage(browser, MOBILE, "es");
  await goto(page, "/");
  await shot(page, "home-es-mobile");
  await page.click(".menu-button");
  await page.waitForTimeout(800);
  await shot(page, "menu-es-mobile", { url: "/ (menú abierto)" });
  await context.close();
}

// ---------------------------------------------------------------- Admin de Django
for (const [device, suffix] of [[DESKTOP, "desktop"], [MOBILE, "mobile"]]) {
  const { context, page } = await newPage(browser, device, "en");
  await goto(page, "/admin/login/");
  await shot(page, `admin-login-${suffix}`);
  await page.fill("#id_username", ADMIN_USER);
  await page.fill("#id_password", ADMIN_PASSWORD);
  await Promise.all([page.waitForURL("**/admin/"), page.click("input[type=submit]")]);
  await settle(page);
  await shot(page, `admin-index-${suffix}`);
  await goto(page, "/admin/api/bookinginquiry/");
  await shot(page, `admin-inquiries-${suffix}`);
  if (suffix === "desktop") {
    await page.click("#result_list tbody tr:first-child th a");
    await page.waitForURL("**/change/");
    await settle(page);
    await shot(page, "admin-inquiry-detail-desktop");
    await goto(page, "/admin/api/bookinginquiry/?is_handled__exact=0");
    await page.check("#result_list tbody tr:nth-child(1) input.action-select");
    await page.check("#result_list tbody tr:nth-child(2) input.action-select");
    await page.selectOption("select[name=action]", "mark_handled");
    await Promise.all([page.waitForNavigation(), page.click("button[name=index]")]);
    await settle(page);
    await shot(page, "admin-inquiries-handled-desktop", { note: "Tras la acción «Mark selected inquiries as handled» (base demo)" });
  }
  await context.close();
}

await browser.close();
writeFileSync(REPORT, JSON.stringify({ site: SITE, capturedAt: new Date().toISOString(), shots: report }, null, 2));
console.log(`${report.length} capturas en ${OUT}`);
