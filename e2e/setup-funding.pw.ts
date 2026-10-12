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
        import { calculateMove } from '/shared/move-planner.ts';
        import '/src/styles/styles.css';
        import '/src/styles/chat.css';
        import '/src/styles/app-clean.css';
        import '/src/styles/dashboard-visual.css';
        import '/src/styles/dark-mode.css';
        const state = {
          account: { _id: 'student', role: 'Student', aiConsentAt: 1, setupComplete: true, countryFrom: 'China', countryTo: 'China', university: 'Tsinghua University', name: 'Dara', initials: 'D', planName: 'Study', paymentStatus: 'not_started', selectedRoute: '', sponsorRequestSent: false },
          config: { profile: { fundingAmount: 19000, fundingCurrency: 'CNY', workspaceCurrency: 'CNY' } },
          costs: [{ key: 'tuition', name: 'Tuition', category: 'Recurring', amount: 30000, due: 'Soon' }],
          funding: [], sponsors: [], wallets: [], paymentRoutes: [], auditEvents: [], messages: [], notifications: [], checklist: [], sponsorRequests: [], rateAlerts: [], paymentProposals: [], ledgerEntries: []
        };
        let update = () => {};
        convexClient.watchQuery = () => ({ localQueryResult: () => structuredClone(state), onUpdate: (callback) => { update = callback; return () => {}; } });
        convexClient.mutation = async (_ref, args) => {
          if (args.plannerSettings) {
            window.savedMove = args;
            state.config.move = { ...args, arrivalDateISO: args.arrivalDate };
            state.costs = calculateMove(args.budgetAmounts, args.months, args.plannerSettings, args.excludedCosts).breakdown.map((item, index) => ({ ...item, key: 'planner-' + index, category: 'Pre-departure', due: args.arrivalDate }));
            update();
          }
          if (typeof args.fundingAmount === 'number') {
            window.savedFundingAmount = args.fundingAmount;
            state.config.profile.fundingAmount = args.fundingAmount;
            update();
          }
          return null;
        };
        window.updateSavedFunding = (amount) => { state.config.profile.fundingAmount = amount; update(); };
        window.updateSavedCosts = (costs, move) => { state.costs = costs; state.config.move = move; update(); };
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, { onSignOut: () => {} }));
        </script></body></html>`,
      }),
    );
    await page.goto("/funding-preview");
    await expect(page.locator(".section-help-trigger")).toHaveCount(1);
    await expect(
      page
        .locator(".page-help-tools")
        .getByRole("button", { name: "About Dashboard", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "About Dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "About Dashboard", exact: true }),
    ).toContainText("See your funding");
    await page.keyboard.press("Escape");

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
    await page
      .getByRole("spinbutton", {
        name: "Confirmed funding in CNY",
        exact: true,
      })
      .fill("21000");
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
    await expect(
      page.getByRole("spinbutton", {
        name: "Confirmed funding in CNY",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "21000");
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
    // An undeclared budget must not be presented as a completed funding goal.
    await page.evaluate(() => {
      (window as any).updateSavedFunding(19999);
      (window as any).updateSavedCosts([], undefined);
    });
    await expect(page.locator(".funding-amount")).toHaveText(
      "CN¥19,999confirmed funding",
    );
    await expect(page.locator(".funding-progress-label")).toContainText(
      "Budget not set",
    );
    await expect(
      page.getByText("Funding goal reached", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("progressbar", { name: "Study plan funded" }),
    ).toHaveCount(0);
    await expect(page.locator(".donut-total")).toContainText("Budget not set");
    await page
      .getByRole("button", { name: "Set your budget", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Save move plan", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".planner-save-action")).toContainText("Unsaved");
    await expect(
      page.getByRole("button", { name: "Save move plan", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Save move plan", exact: true })
      .click();
    await expect(page.locator(".planner-save-action")).toContainText("Saved");
    expect(
      await page.evaluate(() => (window as any).savedMove.arrivalDate),
    ).toBe("");
    await page
      .getByRole("button", { name: "View dashboard", exact: true })
      .click();
    await expect(page.locator(".funding-amount > span")).toContainText(
      "of CN¥",
    );
    await page.evaluate(() => {
      (window as any).updateSavedCosts(
        [
          {
            key: "tuition",
            name: "Tuition",
            category: "Recurring",
            amount: 15000,
            due: "Soon",
          },
          {
            key: "housing",
            name: "Accommodation",
            category: "Recurring",
            amount: 5500,
            due: "Over 9 months",
          },
          {
            key: "living",
            name: "Living expenses",
            category: "Recurring",
            amount: 2700,
            due: "Over 9 months",
          },
        ],
        {
          months: 9,
          budgetAmounts: { tuition: 15000, rent: 500, monthlyLiving: 300 },
          plannerSettings: {
            university: -1,
            housing: 0,
            flightOption: 0,
            insuranceOption: 0,
            lifestyle: 0,
            depositMonths: 2,
            contingency: 0,
            livingMode: "monthly",
            fundingOption: 0,
            proofOption: 0,
          },
          excludedCosts: [],
        },
      );
      location.hash = "dashboard";
    });
    await expect(page.locator(".funding-amount > span")).toHaveText(
      "of CN¥23,200",
    );
    await expect(page.locator(".funding-gap strong")).toHaveText("CN¥3,201");
    await expect(page.locator(".plan-facts")).toContainText("CN¥800");
    // Declared funding without a savings breakdown cannot establish savings runway.
    await expect(page.locator(".plan-facts")).toContainText("— months");
    await page
      .locator(".budget-funding-grid")
      .screenshot({ path: `/tmp/dashboard-budget-${width}.png` });
    await page.evaluate(() => (window as any).updateSavedFunding(25000));
    await expect(
      page.getByText("Funding goal reached", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Study plan funded" }),
    ).toHaveAttribute("aria-valuenow", "100");
    await page
      .locator(".visual-funding")
      .getByRole("button", { name: "Manage" })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      location.hash = "ai-agent";
    });
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(page.locator(".page-help-tools")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "How the agent works", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".assistant-composer-area")
          .evaluate((el) => el.getBoundingClientRect().bottom - innerHeight),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/assistant-layout-${width}.png` });
    await page.evaluate(() => {
      location.hash = "payments";
    });
    const paymentHeading = page.locator(".payment-workspace-heading");
    const paymentHelp = paymentHeading.getByRole("button", {
      name: "About Payments",
      exact: true,
    });
    await expect(paymentHelp).toBeVisible();
    await expect(page.locator(".page-view > .page-help-tools")).toHaveCount(0);
    const headingBox = await paymentHeading.boundingBox();
    const helpBox = await paymentHelp.boundingBox();
    expect(helpBox!.y).toBeGreaterThanOrEqual(headingBox!.y);
    expect(helpBox!.y + helpBox!.height).toBeLessThanOrEqual(
      headingBox!.y + headingBox!.height + 1,
    );
    await page.screenshot({ path: `/tmp/payment-help-${width}.png` });
  });
}
