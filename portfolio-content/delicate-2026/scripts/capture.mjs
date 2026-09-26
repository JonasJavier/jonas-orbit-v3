// Captura todas las pantallas de Delicaté 4.0 para el portafolio.
//
// Requisitos:
//   1. seed_demo.py ejecutado (base local desechable con datos demo).
//   2. serve_demo.sh corriendo (Django en :8000 y build de producción en :4173).
// Uso (desde cualquier carpeta):
//   node capture.mjs
//
// Resuelve Playwright desde node_modules de jonas-orbit-v3; no instala nada.
// Escritorio 1440x900 y móvil 390x844, ambos con deviceScaleFactor 2.
// Se usa prefers-reduced-motion: reduce (el sitio lo respeta) para que ningún
// cajón o diálogo salga a mitad de su animación.
//
// Además de los PNG escribe screenshots/capture-report.json con, por captura,
// errores de consola, peticiones fallidas, imágenes rotas y desborde horizontal.
// Nunca envía nada a WhatsApp: los enlaces se leen, no se abren.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORBIT =
  process.env.ORBIT_REPO ||
  "C:/Users/savage/Documents/kimi/Workspaces/portafolio espacial/jonas-orbit-v3";
const require = createRequire(ORBIT + "/package.json");
const { chromium } = require("playwright");

const SITE = process.env.DEMO_SITE_URL || "http://127.0.0.1:4173";
const ADMIN = process.env.DEMO_ADMIN_URL || "http://127.0.0.1:8000";
// Cuenta creada por seed_demo.py; sólo existe en la base local desechable.
const ADMIN_EMAIL = "demo-admin@delicate.test";
const ADMIN_PASSWORD = "DemoDelicate-2026!local";

const OUT = join(HERE, "..", "screenshots", "raw");
const REPORT = join(HERE, "..", "screenshots", "capture-report.json");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const report = [];
const notes = {};
let counter = 0;

async function newPage(browser, device) {
  const context = await browser.newContext({ ...device, locale: "es-DO", reducedMotion: "reduce" });
  const page = await context.newPage();
  page._log = { console: [], pageErrors: [], failed: [] };
  page.on("console", (m) => m.type() === "error" && page._log.console.push(m.text()));
  page.on("pageerror", (e) => page._log.pageErrors.push(String(e)));
  page.on("requestfailed", (r) => page._log.failed.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && page._log.failed.push(`${r.status()} ${r.url()}`));
  return { context, page };
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // Sin anillo de foco residual (Escape devuelve el foco al botón que abrió
  // el panel) ni efectos hover del ratón en la captura.
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.mouse.move(2, 2);
  await page.evaluate(() => document.fonts.ready);
  // Espera a que carguen las imágenes que están en pantalla (las demás son lazy).
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            return r.bottom > 0 && r.top < innerHeight && r.width > 0;
          })
          .every((img) => img.complete),
      null,
      { timeout: 10000 },
    )
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function loadAllLazyImages(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function audit(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const brokenImages = [...document.images]
      .filter((img) => img.complete && img.naturalWidth === 0 && img.getBoundingClientRect().width > 0)
      .map((img) => img.currentSrc || img.src);
    return { overflowX: document.documentElement.scrollWidth - vw, brokenImages };
  });
}

async function shot(page, slug, { fullPage = false, note } = {}) {
  counter += 1;
  const file = `${String(counter).padStart(2, "0")}-${slug}.png`;
  await settle(page);
  const checks = await audit(page);
  await page.screenshot({ path: join(OUT, file), fullPage });
  report.push({
    file,
    url: page.url(),
    fullPage,
    note: note || null,
    ...checks,
    consoleErrors: [...page._log.console],
    pageErrors: [...page._log.pageErrors],
    failedRequests: [...page._log.failed],
  });
  page._log.console.length = 0;
  page._log.pageErrors.length = 0;
  page._log.failed.length = 0;
  console.log(file);
  return file;
}

async function scrollToSection(page, selector) {
  await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(150);
}

async function openHome(page) {
  await page.goto(SITE + "/", { waitUntil: "networkidle" });
  await page.locator(".product-card").first().waitFor();
}

const card = (page, name) => page.locator(".product-card", { has: page.getByRole("heading", { name, exact: true }) });

async function addToCart(page, name, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await card(page, name).getByRole("button", { name: /Agregar|Agotado/ }).click();
    await page.locator(".drawer-root--open").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".drawer-root--open").waitFor({ state: "detached" });
  }
}

const whatsappText = (href) => decodeURIComponent(new URL(href).searchParams.get("text") || "");

// ---------------------------------------------------------------- storefront
async function storefront(browser, device, suffix) {
  const mobile = suffix === "mobile";
  let { context, page } = await newPage(browser, device);
  await openHome(page);

  await shot(page, `home-${suffix}`);
  if (!mobile) {
    await page.evaluate(() => window.scrollTo(0, 40));
    await page.waitForTimeout(150);
    await shot(page, `home-scrolled-${suffix}`, { note: "Desplazada 40 px: la cabecera toma su fondo sólido." });
  }
  await loadAllLazyImages(page);
  await shot(page, `home-full-${suffix}`, { fullPage: true });

  if (mobile) {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.locator(".main-nav--open").waitFor();
    await shot(page, `menu-${suffix}`);
    await page.keyboard.press("Escape");
  } else {
    await scrollToSection(page, ".feature-strip");
    await shot(page, `values-${suffix}`);
  }

  // Secciones de marca, con el carrito todavía vacío.
  await scrollToSection(page, "#historia");
  await shot(page, `story-${suffix}`);
  await scrollToSection(page, "#proceso");
  await shot(page, `process-${suffix}`);
  await scrollToSection(page, ".quote-section");
  await shot(page, `quote-${suffix}`);
  // El final de la lista queda por encima del botón flotante de WhatsApp.
  await page.locator(".faq-list").evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - (innerHeight - 130)));
  await shot(page, `faq-${suffix}`);

  if (mobile) await page.locator(".contact-grid form").evaluate((el) => el.scrollIntoView({ block: "center" }));
  else await scrollToSection(page, "#contacto");
  await page.fill("#name", "Laura");
  await page.fill("#message", "Busco un jabón suave para piel sensible. ¿Cuál me recomiendan?");
  await page.evaluate(() => {
    window.open = (url) => {
      window.__whatsappUrl = url;
      return null;
    };
  });
  await shot(page, `contact-${suffix}`);
  await page.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  const contactUrl = await page.evaluate(() => window.__whatsappUrl);
  notes[`contact-${suffix}`] = { whatsappUrlHost: new URL(contactUrl).host, message: whatsappText(contactUrl) };

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot(page, `footer-${suffix}`);

  // Catálogo.
  await scrollToSection(page, "#coleccion");
  await shot(page, `catalog-${suffix}`);

  await page.getByRole("button", { name: "Botánicos", exact: true }).click();
  await scrollToSection(page, ".category-filter");
  await shot(page, `catalog-filter-${suffix}`);
  await page.getByRole("button", { name: "Todos", exact: true }).click();

  if (!mobile) {
    await card(page, "Cacao & Almendras").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await settle(page);
    await card(page, "Cacao & Almendras").hover();
    await page.waitForTimeout(300);
    counter += 1;
    const file = `${String(counter).padStart(2, "0")}-product-hover-${suffix}.png`;
    report.push({ file, url: page.url(), fullPage: false, note: "Hover sobre la tarjeta: aparece «Agregar».", ...(await audit(page)), consoleErrors: [], pageErrors: [], failedRequests: [] });
    await page.screenshot({ path: join(OUT, file) });
    console.log(file);
  }

  await page.getByRole("button", { name: "Ver ingredientes y beneficios de Cacao & Almendras" }).click();
  await page.locator("dialog[open]").waitFor();
  await shot(page, `product-detail-${suffix}`);
  if (mobile) {
    await page.locator("dialog[open] .product-dialog-footer").scrollIntoViewIfNeeded();
    await shot(page, `product-detail-bottom-${suffix}`);
  }
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Para regalar", exact: true }).click();
  await scrollToSection(page, ".category-filter");
  await shot(page, `catalog-soldout-${suffix}`, { note: "Datos demo: Flor de Ámbar con existencias 0." });
  await page.getByRole("button", { name: "Ver ingredientes y beneficios de Flor de Ámbar" }).click();
  await page.locator("dialog[open]").waitFor();
  if (mobile) await page.locator("dialog[open] .product-dialog-footer").scrollIntoViewIfNeeded();
  await shot(page, `product-soldout-${suffix}`, { note: "Datos demo: Flor de Ámbar con existencias 0." });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Todos", exact: true }).click();

  // Carrito.
  await page.getByRole("button", { name: /^Abrir carrito/ }).click();
  await page.locator(".drawer-root--open").waitFor();
  await shot(page, `cart-empty-${suffix}`);
  await page.keyboard.press("Escape");

  await addToCart(page, "Avena Calma", 2);
  await addToCart(page, "Corazón de Lavanda");
  await addToCart(page, "Café Despierto");
  await page.getByRole("button", { name: /^Abrir carrito/ }).click();
  await page.locator(".drawer-root--open").waitFor();
  const href = await page.locator(".whatsapp-checkout").getAttribute("href");
  notes[`cart-${suffix}`] = { whatsappUrlHost: new URL(href).host, message: whatsappText(href) };
  await shot(page, `cart-${suffix}`);

  // Paso a WhatsApp: sólo se abre la página del enlace (GET); no se envía nada.
  const wa = await context.newPage();
  wa._log = { console: [], pageErrors: [], failed: [] };
  await wa.goto(href, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  notes[`whatsapp-handoff-${suffix}`] = {
    finalUrlHost: new URL(wa.url()).host,
    emojiReplaced: wa.url().includes("%EF%BF%BD"),
  };
  await shot(wa, `whatsapp-handoff-${suffix}`, { note: "Página pública de WhatsApp tras el enlace; no se envió ningún mensaje." });
  await wa.close();
  await page.keyboard.press("Escape");

  // Carrito guardado en otra visita con precio viejo, cantidad mayor al stock
  // y un producto retirado: al cargar el catálogo se corrige y se avisa.
  await page.evaluate(() =>
    localStorage.setItem(
      "delicate-cart-v4",
      JSON.stringify([
        { product: { id: 1, slug: "avena-calma", name: "Avena Calma", price: "300.00", stock: 99 }, quantity: 20 },
        { product: { id: 9999, slug: "producto-retirado", name: "Producto retirado", price: "250.00", stock: 5 }, quantity: 1 },
      ]),
    ),
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".product-card").first().waitFor();
  await page.getByRole("button", { name: /^Abrir carrito/ }).click();
  await page.locator(".cart-notice").waitFor();
  await shot(page, `cart-updated-${suffix}`, { note: "Carrito guardado con precio y cantidad desactualizados (simulado en localStorage)." });
  await context.close();


  // Estados de red: se simulan con Playwright sobre el mismo build.
  ({ context, page } = await newPage(browser, device));
  await page.route("**/api/products/**", () => new Promise(() => {}));
  await page.goto(SITE + "/", { waitUntil: "domcontentloaded" });
  await page.locator(".product-skeleton").first().waitFor();
  await scrollToSection(page, "#coleccion");
  await page.waitForTimeout(400);
  await shotWithoutNetworkIdle(page, `loading-${suffix}`, "API retenida con page.route para mostrar el esqueleto de carga.");
  await context.close();

  ({ context, page } = await newPage(browser, device));
  await page.route("**/api/products/**", (route) => route.abort("connectionrefused"));
  await page.goto(SITE + "/", { waitUntil: "networkidle" });
  await page.locator(".catalog-error").waitFor();
  await scrollToSection(page, "#coleccion");
  await shot(page, `error-${suffix}`, { note: "API cortada con page.route (connection refused)." });
  await context.close();

  ({ context, page } = await newPage(browser, device));
  await page.route("**/api/products/**", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.results = data.results.filter((p) => p.category !== "clasicos");
    data.count = data.results.length;
    await route.fulfill({ response, json: data });
  });
  await openHome(page);
  await page.getByRole("button", { name: "Clásicos", exact: true }).click();
  await page.locator(".catalog-empty").waitFor();
  await scrollToSection(page, "#coleccion");
  await shot(page, `empty-category-${suffix}`, { note: "Respuesta de la API filtrada con page.route: sin productos clásicos." });
  await context.close();
}

async function shotWithoutNetworkIdle(page, slug, note) {
  // La petición del catálogo queda pendiente a propósito; no se espera networkidle.
  counter += 1;
  const file = `${String(counter).padStart(2, "0")}-${slug}.png`;
  await page.evaluate(() => document.fonts.ready);
  const checks = await audit(page);
  await page.screenshot({ path: join(OUT, file) });
  report.push({ file, url: page.url(), fullPage: false, note, ...checks, consoleErrors: [...page._log.console], pageErrors: [...page._log.pageErrors], failedRequests: [] });
  console.log(file);
}

// --------------------------------------------------------------------- admin
async function admin(browser, device, suffix) {
  const { context, page } = await newPage(browser, device);
  await page.goto(ADMIN + "/admin/login/", { waitUntil: "networkidle" });
  await shot(page, `admin-login-${suffix}`);
  await page.fill("#id_username", ADMIN_EMAIL);
  await page.fill("#id_password", ADMIN_PASSWORD);
  await Promise.all([page.waitForURL(ADMIN + "/admin/"), page.getByRole("button", { name: /Iniciar sesión|Log in/ }).click()]);
  await shot(page, `admin-index-${suffix}`);

  await page.goto(ADMIN + "/admin/shop/product/", { waitUntil: "networkidle" });
  await shot(page, `admin-products-${suffix}`, { fullPage: suffix === "desktop" });

  if (suffix === "desktop") {
    await page.getByRole("button", { name: "Botánicos" }).or(page.getByRole("link", { name: "Botánicos" })).first().click();
    await page.waitForLoadState("networkidle");
    await shot(page, `admin-products-filter-${suffix}`);

    await page.goto(ADMIN + "/admin/shop/product/", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Cacao & Almendras", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await shot(page, `admin-product-edit-${suffix}`, { fullPage: true });

    await page.goto(ADMIN + "/admin/contact/contactmessage/", { waitUntil: "networkidle" });
    await shot(page, `admin-messages-${suffix}`, { note: "Mensajes demo con correos @example.com." });
    await page.goto(ADMIN + "/admin/contact/newslettersubscription/", { waitUntil: "networkidle" });
    await shot(page, `admin-newsletter-${suffix}`, { note: "Suscripciones demo con correos @example.com." });
  }
  await context.close();
}

// ------------------------------------------------------------- not-found page
// En local Django corre con DEBUG=True y mostraría su página técnica; la
// respuesta real a una ruta inexistente se toma de producción (sólo lectura).
const PRODUCTION = process.env.DEMO_PRODUCTION_URL || "https://delicate.jonasjavier.dev";
async function notFound(browser) {
  const { context, page } = await newPage(browser, DESKTOP);
  await page.goto(PRODUCTION + "/pagina-que-no-existe/", { waitUntil: "networkidle" });
  await shot(page, "not-found-desktop", { note: "Ruta inexistente en producción (GET de sólo lectura)." });
  await context.close();
}

// --lang hace que los controles nativos (p. ej. el selector de archivo) salgan en español.
const browser = await chromium.launch({ args: ["--lang=es-DO"] });
try {
  await storefront(browser, DESKTOP, "desktop");
  await admin(browser, DESKTOP, "desktop");
  await storefront(browser, MOBILE, "mobile");
  await admin(browser, MOBILE, "mobile");
  await notFound(browser);
} finally {
  await browser.close();
  writeFileSync(REPORT, JSON.stringify({ capturedAt: new Date().toISOString(), site: SITE, admin: ADMIN, shots: report, whatsappMessages: notes }, null, 2));
}
