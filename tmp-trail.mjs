import { chromium } from "@playwright/test";
const name = process.argv[2] ?? "rastro";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport:{width:1440,height:860}, deviceScaleFactor:1, reducedMotion:"no-preference" });
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem("jonas-orbit:efectos-forzados","true");
  localStorage.setItem("jonas-orbit:banco-visual", JSON.stringify({ reloj: 0 }));
});
await page.goto("http://localhost:3100/es", { waitUntil:"load", timeout:120000 });
await page.waitForTimeout(13000);
// Barrido dentro de la página: los eventos sintéticos de CDP llegan con un
// timeStamp que la capa lee como «hace muchísimo», así que la velocidad sale 0
// y no siembra nada. Un PointerEvent construido aquí toma performance.now().
const active = await page.evaluate(async () => {
  const step = (x, y) => {
    const target = document.elementFromPoint(x, y) ?? document.body;
    target.dispatchEvent(new PointerEvent("pointermove", {
      clientX: x, clientY: y, bubbles: true, pointerType: "mouse",
    }));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const seen = [];
  let last = null;
  window.addEventListener("pointermove", (e) => {
    if (last) {
      const dt = Math.max(8, e.timeStamp - last.t);
      seen.push({
        dt: +dt.toFixed(1),
        v: +(Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt).toFixed(3),
        tipo: e.pointerType,
        target: (e.target instanceof Element ? e.target.className : "?") + "",
      });
    }
    last = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  }, { passive: true });
  for (let i = 0; i <= 30; i += 1) {
    const t = i / 30;
    step(420 + t * 620, 620 - Math.sin(t * Math.PI) * 300);
    await wait(14);
  }
  await new Promise((r) => setTimeout(r, 40));
  return JSON.stringify({
    activas: document.querySelector(".site-stardust")?.getAttribute("data-active-particles"),
    oculto: document.hidden,
    visibilidad: document.visibilityState,
    lienzo: (() => {
      const c = document.querySelector(".site-stardust");
      if (!(c instanceof HTMLCanvasElement)) return "?";
      const g = c.getContext("2d");
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let on = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) on += 1;
      return `${on} px con alfa`;
    })(),
    muestras: seen.length,
    primeras: seen.slice(0, 3),
    ultima: seen[seen.length - 1],
  });
});
console.log("motas vivas:", active);
await page.screenshot({ path: `.shots/${name}.png`, timeout: 180000 });
await browser.close();
console.log(`.shots/${name}.png`);
