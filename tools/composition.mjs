/**
 * Dónde cae cada destino en pantalla, medido sobre la escena de verdad.
 *
 * Una captura dice si la composición funciona; no dice por cuánto. Al mover un
 * cuerpo hay que poder responder «Gargantúa queda a 62 px» sin contar píxeles a
 * ojo sobre un PNG, y sobre todo hay que poder comprobar que el cambio hizo lo
 * que se pretendía y no otra cosa parecida.
 *
 * No reimplementa la proyección: la LEE. La escena publica la posición de cada
 * cuerpo en las variables CSS `--map-x` / `--map-y` / `--map-radius` de su hueco
 * del mapa, así que lo que sale aquí es exactamente lo que dibuja el navegador.
 * Una copia de la trigonometría de `system-scene.ts` se desincronizaría el día
 * que alguien tocara la pose, y entonces mentiría en silencio.
 *
 * Uso:
 *   npm run build && npx next start -p 3100
 *   node tools/composition.mjs [url] [ancho] [alto]
 */
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3100/es";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 860);

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.on("pageerror", (error) => console.error("[page error]", error.message));
await page.addInitScript(() =>
  // `reducir-efectos = "false"` es lo que lee `useForcedEffects()`. La clave
  // anterior, `efectos-forzados`, no la lee nadie desde el pase de movimiento
  // unificado: con ella esta herramienta medía el perfil plano.
  localStorage.setItem("jonas-orbit:reducir-efectos", "false"),
);
await page.goto(url, { waitUntil: "load", timeout: 120000 });
/*
  La transición de entrada mueve la cámara: medir antes daría una pose de paso.
  El sondeo va por `setInterval` y no por el `raf` que Playwright usa por
  defecto — el bucle de render no suelta el rAF ni un fotograma, así que la
  espera se quedaba colgada esperando su turno.
*/
await page.waitForFunction(
  () => document.documentElement.dataset.sceneLive === "true",
  null,
  { timeout: 120000, polling: 500 },
);
await page.waitForTimeout(12000);

const bodies = await page.evaluate(() => {
  const read = (slot, name) =>
    Number.parseFloat(slot.style.getPropertyValue(name)) || 0;
  return [...document.querySelectorAll(".system-map__slot")].map((slot) => ({
    id: slot.querySelector("[data-world]")?.dataset.world ?? "?",
    x: read(slot, "--map-x"),
    y: read(slot, "--map-y"),
    radius: read(slot, "--map-radius"),
    offscreen: slot.dataset.offscreen === "true",
  }));
});

await browser.close();

const centre = bodies.find((body) => body.id === "gargantua");
const pad = (text, size) => String(text).padEnd(size);
const num = (value, size = 7) => value.toFixed(1).padStart(size);

console.log(`viewport ${width}×${height}`);
console.log(
  pad("destino", 16) +
    "      x      y      r   " +
    pad("% ancho", 9) +
    pad("% alto", 9) +
    "dist. a Gargantúa",
);

for (const body of bodies) {
  const dx = centre ? body.x - centre.x : 0;
  const dy = centre ? body.y - centre.y : 0;
  const gap = Math.hypot(dx, dy);
  console.log(
    pad(body.id, 16) +
      num(body.x) +
      num(body.y) +
      num(body.radius) +
      "   " +
      pad(((body.x / width) * 100).toFixed(1), 9) +
      pad(((body.y / height) * 100).toFixed(1), 9) +
      (centre && body.id !== "gargantua"
        ? `${gap.toFixed(0)} px  (Δx ${dx.toFixed(0)}, Δy ${dy.toFixed(0)})`
        : "—") +
      (body.offscreen ? "   FUERA DE CUADRO" : ""),
  );
}
