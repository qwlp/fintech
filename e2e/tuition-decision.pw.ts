import { expect, test } from "@playwright/test";
for (const width of [1440, 390])
  for (const theme of ["light", "dark"]) {
    test(`compact payment plan saves and preserves quote safeguards at ${width}px in ${theme}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/tuition-preview", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/e2e/tuition-preview.tsx"></script></body></html>`,
        }),
      );
      await page.goto("/tuition-preview");
      await expect(page.locator(".tuition-route.selected")).toContainText(
        "Fintech Provider",
      );
      await page.locator(".payment-plan-summary").click();
      await expect(
        page.getByRole("dialog", { name: "Payment plan", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("spinbutton", {
          name: "Protected living funds in GBP",
          exact: true,
        })
        .fill("1500");
      await expect(
        page.getByRole("button", { name: "Save plan", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Save plan", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Payment plan", exact: true }),
      ).toHaveCount(0);
      await expect(page.getByRole("status")).toContainText(
        "Tuition plan saved",
      );
      await page
        .getByRole("button", { name: "Details for Bank & Card", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Select route and review payment" })
        .click();
      await page.getByRole("button", { name: "Routes", exact: true }).click();
      await expect(page.locator(".tuition-route.selected")).toContainText(
        "Bank & Card",
      );
      await page
        .getByRole("button", {
          name: "Simulate funding shortfall",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Details for Fintech Provider",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: "Select route and review payment" }),
      ).toBeDisabled();
      await expect(page.locator(".tuition-funding-gap")).toContainText(
        "additional USD",
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Expire quotes", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Details for Fintech Provider",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        "Refresh expired or undated quote",
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Refresh exchange rate", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Details for Fintech Provider",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).not.toContainText(
        "Refresh expired or undated quote",
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Lock proposal", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Edit tuition details", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Refresh exchange rate",
          exact: true,
        }),
      ).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
