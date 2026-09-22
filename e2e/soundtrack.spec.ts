import { expect, test } from "@playwright/test";

test("audio starts by default and survives route navigation with the same media", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/audio/")) requests.push(request.url()); });
  // Observe the real media constructor, preserving native decoding/playback.
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const media: HTMLAudioElement[] = [];
    Object.assign(window, { soundtrackMedia: media });
    window.Audio = class extends NativeAudio {
      constructor() { super(); media.push(this); }
    };
  });
  await page.goto("/es?no3d=1");
  const control = page.getByRole("complementary", { name: "Banda sonora" });
  const audioButton = control.locator('summary[aria-label="Audio"]');
  await expect(audioButton).toBeVisible();
  await expect(control).toHaveAttribute("data-playing", "true", { timeout: 15000 });
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Proyectos Endurance", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/proyectos$/);
  await expect(control).toHaveAttribute("data-playing", "true");
  const mediaState = await page.evaluate(() => {
    const media = (window as unknown as { soundtrackMedia: HTMLAudioElement[] }).soundtrackMedia;
    return { count: media.length, paused: media[0].paused, time: media[0].currentTime };
  });
  expect(mediaState.count).toBe(1);
  expect(mediaState.paused).toBe(false);
  expect(mediaState.time).toBeGreaterThan(0);
  if (!(await control.getByRole("button", { name: "Pausar música" }).isVisible())) await audioButton.click();
  await control.getByRole("button", { name: "Pausar música" }).click();
  await expect(control).toHaveAttribute("data-playing", "false");
  await expect(control.getByText("Audio detenido")).toBeVisible();
});

test("volume controls support keyboard, mute and Escape", async ({ page }) => {
  await page.goto("/es?no3d=1");
  const settings = page.locator('summary[aria-label="Audio"]');
  await settings.focus();
  await page.keyboard.press("Enter");
  const volume = page.getByRole("slider", { name: "Volumen" });
  await expect(volume).toBeVisible();
  await volume.focus();
  await page.keyboard.press("ArrowRight");
  await expect(volume).toHaveValue("29");
  await page.getByRole("button", { name: "Silenciar", exact: true }).click();
  const restore = page.getByRole("button", { name: "Restaurar sonido" });
  await expect(restore).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".soundtrack")).toHaveAttribute("data-muted", "true");
  await expect(page.getByText("Silenciado")).toBeVisible();
  await restore.click();
  await expect(page.getByRole("button", { name: "Silenciar", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".soundtrack")).toHaveAttribute("data-muted", "false");
  await expect(page.getByText("Reproduciendo")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(volume).toBeHidden();
  await expect(settings).toBeFocused();
});

test("audio failure is recoverable and leaves navigation usable", async ({ page }) => {
  await page.route("**/audio/**", (route) => route.abort());
  await page.goto("/es?no3d=1");
  await page.locator('summary[aria-label="Audio"]').click();
  await expect(page.getByRole("button", { name: "Reintentar música" })).toBeVisible();
  await expect(page.locator('.soundtrack > [role="status"]')).toContainText("No se pudo reproducir");
  await page.unroute("**/audio/**");
  await page.getByRole("button", { name: "Reintentar música" }).click();
  await expect(page.locator(".soundtrack")).toHaveAttribute("data-playing", "true", { timeout: 15000 });
  await page.getByRole("link", { name: "Proyectos Endurance", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Proyectos y sistemas");
});

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1440, height: 900 }]) {
  test(`audio controls remain reachable at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/es?no3d=1");
    const audioButton = page.locator('summary[aria-label="Audio"]');
    for (const control of [audioButton]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
    }
    await audioButton.click();
    await expect(page.getByRole("button", { name: /^(Activar|Pausar|Reintentar) música$/ })).toBeVisible();
    const panel = await page.locator(".soundtrack__panel").boundingBox();
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height);
  });
}
