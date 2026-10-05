import { expect, test } from "@playwright/test";
for (const width of [1440, 390])
  for (const theme of ["light", "dark"]) {
    test(`tuition decision saves, explains shortfalls and protects proposal terms at ${width}px in ${theme} mode`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/tuition-preview", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">import "/e2e/tuition-preview.tsx";</script></body></html>`,
        }),
      );
      await page.goto("/tuition-preview");
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      await expect(page.getByRole("heading", { name: "Tuition payments", exact: true })).toBeVisible();
      await page.screenshot({ path: `/tmp/payment-workspace-${width}-${theme}.png`, fullPage: true });
      await expect(page.getByLabel("Route recommendation")).toContainText(
        "lowest-cost eligible route",
      );
      await expect(page.locator(".tuition-route").first()).toContainText(
        "$2,592.38",
      );
      await page.locator(".tuition-plan-options summary").click();
      await page.getByRole("button", { name: "Tuition deadline", exact: true }).click();
      await expect(page.locator(".ui-calendar")).toBeVisible();
      await expect(page.locator(".ui-popover")).toHaveCSS("opacity", "1");
      await page.screenshot({ path: `/tmp/tuition-calendar-${width}-${theme}.png` });
      await page.locator(".ui-calendar .rdp-day_button").filter({ hasText: /^20$/ }).first().click();
      await expect(page.locator(".ui-calendar")).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Tuition deadline", exact: true })).toContainText(/20 [A-Za-z]+ \d{4}/);
      await page.getByLabel("Protected living funds in GBP").fill("1500");
      await expect(
        page.getByRole("button", { name: "Choose Sandbox Express" }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Save plan" }).click();
      await expect(page.getByRole("status")).toContainText(
        "Tuition plan saved",
      );
      await page
        .getByRole("button", { name: "Choose Sandbox Express" })
        .click();
      await expect(page.locator(".tuition-route").last()).toContainText(
        "Selected",
      );
      await page
        .getByRole("button", { name: "Simulate funding shortfall" })
        .click();
      await expect(page.getByLabel("Route recommendation")).toContainText(
        "No route currently satisfies all checks",
      );
      for (const summary of await page.locator(".tuition-route-details summary").all()) await summary.click();
      await expect(page.locator(".tuition-funding-gap").first()).toContainText(
        "additional USD",
      );
      await page.getByRole("button", { name: "Expire quotes" }).click();
      await expect(page.locator(".tuition-route").first()).toContainText(
        "Refresh expired or undated quote",
      );
      await page
        .getByRole("button", { name: "Refresh sandbox quotes" })
        .click();
      await expect(page.locator(".tuition-route").first()).not.toContainText(
        "Refresh expired or undated quote",
      );
      await page.screenshot({
        path: `/tmp/movewise-tuition-decision-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Lock proposal" }).click();
      await expect(page.getByLabel("Tuition deadline")).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Refresh sandbox quotes" }),
      ).toBeDisabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("tab", { name: "Cost calculator" }).click();
      await expect(page.getByLabel("Tuition payments", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Route recommendation")).not.toBeVisible();
      await page.getByRole("tab", { name: "Review & pay", exact: true }).click();
      await expect(page.getByRole("tabpanel")).toContainText("Review your saved proposal");
      await page.getByRole("tab", { name: "Activity & receipts" }).click();
      await expect(page.getByRole("tabpanel")).toContainText("No payments yet");
      expect(errors).toEqual([]);
    });
  }
