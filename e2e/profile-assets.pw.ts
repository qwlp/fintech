import { test, expect, type Page } from "@playwright/test";
async function preview(page: Page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.route("**/profile-assets-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="app-clean" style="padding:24px"><div id="root"></div></main><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;import '/src/styles/app-clean.css';</script><script type="module" src="/e2e/destinations-profile-preview.tsx"></script></body></html>`,
    }),
  );
  await page.goto("/profile-assets-preview");
}
for (const width of [390, 1440]) {
  test(`account removal confirms, preserves funding and recovers from failure at ${width}px`, async ({
    page,
  }) => {
    await preview(page, width);
    const remove = page.getByRole("button", {
      name: "Remove Bank of America ending 1233",
      exact: true,
    });
    await remove.click();
    await expect(page.getByRole("alertdialog")).toContainText("•••• 1233");
    await page
      .getByRole("button", { name: "Keep account", exact: true })
      .click();
    await expect(page.locator(".linked-account-row")).toHaveCount(1);
    await remove.click();
    await page.evaluate(() => {
      (window as any).failAccountRemoval = true;
    });
    await page
      .getByRole("button", { name: "Remove account", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Couldn’t remove");
    await expect(page.locator(".linked-account-row")).toHaveCount(1);
    await page.evaluate(() => {
      (window as any).failAccountRemoval = false;
    });
    await page
      .getByRole("button", { name: "Remove account", exact: true })
      .click();
    await expect(page.locator(".linked-account-row")).toHaveCount(0);
    await expect(page.locator(".country-account-hint")).toBeVisible();
    await expect(page.locator(".profile-funding")).toContainText("£1,000");
    expect(await page.evaluate(() => (window as any).removedAccount)).toEqual({
      id: "bank-one",
      country: "United States",
      label: "Bank of America · Bank account · •••• 1233 · Manual",
      index: 0,
    });
  });
  test(`profile photo validates, previews, uploads and removes at ${width}px`, async ({
    page,
  }) => {
    await preview(page, width);
    await page
      .getByRole("button", { name: "Change profile picture", exact: true })
      .click();
    const input = page.getByLabel("Choose profile picture", { exact: true });
    await input.setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    });
    await expect(page.getByRole("alert")).toContainText("JPG, PNG or WebP");
    await input.setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole("alert")).toContainText("smaller than 5 MB");
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#244b75";
      ctx.fillRect(0, 0, 120, 80);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const file = {
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    };
    await input.setInputFiles(file);
    await expect(
      page.getByRole("button", { name: "Save photo", exact: true }),
    ).toBeEnabled();
    await page
      .locator(".profile-photo-preview img")
      .evaluate((img) => (img as HTMLImageElement).decode());
    await page.evaluate(() => {
      (window as any).failPhotoUpload = true;
    });
    await page.getByRole("button", { name: "Save photo", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Couldn’t upload");
    await page.evaluate(() => {
      (window as any).failPhotoUpload = false;
    });
    await page.getByRole("button", { name: "Save photo", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".profile-avatar img")).toHaveCount(1);
    const saved = await page.evaluate(() => (window as any).savedPhoto);
    expect(saved.type).toBe("image/jpeg");
    expect(saved.size).toBeLessThan(1024 * 1024);
    const first = await page.locator(".profile-avatar img").getAttribute("src");
    await page
      .getByRole("button", { name: "Change profile picture", exact: true })
      .click();
    await input.setInputFiles(file);
    await page.getByRole("button", { name: "Save photo", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.locator(".profile-avatar img").getAttribute("src"),
    ).not.toBe(first);
    await page
      .getByRole("button", { name: "Change profile picture", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove photo", exact: true })
      .click();
    await expect(page.locator(".profile-avatar img")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
