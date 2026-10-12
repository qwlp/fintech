import { test, expect } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`profile destinations save, cancel and primary conversion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/destination-profile-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module" src="/e2e/destinations-profile-preview.tsx"></script></body></html>`,
      }),
    );
    await page.goto("/destination-profile-preview");
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator(".destination-list")).not.toContainText(
      "United States",
    );
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.locator(".destination-list")).toContainText(
      "United States",
    );
    expect(
      await page.evaluate(() => (window as any).savedProfile.destinations),
    ).toEqual(["United Kingdom", "United States"]);
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Make United States primary", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "University · optional" }),
    ).not.toContainText("University of Manchester");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText("USD");
    await page.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => (window as any).savedProfile.profile.study),
    ).toBe("United States");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
