import { test, expect } from "@playwright/test";
for (const width of [390, 1440])
  for (const theme of ["light", "dark"]) {
    test(`payment comparison at ${width} in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/comparison-preview", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
        }),
      );
      await page.route("https://api.frankfurter.dev/**", (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify([
            { date: "2026-10-09", base: "USD", quote: "GBP", rate: 0.774 },
            { date: "2026-10-10", base: "USD", quote: "GBP", rate: 0.775 },
          ]),
        }),
      );
      await page.goto("/comparison-preview");
      await expect(
        page.getByRole("combobox", { name: "Pay from", exact: true }),
      ).toContainText("United States");
      await expect(page.locator(".payment-option-score")).toHaveCount(3);
      await expect(page.locator(".tuition-route.selected")).toHaveCSS(
        "box-shadow",
        "none",
      );
      await expect(page.locator(".tuition-route")).toHaveCount(3);
      await expect(
        page
          .locator(".tuition-route-title")
          .filter({ hasText: "Education Platforms" }),
      ).toHaveCount(1);
      await expect(
        page.locator(".tuition-route").first().locator(".payment-route-badges"),
      ).toContainText("Cheapest");
      await expect(
        page.locator(".tuition-route").first().locator(".payment-route-badges"),
      ).toContainText("Fastest");
      await expect(
        page.locator('.tuition-route[data-category="platform"]'),
      ).toHaveCSS("border-left-width", "1px");
      await expect(page.locator(".payment-provider-logo img")).toHaveCount(8);
      await expect
        .poll(() =>
          page
            .locator(".payment-provider-logo img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      const first = page.locator(".tuition-route").first();
      await expect(first.locator(".payment-comparison-fees")).toContainText(
        "Fee $8.40",
      );
      await expect(first.locator(".payment-comparison-total")).toContainText(
        "$2,592.38",
      );
      await page.screenshot({
        path: `/tmp/payment-comparison-${width}-${theme}.png`,
        fullPage: true,
      });
      const amount = page.getByLabel("Tuition amount in GBP", { exact: true });
      await amount.fill("2500.50");
      await expect(amount).toHaveValue("2,500.50");
      await expect(
        page.getByRole("button", { name: "Review payment", exact: true }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Compare", exact: true }).click();
      await expect(page.getByRole("status")).toContainText(
        "Payment options updated",
      );
      await expect(first.locator(".payment-comparison-total")).toContainText(
        "$3,239.03",
      );
      await page
        .getByRole("button", {
          name: "Details for Fintech Provider",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("£2,500.50");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 1440)
        expect(
          await first
            .locator(".tuition-route-summary")
            .evaluate((el) => getComputedStyle(el).display),
        ).toBe("contents");
    });
  }

test("currency controls default to home and travel countries and recalculate options", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.route("**/currency-preview?*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
    }),
  );
  await page.route("https://api.frankfurter.dev/**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/currency-preview?home=China");
  const from = page.getByRole("combobox", { name: "Pay from", exact: true });
  const to = page.getByRole("combobox", { name: "Pay to", exact: true });
  await expect(from).toContainText("China");
  await expect(to).toContainText("United Kingdom");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".payment-comparison-fees").first()).toContainText(
    "CNY",
  );
  await from.click();
  await page.getByRole("option", { name: /United States/ }).click();
  await to.click();
  await page.getByRole("option", { name: /United States/ }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".payment-comparison-fees").first()).toContainText(
    "1 USD = 1.0000 USD",
  );
  const recipientBox = await page
    .locator(".payment-comparison-recipient")
    .boundingBox();
  const barBox = await page.locator(".payment-comparison-bar").boundingBox();
  expect(recipientBox!.y).toBeLessThan(barBox!.y);
  const rateBox = await page
    .locator(".payment-comparison-market-bottom")
    .boundingBox();
  const providersBox = await page.locator(".tuition-route-list").boundingBox();
  expect(rateBox!.y).toBeGreaterThan(providersBox!.y + providersBox!.height);
  await expect(
    page.getByText("Click Compare to update the options for this amount.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "About payment score", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("A score out of 10", { exact: false }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const width of [390, 1440]) {
  test(`receiving currency converts the draft and stays synchronized at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/receive-currency-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/e2e/tuition-preview.tsx"></script></body></html>`,
      }),
    );
    await page.route("https://api.frankfurter.dev/**", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.goto("/receive-currency-preview");
    const currency = page.getByRole("combobox", {
      name: "University receives currency",
      exact: true,
    });
    await page
      .getByRole("spinbutton", { name: "Tuition amount in GBP", exact: true })
      .fill("2500");
    await currency.click();
    await page.getByRole("option", { name: "CNY", exact: true }).click();
    await expect(currency).toContainText("CNY");
    await expect(
      page.getByRole("combobox", { name: "Pay to", exact: true }),
    ).toContainText("China");
    await expect(
      page.getByRole("spinbutton", {
        name: "Tuition amount in CNY",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "23000");
    await expect(
      page.getByRole("button", { name: "Review payment", exact: true }),
    ).toBeDisabled();
    await page.getByRole("combobox", { name: "Pay to", exact: true }).click();
    await page.getByRole("option", { name: /United Kingdom/ }).click();
    await expect(currency).toContainText("GBP");
    await expect(
      page.getByRole("spinbutton", {
        name: "Tuition amount in GBP",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "2500");
    await currency.click();
    await page.getByRole("option", { name: "CNY", exact: true }).click();
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "Payment options updated",
    );
    await expect(currency).toContainText("CNY");
    await expect(
      page.locator(".payment-comparison-fees").first(),
    ).toContainText("CNY");
    await expect(
      page.getByRole("button", { name: "Review payment", exact: true }),
    ).toBeEnabled();
    await page
      .locator(".payment-comparison-bar")
      .screenshot({ path: `/tmp/receiving-currency-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
