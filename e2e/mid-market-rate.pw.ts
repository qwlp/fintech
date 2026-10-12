import { expect, test, type Page } from "@playwright/test";

async function preview(page: Page, currency = "GBP") {
  await page.route(
    (url) => url.pathname === "/tuition-preview",
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
      }),
  );
  await page.goto(`/tuition-preview?currency=${currency}`);
}

for (const width of [320, 390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`market rate and legacy route names at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("https://api.frankfurter.dev/**", (route) => {
        expect(new URL(route.request().url()).searchParams.get("quotes")).toBe(
          "CNY",
        );
        return route.fulfill({
          json: [
            { date: "2026-10-09", base: "USD", quote: "CNY", rate: 7.12 },
            { date: "2026-10-07", base: "USD", quote: "CNY", rate: 7.05 },
            { date: "2026-10-08", base: "USD", quote: "CNY", rate: 7.1 },
          ],
        });
      });
      await preview(page, "CNY");
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      const card = page.getByRole("complementary", {
        name: "Mid-market exchange rate",
      });
      await expect(card).toContainText("1 USD = 7.12 CNY");
      await expect(card).toContainText("+0.28% vs. 2026-10-08");
      await expect(card).toContainText("Daily reference · 2026-10-09");
      await expect(card.getByRole("img")).toBeVisible();
      await expect(page.locator(".tuition-route-title").first()).toContainText(
        "Fintech Provider",
      );
      await expect(page.locator(".tuition-route-title").nth(1)).toContainText(
        "Education Platforms",
      );
      await expect(page.locator(".tuition-route-title").last()).toContainText(
        "Bank & Card",
      );
      await page
        .getByRole("button", { name: "Details for Fintech Provider" })
        .click();
      await expect(page.getByRole("dialog")).toContainText("7.1208");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.locator(".payment-comparison-market-bottom"),
      ).toBeVisible();
      await expect(page.locator(".payment-market-details")).toHaveCount(0);
      await page.screenshot({
        path: `/tmp/movewise-market-rate-${width}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}

test("failed market requests are recoverable without showing a sandbox rate", async ({
  page,
}) => {
  let failed = true;
  await page.route("https://api.frankfurter.dev/**", (route) =>
    failed
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({
          json: [{ date: "2026-10-09", base: "USD", quote: "GBP", rate: 0.8 }],
        }),
  );
  await preview(page);
  const card = page.getByRole("complementary", {
    name: "Mid-market exchange rate",
  });
  await expect(card).toContainText("Rate unavailable");
  await expect(card).not.toContainText("0.774");
  failed = false;
  await card.getByRole("button", { name: "Retry" }).click();
  await expect(card).toContainText("1 USD = 0.8 GBP");
  await expect(card.getByRole("img")).toHaveCount(0);
});

test("same-currency payments show an identity rate without requesting market data", async ({
  page,
}) => {
  let requested = false;
  await page.route("https://api.frankfurter.dev/**", (route) => {
    requested = true;
    return route.abort();
  });
  await preview(page, "USD");
  await expect(
    page.getByRole("complementary", { name: "Mid-market exchange rate" }),
  ).toContainText("1 USD = 1 USD");
  expect(requested).toBe(false);
});

test("an empty date window falls back to the latest real observation and refresh bypasses the cache", async ({
  page,
}) => {
  let rate = 0.81;
  let latestRequests = 0;
  await page.route("https://api.frankfurter.dev/**", (route) => {
    if (new URL(route.request().url()).searchParams.has("from"))
      return route.fulfill({ json: [] });
    latestRequests++;
    return route.fulfill({
      json: [{ date: "2026-10-09", base: "USD", quote: "GBP", rate }],
    });
  });
  await preview(page);
  const card = page.getByRole("complementary", {
    name: "Mid-market exchange rate",
  });
  await expect(card).toContainText("1 USD = 0.81 GBP");
  rate = 0.82;
  await card
    .getByRole("button", { name: "Refresh exchange rate", exact: true })
    .click();
  await expect(card).toContainText("1 USD = 0.82 GBP");
  expect(latestRequests).toBe(2);
});
