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
      .getByRole("button", { name: "Edit study details", exact: true })
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
      .getByRole("button", { name: "Edit study details", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Universities · optional" }).click();
    await page
      .getByRole("checkbox", { name: "University of Edinburgh" })
      .check();
    await page.getByRole("checkbox", { name: "UCLA", exact: true }).check();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".university-shortlist-items li")).toHaveCount(3);
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
      .getByRole("button", { name: "Edit study details", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Make United States primary", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Universities · optional" }),
    ).toContainText("3 universities selected");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText("USD");
    await page.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(
      page.getByRole("button", { name: "Edit study details", exact: true }),
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

for (const width of [1440, 390]) {
  test(`section editing, unsaved state, errors and account layout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/profile-workflow-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main class="app-clean" style="padding:24px"><div id="root"></div></main><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;import '/src/styles/app-clean.css';</script><script type="module" src="/e2e/destinations-profile-preview.tsx"></script></body></html>`,
      }),
    );
    await page.goto("/profile-workflow-preview");
    const row = page.locator(".linked-account-row");
    await expect(row).toContainText("Bank of America");
    await expect(row).toContainText("•••• 1233");
    const icon = await row.locator(".linked-account-icon").boundingBox();
    const copy = await row.locator(".linked-account-copy").boundingBox();
    expect(copy!.x - icon!.x - icon!.width).toBeLessThanOrEqual(12);
    await page
      .getByRole("button", { name: "Edit funding", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Save profile", exact: true }),
    ).toBeDisabled();
    await expect(page.locator("#profile-name")).toHaveCount(0);
    await page
      .getByRole("spinbutton", {
        name: "Confirmed funding in GBP",
        exact: true,
      })
      .fill("2000");
    await expect(page.locator(".profile-save-bar")).toContainText(
      "Unsaved changes",
    );
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toContainText("£2,000.00");
    await page
      .getByRole("button", { name: "Edit amount", exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator(".profile-funding")).toContainText("£1,000");
    await page
      .getByRole("button", { name: "Edit study details", exact: true })
      .click();
    await expect(page.locator("#profile-funding")).toHaveCount(0);
    await page.locator("#profile-name").fill("Updated Student");
    await page
      .getByRole("button", { name: "Course start", exact: true })
      .click();
    await expect(page.locator(".ui-calendar")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      (window as any).failProfileSave = true;
    });
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Couldn’t save");
    await expect(page.locator("#profile-name")).toHaveValue("Updated Student");
    await page.evaluate(() => {
      (window as any).failProfileSave = false;
    });
    await page.locator("#profile-name").press("Enter");
    await expect(page.locator(".profile-hero")).toContainText(
      "Updated Student",
    );
    await expect(page.locator(".profile-save-bar")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
