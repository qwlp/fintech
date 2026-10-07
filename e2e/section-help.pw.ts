import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`section help at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/section-help-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">
      import "/e2e/section-help-preview.tsx";
      </script></body></html>`,
      }),
    );
    await page.goto("/section-help-preview");
    for (const section of [
      "Dashboard",
      "Move Planner",
      "AI Agent",
      "Payments",
      "Sponsors",
      "Security",
    ]) {
      await page
        .getByRole("button", { name: `About ${section}`, exact: true })
        .click();
      const help = page.getByRole("dialog", {
        name: `About ${section}`,
        exact: true,
      });
      await expect(help).toBeVisible();
      await expect(help.locator("p")).not.toBeEmpty();
      const box = await help.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(new URL(page.url()).hash).toBe("");
      await page.keyboard.press("Escape");
      await expect(help).not.toBeVisible();
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await page
      .getByRole("button", { name: "About Payments", exact: true })
      .click();
    await page.screenshot({ path: `/tmp/section-help-${width}.png` });
    await page.getByRole("button", { name: "Close section help" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}
