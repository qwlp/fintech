import { test, expect } from "@playwright/test";
for (const theme of ["light", "dark"]) {
  test(`university alternatives and living modes work in ${theme} theme`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/move-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/currency-budget-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/move-preview");
    for (const name of [
      "Tsinghua University",
      "King's College London",
      "UCLA",
    ]) {
      await page
        .getByRole("combobox", { name: "University estimates" })
        .click();
      await page.getByRole("option", { name, exact: true }).click();
      await page
        .getByRole("button", { name: "Accommodation", exact: true })
        .click();
      await expect(page.locator(".move-alternatives article")).toHaveCount(4);
      await page
        .getByRole("button", { name: "Use sample estimate" })
        .last()
        .click();
      await expect(
        page.getByRole("button", { name: "Use sample estimate" }).last(),
      ).toHaveAttribute("aria-pressed", "true");
    }
    await page
      .getByRole("button", { name: "Living expenses", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Living expense basis" }).click();
    await page
      .getByRole("option", {
        name: "Monthly living × academic months",
        exact: true,
      })
      .click();
    await page
      .getByRole("spinbutton", { name: "Monthly living in GBP", exact: true })
      .fill("100");
    await page.getByRole("button", { name: "Your costs", exact: true }).click();
    await expect(page.locator(".planner-category-detail")).toContainText(
      "Monthly living: £100",
    );
    await page
      .getByRole("button", { name: "Budget overview", exact: true })
      .click();
    await expect(page.locator(".move-overview")).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `/tmp/move-planner-${theme}.png`,
      fullPage: true,
    });
  });
}
