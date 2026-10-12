import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`agent edits and funding confirmation work in ${theme} theme`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: theme === "dark" ? 390 : 1440,
      height: 900,
    });
    await page.route(
      (url) => url.pathname === "/agent-editing-preview",
      (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div>
      <script type="module">
      import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import AgentCalculation from '/src/features/agent/AgentCalculation.tsx';
      import { convexClient } from '/src/lib/convex.ts';
      import '/src/styles/styles.css'; import '/src/styles/chat.css'; import '/src/styles/dark-mode.css';
      const pending = { executionId: 'change1', status: 'pending_confirmation', amount: 22000, currency: 'GBP' };
      let state = { ...pending, status: sessionStorage.getItem('fundingStatus') || pending.status };
      let update = () => {};
      convexClient.watchQuery = () => ({ localQueryResult: () => state, onUpdate: cb => { update = cb; return () => {}; } });
      convexClient.mutation = async (_ref, args) => {
        window.confirmationArgs = args;
        if (window.failSave) throw new Error('Your funding or profile changed. Ask the agent to refresh this change');
        state = { ...state, status: args.confirm ? 'saved' : 'cancelled' };
        sessionStorage.setItem('fundingStatus', state.status); update(); return state;
      };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('main', { style: { padding: '16px', maxWidth: '700px' } },
        React.createElement(AgentCalculation, { tool: { name: 'update_move_plan', result: { status: 'saved', currency: 'GBP', changes: { budgetAmounts: { rent: 900 }, totals: { breakdown: [{ name: 'Rent', amount: 10800 }] } } } } }),
        React.createElement(AgentCalculation, { tool: { name: 'update_profile', result: pending } })
      ));
      </script></body></html>`,
        }),
    );
    await page.goto("/agent-editing-preview");
    await page.getByText("Move Planner · saved").click();
    await expect(page.locator(".agent-saved-changes").first()).toContainText(
      "£900.00",
    );
    await expect(page.locator(".agent-saved-changes").first()).toContainText(
      "£10,800.00",
    );
    await expect(page.locator("main")).not.toContainText("[object Object]");
    await expect(
      page.getByText("This change has not been saved yet."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Review funding amount" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("£22,000.00");
    expect(
      await page.evaluate(() => (window as any).confirmationArgs),
    ).toBeUndefined();
    await dialog.getByRole("button", { name: "Edit amount" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Review funding amount" }).click();
    await page.evaluate(() => {
      (window as any).failSave = true;
    });
    await dialog.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Ask the agent to refresh",
    );
    await expect(
      page.getByText("This change has not been saved yet."),
    ).toBeVisible();
    await page.evaluate(() => {
      (window as any).failSave = false;
    });
    await page.getByRole("button", { name: "Review funding amount" }).click();
    await dialog.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(
      page.getByText("Funding saved", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).confirmationArgs)).toEqual(
      { executionId: "change1", confirm: true },
    );
    await page.reload();
    await expect(
      page.getByText("Funding saved", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review funding amount" }),
    ).toHaveCount(0);
    await page.evaluate(() => sessionStorage.removeItem("fundingStatus"));
    await page.reload();
    await page.getByRole("button", { name: "Discard change" }).click();
    await expect(page.getByText("Funding change discarded")).toBeVisible();
    expect(await page.evaluate(() => (window as any).confirmationArgs)).toEqual(
      { executionId: "change1", confirm: false },
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
  });
}
