import { expect, test } from "@playwright/test";
async function preview(
  page: import("@playwright/test").Page,
  name: string,
  module: string,
) {
  await page.route(`**/${name}`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/${module}.tsx";</script></body></html>`,
    }),
  );
  await page.goto(`/${name}`);
}
for (const width of [320, 390, 768, 1440, 1920]) {
  test(`editable payment flow and nested sections at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await preview(page, "tuition-preview", "tuition-preview");
    if (width >= 1440)
      expect(
        await page
          .locator(".payment-workspace")
          .evaluate((element) => element.getBoundingClientRect().width),
      ).toBeGreaterThan(1100);

    await page.getByRole("button", { name: "Edit tuition details" }).click();
    await page.getByLabel("Tuition amount · GBP").fill("0");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".brief-edit-form")).toBeVisible();
    await page.getByLabel("Tuition amount · GBP").fill("1500.25");
    await page
      .getByRole("combobox", { name: "University / recipient" })
      .click();
    await page
      .getByRole("option", { name: "University of Manchester", exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByLabel("Tuition amount in GBP", { exact: true }),
    ).toHaveValue("2,000");
    await expect(page.locator(".payment-comparison-recipient")).toContainText(
      "King's College London",
    );
    await page.getByRole("button", { name: "Edit tuition details" }).click();
    await page.getByLabel("Tuition amount · GBP").fill("1500.25");
    await page
      .getByRole("combobox", { name: "University / recipient" })
      .click();
    await page
      .getByRole("option", { name: "University of Manchester", exact: true })
      .click();
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".payment-comparison-recipient")).toContainText(
      "University of Manchester",
    );
    await expect(
      page.getByLabel("Tuition amount in GBP", { exact: true }),
    ).toHaveValue("1,500.25");
    await page
      .getByRole("button", {
        name: "Details for Fintech Provider",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toContainText("£1,500.25");
    await page
      .getByRole("button", { name: "About exchange rate" })
      .first()
      .click();
    await expect(page.locator(".brief-popover")).toContainText(
      "not live provider rates",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(".brief-popover")).not.toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.getByRole("tab", { name: "Balances", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Your balances");
    await page.getByRole("tab", { name: "Exchange", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText(
      "Exchange estimates",
    );
    await page.getByRole("tab", { name: "Tuition", exact: true }).click();
    await expect(
      page.getByLabel("Tuition amount in GBP", { exact: true }),
    ).toHaveValue("1,500.25");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
  test(`planner, profile, balances and agent tour at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await preview(page, "brief-preview", "brief-preview");
    const back = page.getByRole("button", { name: "Back to categories" });
    if (await back.isVisible()) await back.click();
    await page.getByRole("button", { name: /^Your costs/ }).click();
    await expect(page.locator(".move-cost-breakdown").first()).toContainText(
      "Accommodation",
    );
    if (await back.isVisible()) await back.click();
    await page
      .getByRole("button", { name: "Visa package", exact: true })
      .click();
    const visa = page.getByRole("spinbutton", {
      name: "Visa fee in GBP",
      exact: true,
    });
    await visa.fill("200");
    await visa.blur();
    if (await back.isVisible()) await back.click();
    await page.getByRole("button", { name: "Flights", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: "One-way flight in GBP" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Budget overview", exact: true })
      .click();
    await expect(page.locator(".move-overview")).toBeVisible();
    await expect(page.locator(".arrival-summary")).toContainText("£30,547");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/planner-organized-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("navigation", { name: "Preview sections" })
      .getByRole("button", { name: "Profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByRole("combobox", { name: "Home country" }).click();
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.locator(".profile-hero")).toContainText("United States");
    await page
      .getByRole("navigation", { name: "Preview sections" })
      .getByRole("button", { name: "Balances", exact: true })
      .click();
    await expect(page.locator(".balance-rate")).toContainText("0.7740 GBP");
    await page
      .getByRole("navigation", { name: "Preview sections" })
      .getByRole("button", { name: "Agent", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("You stay in control");
    const tour = page.getByRole("dialog");
    const bounds = await tour.boundingBox();
    expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(bounds!.y + bounds!.height / 2 - 500)).toBeLessThan(2);
    expect(bounds!.x).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: `/tmp/agent-tour-${width}.png` });
    await page.getByRole("button", { name: "Skip tour" }).click();
    await page
      .getByRole("navigation", { name: "Preview sections" })
      .getByRole("button", { name: "Planner", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Preview sections" })
      .getByRole("button", { name: "Agent", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "How the agent works" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
    if (width <= 768) {
      const bottom = page.getByRole("navigation", {
        name: "Mobile navigation",
      });
      await expect(bottom).toBeVisible();
      await bottom
        .getByRole("button", { name: "Planner", exact: true })
        .click();
      await expect(
        bottom.getByRole("button", { name: "Planner", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(bottom.locator(".mobile-nav-link")).toHaveCount(5);
      await page
        .getByRole("button", { name: "About Move Planner", exact: true })
        .click();
      const help = page.getByRole("dialog", {
        name: "About Move Planner",
        exact: true,
      });
      await expect(help).toContainText("Build your study budget");
      const bounds = await help.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.getByRole("button", { name: "Close section help" }).click();
    }
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `/tmp/movewise-brief-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [390, 1440])
  test(`canonical quote stays identical through review and send at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await preview(page, "quote-flow-preview", "quote-flow-preview");
    const comparison = page
      .locator(".tuition-route")
      .filter({ hasText: "Express" });
    const displayedTotal = (await comparison
      .locator(".payment-comparison-total strong")
      .textContent())!;
    const total = displayedTotal.replace(/^\$/, "US$");
    await page.getByRole("button", { name: "Details for Express" }).click();
    await page
      .getByRole("button", { name: "Select route and review payment" })
      .click();
    await expect(page.locator(".pay-price")).toHaveText(total);
    await page.getByRole("button", { name: "Routes", exact: true }).click();
    await expect(comparison).toHaveClass(/selected/);
    await page.getByRole("button", { name: "Details for Express" }).click();
    await page
      .getByRole("button", { name: "Select route and review payment" })
      .click();
    await expect(page.locator(".pay-price")).toHaveText(total);
    await expect(page.locator(".pay-details")).toContainText(total);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Change provider observation" })
      .click();
    await expect(page.locator(".pay-price")).toHaveText(total);
    await page
      .getByRole("checkbox", { name: "Recipient and total are correct" })
      .check();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByRole("button", { name: "Send £1,500.25" }).click();
    await expect(page.locator(".pay-success")).toContainText("£1,500.25 sent");
    await expect(page.locator(".pay-price")).toHaveText(total);
  });
