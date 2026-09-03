/**
 * ¿Se solapa alguna etiqueta —o su cuerpo— con la sombra de Gargantúa?
 *
 * Es la pregunta que el invariante de "4 radios de sombra" intenta responder
 * por procuración, con una fórmula. Aquí se responde directamente sobre el DOM
 * ya posicionado por la escena.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await ctx.newPage();
await page.addInitScript(() =>
  localStorage.setItem("jonas-orbit:efectos-forzados", "true"),
);
await page.goto("http://localhost:3000/es", { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(15000);

const data = await page.evaluate(() => {
  const out = { slots: [], labels: [] };
  for (const el of document.querySelectorAll("*")) {
    const s = el.style;
    if (!s || !s.getPropertyValue("--map-x")) continue;
    const id =
      el.getAttribute("data-world") ??
      el.getAttribute("data-id") ??
      el.textContent.trim().slice(0, 24);
    out.slots.push({
      id,
      x: parseFloat(s.getPropertyValue("--map-x")),
      y: parseFloat(s.getPropertyValue("--map-y")),
      r: parseFloat(s.getPropertyValue("--map-radius")),
      sx: parseFloat(s.getPropertyValue("--map-label-shift-x") || "0"),
      sy: parseFloat(s.getPropertyValue("--map-label-shift-y") || "0"),
    });
    for (const t of el.querySelectorAll("*")) {
      const txt = (t.textContent ?? "").trim();
      if (!txt || t.children.length) continue;
      const b = t.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) continue;
      out.labels.push({
        id,
        txt: txt.slice(0, 20),
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
        vis: getComputedStyle(t).visibility,
        op: getComputedStyle(t).opacity,
      });
    }
  }
  return out;
});
await browser.close();

const g = data.slots.find((s) => /gargant/i.test(s.id));
console.log("slots posicionados por la escena:");
for (const s of data.slots) {
  console.log(
    `  ${String(s.id).padEnd(18)} x=${s.x.toFixed(0).padStart(5)} y=${s.y.toFixed(0).padStart(4)} r=${s.r.toFixed(0).padStart(3)}  desplaz etiqueta (${s.sx.toFixed(0)},${s.sy.toFixed(0)})`,
  );
}
if (g) {
  console.log(`\nGargantua: centro (${g.x.toFixed(0)}, ${g.y.toFixed(0)}) radio proxy ${g.r.toFixed(1)} px`);
  for (const s of data.slots) {
    if (s === g) continue;
    const d = Math.hypot(s.x - g.x, s.y - g.y);
    console.log(
      `  ${String(s.id).padEnd(18)} distancia al centro ${d.toFixed(0).padStart(4)} px  ·  hueco cuerpo-sombra ${(d - s.r - g.r).toFixed(0).padStart(4)} px`,
    );
  }
}
console.log("\netiquetas visibles:");
for (const l of data.labels) {
  if (l.op === "0" || l.vis === "hidden") continue;
  const cx = l.x + l.w / 2;
  const cy = l.y + l.h / 2;
  const d = g ? Math.hypot(cx - g.x, cy - g.y) : NaN;
  console.log(
    `  ${l.txt.padEnd(20)} caja ${l.w.toFixed(0)}x${l.h.toFixed(0)} en (${l.x.toFixed(0)},${l.y.toFixed(0)})  centro a ${d.toFixed(0)} px de la sombra`,
  );
}
