#!/usr/bin/env node
/**
 * Cuánto tarda de verdad en llegar un mundo, con la red lenta.
 *
 *   node tools/nav-latency.mjs [base] [--red=lenta|3g|4g|ninguna] [--modo=3d|2d]
 *                              [--desde=home|header] [--sin-apuntar] [--apuntar-ms=400]
 *                              [--solo=<trozo de ruta>] [--detalle] [--runs=N]
 *
 * Contra `next start` (por defecto en :3300), nunca contra `npm run dev`.
 * `--detalle` imprime la cascada de peticiones de cada viaje.
 *
 * Abre la home (o una página con cabecera), aplica la red por CDP DESPUÉS de
 * la carga inicial —lo que se mide es el viaje, no la primera visita—, apunta
 * al destino un rato (o lo toca sin apuntar, como un dedo) y hace clic. Anota
 * en el reloj de la página: el clic, cada fase de `data-voyage`, cuándo cambia
 * la URL y cuándo aparece el `<main>` del destino; y cuántos bytes pidió.
 *
 * Las cifras que importan: `rutaEnLuzFuera` —la ruta que había en pantalla
 * cuando la luz se retiró; si es la de salida, la travesía devolvió al
 * visitante a la página vieja («hace la animación y vuelve a la escena»)— y
 * `url`, ms desde el clic hasta que la página nueva está montada. `espera` es
 * cuándo se encendió la espera (sólo con la red lenta), `longMax` la tarea
 * más larga del hilo principal tras el clic.
 */
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3300";
const redName = opt("red", "lenta");
const modo = opt("modo", "3d");
const desde = opt("desde", "home");
const runs = Number(opt("runs", "1"));
const apuntar = !args.includes("--sin-apuntar");
const only = opt("solo", "");

// Perfiles de DevTools: «Slow 4G» (antes Fast 3G) y «3G» (antes Slow 3G).
const REDES = {
  ninguna: null,
  "4g": { latency: 165, downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (1500 * 1024) / 8 },
  lenta: { latency: 563, downloadThroughput: (1600 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 },
  "3g": { latency: 2000, downloadThroughput: (400 * 1024) / 8 * 0.9, uploadThroughput: (400 * 1024) / 8 * 0.9 },
};
const red = REDES[redName];

const HOME_TARGETS = [
  ["gargantua", "/es/sobre-mi"],
  ["miller", "/es/formacion"],
  ["endurance", "/es/proyectos"],
  ["edmunds", "/es/creatividad"],
  ["tesseract", "/es/experimentos"],
  ["ranger", "/es/contacto"],
];
const HEADER_TRIPS = [
  ["/es/formacion", "/es/experimentos"],
  ["/es/formacion", "/es/contacto"],
  ["/es/creatividad", "/es/experimentos"],
  ["/es/creatividad", "/es/contacto"],
  ["/es/creatividad", "/es/proyectos"],
  ["/es/experimentos", "/es/sobre-mi"],
  ["/es/contacto", "/es/formacion"],
];

const browser = await chromium.launch({
  headless: false,
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars"],
});

const INSTRUMENT = () => {
  const log = [];
  window.__nav = { log, longtasks: [] };
  const mark = (what) => log.push([what, Math.round(performance.now()), location.pathname]);
  new MutationObserver(() => {
    mark(`voyage:${document.documentElement.dataset.voyage ?? "idle"}`);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-voyage"] });
  let path = location.pathname;
  const tick = () => {
    if (location.pathname !== path) {
      path = location.pathname;
      mark("url");
    }
    setTimeout(tick, 10);
  };
  tick();
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__nav.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: "longtask", buffered: false });
  } catch {}
};

async function trip(page, cdp, { from, to, selector }) {
  await page.goto(base + from, { waitUntil: "load" });
  if (modo === "3d" && from.split("/").length === 2) {
    await page.waitForFunction(() => document.documentElement.dataset.sceneLive === "true", null, { timeout: 30000 }).catch(() => {});
  }
  await page.waitForTimeout(2500);
  const bytes = { n: 0, total: 0, kinds: {} };
  const detalle = [];
  const reqStart = new Map();
  const onReq = (e) => reqStart.set(e.requestId, e);
  const onFin = (e) => {
    const r = reqStart.get(e.requestId);
    if (!r) return;
    if (args.includes("--detalle")) detalle.push([r.timestamp, e.timestamp, r.type, Math.round(e.encodedDataLength / 1024), r.request.url.replace(base, "").slice(0, 90)]);
    bytes.n += 1;
    bytes.total += e.encodedDataLength;
    const k = r.type;
    bytes.kinds[k] = (bytes.kinds[k] ?? 0) + e.encodedDataLength;
  };
  cdp.on("Network.requestWillBeSent", onReq);
  cdp.on("Network.loadingFinished", onFin);
  if (red) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...red });

  await page.evaluate(INSTRUMENT);
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const box = await el.boundingBox();
  if (!box) throw new Error(`sin caja: ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (apuntar) {
    await page.mouse.move(x, y, { steps: 4 });
    await page.waitForTimeout(Number(opt("apuntar-ms", "400")));
  }
  const clickAt = await page.evaluate(() => Math.round(performance.now()));
  await page.mouse.click(x, y);

  // Hasta que la ruta llegue y la travesía termine, o 40 s.
  await page
    .waitForFunction(
      (target) => location.pathname === target && !document.documentElement.dataset.voyage,
      to,
      { timeout: 40000, polling: 50 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => window.__nav);
  cdp.off("Network.requestWillBeSent", onReq);
  cdp.off("Network.loadingFinished", onFin);
  if (red) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  if (args.includes("--detalle")) {
    const t0 = Math.min(...detalle.map((d) => d[0]));
    for (const [a, b, type, kb, url] of detalle.sort((x, y) => x[0] - y[0])) {
      console.log(`  ${String(Math.round((a - t0) * 1000)).padStart(6)} → ${String(Math.round((b - t0) * 1000)).padStart(6)} ms  ${type.padEnd(10)} ${String(kb).padStart(4)} KB  ${url}`);
    }
  }
  const rel = (what) => {
    const hit = nav.log.find(([w]) => w === what);
    return hit ? hit[1] - clickAt : null;
  };
  const urlAt = rel("url");
  const arriveAt = rel("voyage:arrive");
  const arrivePath = nav.log.find(([w]) => w === "voyage:arrive")?.[2];
  const lt = nav.longtasks.filter(([s]) => s >= clickAt);
  return {
    from,
    to,
    flash: rel("voyage:flash"),
    espera: rel("voyage:wait"),
    luzFuera: arriveAt,
    rutaEnLuzFuera: arrivePath,
    url: urlAt,
    huecoLuzRuta: arriveAt != null && urlAt != null ? urlAt - arriveAt : null,
    kb: Math.round(bytes.total / 1024),
    kinds: Object.fromEntries(Object.entries(bytes.kinds).map(([k, v]) => [k, Math.round(v / 1024)])),
    reqs: bytes.n,
    longMax: lt.reduce((m, [, d]) => Math.max(m, d), 0),
    longSum: lt.reduce((m, [, d]) => m + d, 0),
  };
}

const results = [];
for (let r = 0; r < runs; r += 1) {
  const list =
    desde === "home"
      ? HOME_TARGETS.map(([id, to]) => ({ from: "/es", to, selector: `[data-system-body="${id}"]` }))
      : HEADER_TRIPS.map(([from, to]) => ({ from, to, selector: `.site-header a[href="${to}"]` }));
  for (const item of list) {
    if (only && !item.to.includes(only)) continue;
    // Contexto nuevo por viaje: caché vacía, como quien llega a ese mundo por primera vez.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((value) => {
      try {
        localStorage.setItem("jonas-orbit:reducir-efectos", value);
      } catch {}
    }, modo === "3d" ? "false" : "true");
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    try {
      const res = await trip(page, cdp, item);
      results.push(res);
      console.log(JSON.stringify(res));
    } catch (error) {
      console.log(JSON.stringify({ ...item, error: String(error).slice(0, 200) }));
    }
    await context.close();
  }
}
await browser.close();
