import { expect, test } from "@playwright/test";

test.describe("Ranger · cabina", () => {
  test("canales y formulario accesibles, sin desbordamiento en cuatro tamaños", async ({ page }) => {
    await page.goto("/es/contacto?no3d=1");
    for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const name of [/01 \/ CORREO/, /02 \/ WHATSAPP/, /03 \/ TELÉFONO/]) {
        const channel = page.getByRole("link", { name });
        await channel.scrollIntoViewIfNeeded();
        await expect(channel).toBeVisible();
        const bounds = await channel.boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    await page.getByRole("link", { name: "Escribir un mensaje" }).click();
    await expect(page).toHaveURL(/#transmision$/);
    await expect(page.getByRole("form", { name: "Enviar un mensaje a Jonás" })).toBeVisible();
    await page.getByLabel("Nombre", { exact: true }).fill("Ada");
  });

  test("baliza por teclado, respuesta finita y movimiento reducido reversible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/es/contacto");
    const beacon = page.getByRole("button", { name: "Probar señal" });
    await beacon.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Buscando el eco…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Repetir señal" })).toBeVisible();
    await expect(page.getByText(/Prueba recibida/)).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("region", { name: "Cabina de comunicaciones de Ranger" })).toHaveAttribute("data-motion", "false");
    await page.getByRole("button", { name: "Repetir señal" }).click();
    await expect(page.getByText(/Prueba recibida/)).toBeVisible();
    expect(await page.locator(".ranger-beacon__rings i").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("sin JavaScript mantiene los tres canales, CV y contenido real", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    try {
      const page = await context.newPage();
      await page.goto("/es/contacto");
      await expect(page.getByRole("heading", { level: 1, name: "Contacto" })).toBeVisible();
      await expect(page.getByRole("link", { name: /01 \/ CORREO/ })).toHaveAttribute("href", "mailto:jonasjavier.dev@gmail.com");
      await expect(page.getByRole("link", { name: /03 \/ TELÉFONO/ })).toHaveAttribute("href", "tel:+18498625049");
      await expect(page.getByRole("link", { name: /02 \/ WHATSAPP/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /CV español/ })).toBeVisible();
      await expect(page.getByText(/Para enviar el formulario necesitas JavaScript/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Probar señal" })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
  });
});
