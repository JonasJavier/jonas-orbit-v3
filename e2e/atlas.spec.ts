import { expect, test } from "@playwright/test";

const formats = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 812, height: 375 },
  { width: 1440, height: 860 },
  { width: 1920, height: 1080 },
];

for (const viewport of formats) {
  test(`atlas: six reachable destinations at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es?no3d=1");
    const rail = page.locator(".nav-rail");
    await expect(rail.getByRole("link")).toHaveCount(6);
    const controls = await rail.getByRole("link").all();
    for (const link of controls) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    const bodies = await page.locator("[data-flat-world]").all();
    const railBounds = await rail.boundingBox();
    for (const body of bodies) {
      const box = await body.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(40);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThan(railBounds!.y);
    }
    const proxies = await page.locator(".system-map__hit-target").evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { id: node.getAttribute("data-world"), x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    for (const p of proxies) {
      expect(p.w, p.id ?? "target").toBeGreaterThanOrEqual(44);
      expect(p.h, p.id ?? "target").toBeGreaterThanOrEqual(44);
      const topmost = await page.evaluate(({ x, y, w, h }) =>
        document.elementFromPoint(x + w / 2, y + h / 2)?.getAttribute("data-world"), p);
      expect(topmost, `occluded ${p.id}`).toBe(p.id);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
  });
}

test("rail explains content at rest and reveals the world on focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es?no3d=1");
  const projects = page.locator('[data-rail-world="endurance"]');
  await expect(projects.locator(".nav-rail__name")).toHaveText("Proyectos", { ignoreCase: true });
  await expect(projects.locator(".nav-rail__role")).toHaveCSS("opacity", "0");
  await projects.focus();
  /* El modo de hover por defecto es `sencillo` desde el 2026-09-21 (ver
     lib/map-hover.ts): el raíl marca la entrada apuntada y NO enciende el
     panel de adquisición. Lo que este test protege es que el nombre cósmico
     siga apareciendo al enfocar, que es lo que le da sentido al raíl. */
  await expect(projects.locator("..")).toHaveAttribute("data-map-hover", "true");
  await expect(projects).toHaveAttribute("data-target-state", "idle");
  await expect(projects.locator(".nav-rail__role")).toHaveText("Endurance", { ignoreCase: true });
  await expect(projects.locator(".nav-rail__role")).toHaveCSS("opacity", "0.95");
  await projects.press("Enter");
  await expect(page).toHaveURL(/\/es\/proyectos$/);
});
