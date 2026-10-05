import { expect, test } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`sandbox receipt and evidence export at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/payment-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">import "/e2e/payment-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/payment-preview");
    await page.getByText("Payment activity & receipts", { exact: true }).click();
    await expect(page.getByRole("status")).toContainText("US$2592.38");
    await expect(page.getByRole("status")).toContainText("£2000.00");
    await expect(page.locator("main")).toContainText("5000.00 → 2407.62");
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download execution evidence" })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "movewise-sandbox-evidence.json",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `/tmp/movewise-payment-evidence-${width}.png`,
      fullPage: true,
    });
  });
}
