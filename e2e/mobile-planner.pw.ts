import { expect, test } from "@playwright/test";
for (const width of [320, 390]) {
  test(`mobile planner shows all categories and compact budget at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/mobile-planner?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/currency-budget-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto(
      `/mobile-planner?currency=${width === 320 ? "KHR" : "CNY"}`,
    );
    const categories = page.locator(".planner-categories");
    await expect(categories.getByRole("button")).toHaveCount(10);
    expect(
      await categories.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await page
        .locator(".arrival-summary")
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThan(300);
    await expect(page.locator(".arrival-summary")).not.toContainText("London");
    const budget = page.locator(".planner-save-bar");
    await budget.scrollIntoViewIfNeeded();
    const budgetBox = await budget.boundingBox();
    const navigationBox = await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .boundingBox();
    expect(budgetBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(budgetBox!.y + budgetBox!.height).toBeLessThanOrEqual(
      navigationBox!.y - 8,
    );
    await expect(
      budget.getByRole("button"),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/movewise-mobile-planner-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: /^Your costs/ }).click();
    await expect(categories).not.toBeVisible();
    await page.getByRole("button", { name: "Back to categories" }).click();
    await page
      .getByRole("button", { name: "Visa package", exact: true })
      .click();
    await expect(page.getByRole("spinbutton").first()).toBeVisible();
    await page.getByRole("button", { name: "Back to categories" }).click();
    await expect(categories).toBeVisible();
    await page.getByRole("button", { name: "Flights", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: /One-way flight/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
