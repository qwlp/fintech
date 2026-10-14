import { expect, test } from "@playwright/test";

async function openWorkspace(
  page: import("@playwright/test").Page,
  pending = true,
) {
  await page.route("**/workspace-tour-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import App from '/src/App.tsx';
      import {convexClient} from '/src/lib/convex.ts';
      import {ConvexProvider} from '/node_modules/.vite/deps/convex_react.js';
      import {getFunctionName} from '/node_modules/.vite/deps/convex_server.js';
      import {queueWorkspaceTour} from '/src/lib/workspace-tour.ts';
      import '/src/styles/styles.css';import '/src/styles/app-clean.css';import '/src/styles/chat.css';import '/src/styles/dashboard-visual.css';import '/src/styles/tour.css';import '/src/styles/dark-mode.css';
      const state={account:{_id:'tour-student',role:'Student',setupComplete:true,countryFrom:'China',countryTo:'United Kingdom',university:'University of Manchester',name:'Dara',initials:'D',planName:'Study',paymentStatus:'not_started',selectedRoute:'sandbox-standard',sponsorRequestSent:false},config:{profile:{fundingAmount:1000}},costs:[],funding:[],sponsors:[],wallets:[],paymentRoutes:[],auditEvents:[],messages:[],notifications:[],checklist:[],sponsorRequests:[],rateAlerts:[],paymentProposals:[],ledgerEntries:[]};
      let update=()=>{};window.tourMutations=[];
      convexClient.watchQuery=(ref)=>({localQueryResult:()=>getFunctionName(ref).includes('sponsorLinks')?{links:[],invite:null}:structuredClone(state),onUpdate:cb=>{if(!getFunctionName(ref).includes('sponsorLinks'))update=cb;return()=>{}}});
      convexClient.mutation=async (reference,args)=>{
        const name=getFunctionName(reference);window.tourMutations.push(name);
        if(name.includes('initializePaymentSandbox')){
          state.config.banking={paymentAmount:2000,currency:'GBP',recipient:'University of Manchester',sandbox:true,recipientVerified:false,tuitionDeadline:'2026-12-01',bufferBusinessDays:1};
          state.paymentRoutes=[{key:'sandbox-standard',provider:'Wise',sourceCurrency:'USD',targetCurrency:'GBP',fxRate:.774,fee:8.4,delivery:'1–2 business days',maxBusinessDays:2,quotedAt:Date.now(),quoteExpiresAt:Date.now()+600000}];
          update();
        }
        return null;
      };
      if(${pending} && !localStorage.getItem('movewire-workspace-tour:tour-student'))queueWorkspaceTour('tour-student');
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ConvexProvider,{client:convexClient},React.createElement(App,{onSignOut:()=>{}}))); 
      </script></body></html>`,
    }),
  );
  await page.route("https://api.frankfurter.dev/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/workspace-tour-preview");
}

for (const width of [320, 393, 824, 1440]) {
  test(`new-account tour covers the workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openWorkspace(page);
    const titles = [
      "Your move at a glance",
      "Build your budget",
      "Keep your plan",
      "Keep details current",
      "Compare tuition costs",
      "See your balances",
      "Check exchange costs",
      "Plan support together",
      "Ask about your plan",
      "You stay in control",
    ];
    const tour = page.getByRole("dialog", { name: titles[0] });
    await expect(tour).toBeVisible();
    for (let step = 0; step < titles.length; step++) {
      const card = page.locator(".guide-card");
      await expect(card.getByRole("heading")).toHaveText(titles[step]);
      if (step === 0 && width <= 800) {
        await expect
          .poll(async () => {
            const greeting = await page
              .locator(".consumer-welcome")
              .boundingBox();
            const funding = await page
              .locator(".funding-overview")
              .boundingBox();
            return greeting && funding
              ? funding.y - greeting.y - greeting.height
              : Infinity;
          })
          .toBeLessThanOrEqual(20);
      }
      await expect(
        page.locator(".guide-focus"),
        `Highlight for ${titles[step]}`,
      ).toBeVisible();
      await expect(
        page.locator(".agent-tour-dialog, .assistant-privacy-dialog"),
      ).toHaveCount(0);
      const box = await card.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(852);
      expect(
        await card.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      if (step === 1) {
        await expect
          .poll(async () => {
            const target = await page
              .locator(".move-plan-settings")
              .boundingBox();
            const highlight = await page.locator(".guide-focus").boundingBox();
            if (!target || !highlight) return false;
            const left = Math.max(8, target.x - 5);
            const top = Math.max(8, target.y - 5);
            const right = Math.min(width - 8, target.x + target.width + 5);
            const bottom = Math.min(
              852 - (width <= 800 ? 88 : 8),
              target.y + target.height + 5,
            );
            return (
              Math.abs(highlight.x - left) < 1 &&
              Math.abs(highlight.y - top) < 1 &&
              Math.abs(highlight.width - (right - left)) < 1 &&
              Math.abs(highlight.height - (bottom - top)) < 1
            );
          })
          .toBe(true);
        await card.getByRole("button", { name: "Previous step" }).click();
        await expect(card.getByRole("heading")).toHaveText(titles[0]);
        await card.getByRole("button", { name: "Next", exact: true }).click();
        await expect(card.getByRole("heading")).toHaveText(titles[1]);
      }
      if (step === 8)
        await page.screenshot({ path: `/tmp/workspace-tour-${width}.png` });
      await card
        .getByRole("button", {
          name: step === 9 ? "Start planning" : "Next",
          exact: true,
        })
        .click();
    }
    await expect(page.locator(".guide-card")).toHaveCount(0);
    await expect(page.locator("#move-planner")).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("movewire-workspace-tour:tour-student"),
      ),
    ).toBe("done");
    expect(
      await page.evaluate(() =>
        (window as any).tourMutations.some((name: string) =>
          /prepare|approve|execute/.test(name),
        ),
      ),
    ).toBe(false);
    await page.goto("/workspace-tour-preview");
    await expect(page.locator(".consumer-dashboard")).toBeVisible();
    await expect(page.locator(".guide-card")).toHaveCount(0);
    await page
      .getByRole("button", { name: "About Dashboard", exact: true })
      .click();
    await page
      .locator(".section-help-popover")
      .getByRole("button", { name: "Take a tour", exact: true })
      .click();
    await expect(page.locator(".guide-card")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".guide-card")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("tour can be skipped and stays dismissed", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Skip tour", exact: true }).click();
  await expect(page.locator(".guide-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".consumer-dashboard")).toBeVisible();
  await expect(page.locator(".guide-card")).toHaveCount(0);
});

for (const width of [393, 1440]) {
  test(`sponsor welcome tour at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.route("**/sponsor-tour-preview?*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/e2e/sponsor-preview.tsx"></script></body></html>`,
      }),
    );
    await page.goto("/sponsor-tour-preview?tour=1");
    const titles = [
      "Your support at a glance",
      "Connect with a student",
      "Follow their progress",
      "Review funding requests",
      "Keep track of support",
    ];
    for (let index = 0; index < titles.length; index++) {
      const card = page.locator(".guide-card");
      await expect(card.getByRole("heading")).toHaveText(titles[index]);
      await expect(page.locator(".guide-focus")).toBeVisible();
      const bounds = await card.boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(852);
      await card
        .getByRole("button", {
          name: index === 4 ? "View students" : "Next",
          exact: true,
        })
        .click();
    }
    await expect(page.locator(".guide-card")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("movewire-workspace-tour:tour-sponsor"),
      ),
    ).toBe("done");
    if (width <= 760)
      await page
        .getByRole("button", { name: "Account menu", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Take a tour", exact: true })
      .click();
    await expect(page.locator(".guide-card")).toBeVisible();
    await page.getByRole("button", { name: "Skip tour", exact: true }).click();
  });
}
