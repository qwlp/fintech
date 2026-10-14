import { expect, test } from "@playwright/test";
for (const width of [390, 1280]) {
  test(`rate, quote totals and graph stay consistent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/rate-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/payment-rate-preview.tsx";</script></body></html>`,
      }),
    );
    let separateFetches = 0;
    await page.route("https://api.frankfurter.dev/**", (route) => {
      separateFetches++;
      return route.abort();
    });
    await page.goto("/rate-preview");
    await expect(page.locator(".mid-market-rate-copy > strong")).toHaveText(
      "1 GBP = 1.3241 USD",
    );
    const rates = page.locator(".payment-comparison-fees > span");
    await expect(rates).toHaveText([
      "1 GBP = 1.3241 USD",
      "1 GBP = 1.3042385 USD",
      "1 GBP = 1.2909975 USD",
    ]);
    await expect(page.locator(".payment-comparison-fees > strong")).toHaveText([
      "Fee £132.17",
      "Fee £0.00",
      "Fee £30.96",
    ]);
    await expect(
      page.locator(".payment-comparison-total > strong").first(),
    ).toHaveText("£37,893.67");
    await expect(page.getByText(/Insufficient available/)).toHaveCount(0);
    await expect(page.locator(".mid-market-rate-chart")).toHaveAttribute(
      "data-direction",
      "down",
    );
    await page.getByRole("button", { name: "Refresh exchange rate" }).click();
    await expect(page.locator(".mid-market-rate-copy > strong")).toHaveText(
      "1 GBP = 1.35 USD",
    );
    await expect(
      page.locator(".payment-comparison-total > strong").first(),
    ).toHaveText("£37,166.67");
    await expect(page.locator(".mid-market-rate-chart")).toHaveAttribute(
      "data-direction",
      "up",
    );
    expect(separateFetches).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/payment-rates-${width}.png`,
      fullPage: true,
    });
  });
}
