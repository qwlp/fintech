import { expect, test } from "@playwright/test";
for (const width of [320, 390, 1440]) {
  test(`mobile payments fit and navigate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/mobile-payments?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/mobile-payments?currency=CNY");
    await expect(page.getByRole("tab")).toHaveCount(3);
    expect(
      await page
        .locator(".payment-workspace-tabs")
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThan(70);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/movewise-mobile-payments-${width}.png`,
      fullPage: true,
    });
    await expect(page.getByRole("tab", { name: "Receipts" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Calculator" })).toHaveCount(0);
    await page.getByRole("button", { name: "Edit tuition details" }).click();
    await expect(
      page.getByRole("dialog", { name: "Edit tuition details", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".brief-edit-form")).toBeVisible();
    await page
      .getByRole("combobox", { name: "University / recipient" })
      .click();
    await expect(page.getByRole("option")).toHaveText([
      "Tsinghua University",
      "Peking University",
      "Zhejiang University",
    ]);
    await expect
      .poll(() =>
        page.getByRole("textbox", { name: "Search universities" }).evaluate(
          (input) => {
            const rect = input.getBoundingClientRect();
            return document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
            ) === input;
          },
        ),
      )
      .toBe(true);
    await page
      .getByRole("textbox", { name: "Search universities" })
      .fill("Harvard");
    await expect(page.getByRole("option")).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Search universities" })
      .fill("Peking");
    await page
      .getByRole("option", { name: "Peking University", exact: true })
      .click();
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".payment-comparison-recipient")).toContainText(
      "Peking University",
    );
    await page.getByRole("tab", { name: "Balances" }).click();
    await expect(page.getByRole("tab", { name: "Balances" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });
}
