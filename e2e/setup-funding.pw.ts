import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`saved setup funding reaches the dashboard and stays reactive at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/funding-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        </script><script type="module">
        import React from '/node_modules/.vite/deps/react.js';
        import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
        import App from '/src/App.tsx';
        import { convexClient } from '/src/lib/convex.ts';
        import '/src/styles.css';
        import '/src/app-clean.css';
        import '/src/dashboard-visual.css';
        import '/src/dark-mode.css';
        const state = {
          account: { _id: 'student', role: 'Student', setupComplete: true, countryFrom: 'China', countryTo: 'China', university: 'Tsinghua University', name: 'Dara', initials: 'D', planName: 'Study', paymentStatus: 'not_started', selectedRoute: '', sponsorRequestSent: false },
          config: { profile: { fundingAmount: 19000, fundingCurrency: 'CNY', workspaceCurrency: 'CNY' } },
          costs: [{ key: 'tuition', name: 'Tuition', category: 'Recurring', amount: 30000, due: 'Soon' }],
          funding: [], sponsors: [], wallets: [], paymentRoutes: [], auditEvents: [], messages: [], notifications: [], checklist: [], sponsorRequests: [], rateAlerts: [], paymentProposals: [], ledgerEntries: []
        };
        let update = () => {};
        convexClient.watchQuery = () => ({ localQueryResult: () => structuredClone(state), onUpdate: (callback) => { update = callback; return () => {}; } });
        convexClient.mutation = async (_ref, args) => {
          if (typeof args.fundingAmount === 'number') {
            window.savedFundingAmount = args.fundingAmount;
            state.config.profile.fundingAmount = args.fundingAmount;
            update();
          }
          return null;
        };
        window.updateSavedFunding = (amount) => { state.config.profile.fundingAmount = amount; update(); };
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, { onSignOut: () => {} }));
        </script></body></html>`,
      }),
    );
    await page.goto("/funding-preview");
    await expect(page.locator(".funding-amount > strong")).toHaveText(
      "CN¥19,000",
    );
    await expect(
      page.getByRole("progressbar", { name: "Study plan funded" }),
    ).toHaveAttribute("aria-valuenow", "63");
    await expect(page.locator(".funding-gap strong")).toHaveText("CN¥11,000");
    await expect(page.locator(".funding-source-list")).toContainText(
      "Confirmed funding",
    );
    await expect(page.locator(".funding-source-list")).toContainText(
      "CN¥19,000",
    );
    await expect(page.locator(".funding-empty")).toHaveCount(0);
    await page.evaluate(() => (window as any).updateSavedFunding(25000));
    await expect(page.locator(".funding-amount > strong")).toHaveText(
      "CN¥25,000",
    );
    await expect(page.locator(".funding-gap strong")).toHaveText("CN¥5,000");
    await expect(page.locator(".funding-source-list")).toContainText(
      "CN¥25,000",
    );
    await page.evaluate(() => (window as any).updateSavedFunding(0));
    await expect(page.locator(".funding-amount > strong")).toHaveText("CN¥0");
    await expect(
      page.getByRole("progressbar", { name: "Study plan funded" }),
    ).toHaveAttribute("aria-valuenow", "0");
    await expect(page.locator(".funding-gap strong")).toHaveText("CN¥30,000");
    await page.reload();
    await expect(page.locator(".funding-amount > strong")).toHaveText(
      "CN¥19,000",
    );
    await page.evaluate(() => {
      location.hash = "profile";
    });
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page.getByLabel("Confirmed funding in CNY").fill("21000");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("CN¥21,000.00");
    await expect(dialog).toContainText("CNY");
    expect(
      await page.evaluate(() => (window as any).savedFundingAmount),
    ).toBeUndefined();
    await dialog.getByRole("button", { name: "Edit amount" }).click();
    await expect(page.getByLabel("Confirmed funding in CNY")).toHaveValue(
      "21000",
    );
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).savedFundingAmount)).toBe(
      21000,
    );
    await page.evaluate(() => {
      location.hash = "dashboard";
    });
    await expect(page.locator(".funding-amount > strong")).toHaveText(
      "CN¥21,000",
    );
  });
}
