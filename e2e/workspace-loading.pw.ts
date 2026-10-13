import { expect, test } from "@playwright/test";
for (const fail of [false, true]) {
  test(`opens a legacy workspace when currency migration ${fail ? "fails" : "does not return new metadata"}`, async ({
    page,
  }) => {
    await page.route("**/loading-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import App from '/src/App.tsx';
      import { convexClient } from '/src/lib/convex.ts';
      import '/src/styles/styles.css';
      const state = {
        account: { _id: 'legacy', role: 'Student', setupComplete: true, countryFrom: 'Cambodia', countryTo: 'Canada', university: 'My University', name: 'Legacy Student', initials: 'LS', planName: 'Study', paymentStatus: 'not_started', selectedRoute: '', sponsorRequestSent: false },
        config: { profile: { fundingAmount: 1000, fundingCurrency: 'GBP' } },
        costs: [{ key: 'tuition', name: 'Tuition', category: 'Recurring', amount: 2000, due: 'Soon' }], funding: [], sponsors: [], wallets: [], paymentRoutes: [], auditEvents: [], messages: [], notifications: [], checklist: [], sponsorRequests: [], rateAlerts: [], paymentProposals: [], ledgerEntries: []
      };
      convexClient.watchQuery = () => ({ localQueryResult: () => state, onUpdate: () => () => {} });
      convexClient.mutation = async () => { ${fail ? "throw new Error('Migration unavailable');" : "return null;"} };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, { onSignOut: () => {} }));
      </script></body></html>`,
      }),
    );
    await page.goto("/loading-preview");
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Loading MoveWire…" }),
    ).toHaveCount(0);
    await expect(page.locator(".app-shell")).toContainText("£2,000");
    await expect(page.locator(".app-shell")).not.toContainText("CA$2,000");
  });
}
