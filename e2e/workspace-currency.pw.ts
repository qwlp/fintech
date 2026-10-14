import { expect, test } from "@playwright/test";
import { countries } from "../shared/study";
import { convertMoney, formatCurrency } from "../shared/currency";
for (const country of countries) {
  test(`payment and wallet currency stay consistent for ${country.currency}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({
      width: country.currency === "KHR" ? 390 : 1440,
      height: 1000,
    });
    await page.route("**/currency-preview?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto(`/currency-preview?currency=${country.currency}`);
    await expect(
      page.getByRole("spinbutton", {
        name: `Tuition amount in ${country.currency}`,
        exact: true,
      }),
    ).toHaveAttribute(
      "aria-valuenow",
      String(convertMoney(2000, "GBP", country.currency)),
    );
    await expect(
      page.getByRole("combobox", { name: "Pay to", exact: true }),
    ).toContainText(country.currency);
    await expect(
      page.locator(".payment-comparison-fees").first(),
    ).toContainText(`1 USD =`);
    await expect(
      page.locator(".payment-comparison-fees").first(),
    ).toContainText(country.currency);
    await page.getByRole("tab", { name: "Balances" }).click();
    await expect(page.locator(".balance-total")).toContainText(
      `Total in ${country.currency}`,
    );
    const equivalent =
      country.currency === "USD"
        ? 5000
        : convertMoney(3870, "GBP", country.currency);
    await expect(page.locator(".balance-total")).toContainText(
      formatCurrency(equivalent, country.currency),
    );
    await expect(page.locator(".balance-account-row")).toContainText("$5,000");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    if (country.currency === "KHR")
      await page.screenshot({
        path: "/tmp/movewise-khr-balances.png",
        fullPage: true,
      });
  });
}

for (const country of countries) {
  test(`move-budget calculations and editable amounts use ${country.currency}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.route("**/currency-budget-preview?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">import "/e2e/currency-budget-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto(`/currency-budget-preview?currency=${country.currency}`);
    const total = 0;
    await expect(
      page.locator(".arrival-summary").locator("strong").first(),
    ).toHaveText(formatCurrency(total, country.currency));
    await page
      .getByRole("button", { name: "Visa package", exact: true })
      .click();
    const visa = page.getByRole("spinbutton", {
      name: `Visa fee in ${country.currency}`,
      exact: true,
    });
    await expect(visa).toHaveValue("0");
    const addition = convertMoney(100, "GBP", country.currency);
    await visa.fill(String(addition));
    await expect(
      page.locator(".arrival-summary").locator("strong").first(),
    ).toHaveText(formatCurrency(addition * 1.1, country.currency));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
