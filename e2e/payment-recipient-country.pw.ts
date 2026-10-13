import { test, expect } from "@playwright/test";
for (const width of [390, 1280]) {
  test(`university picker follows Pay to country at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/recipient-preview?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/recipient-preview?currency=USD&home=United%20Kingdom");
    await page.getByRole("combobox", { name: "Pay to", exact: true }).click();
    await page.getByRole("option", { name: /China/ }).click();
    const amount = await page
      .getByRole("spinbutton", { name: "Tuition amount in CNY", exact: true })
      .getAttribute("aria-valuenow");
    await expect(page.locator(".payment-comparison-recipient")).toContainText(
      "Choose your university",
    );
    await page.getByRole("button", { name: "Edit tuition details" }).click();
    await expect(
      page.locator(".payment-settings-dialog").getByRole("spinbutton"),
    ).toHaveAttribute("aria-valuenow", amount!);
    await page
      .getByRole("combobox", { name: "University / recipient" })
      .click();
    await expect(page.getByPlaceholder(/Search in China/)).toBeVisible();
    await expect(page.getByRole("option", { name: /UCLA/ })).toHaveCount(0);
    await page
      .getByRole("option", { name: "Tsinghua University", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    await expect(page.locator(".payment-settings-dialog")).toHaveCount(0);
  });
}
