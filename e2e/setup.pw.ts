import { expect, test } from "@playwright/test";

async function openSetup(
  page: import("@playwright/test").Page,
  role = "Student",
  fail = false,
) {
  await page.route("**/setup-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import { ConvexProvider, ConvexReactClient } from '/node_modules/.vite/deps/convex_react.js';
      import Setup from '/src/auth/Setup.tsx';
      import '/src/styles/styles.css'; import '/src/styles/dark-mode.css'; import '/src/components/ui/ui.css';
      const client = new ConvexReactClient('https://setup-test.convex.cloud');
      client.mutation = async (_ref, args) => { ${fail ? "throw new Error('Unavailable');" : "window.savedSetup = args;"} };
      const account = { name: 'Dara Chan', role: '${role}', countryFrom: '', countryTo: '', university: '', course: '', setupComplete: false };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ConvexProvider, {client}, React.createElement(Setup, {account, onDone: () => { document.body.dataset.finished = 'true'; }, onSignOut: () => {}})));
    </script></body></html>`,
    }),
  );
  page.on("pageerror", (error) => console.error(error.message));
  await page.goto("/setup-preview");
}

for (const width of [1440, 390]) {
  test(`student setup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSetup(page);
    await expect(
      page.getByRole("heading", { name: "Where are you headed?" }),
    ).toBeVisible();
    await expect(page.locator(".setup-header")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(page.locator(".setup-header")).toHaveCSS(
      "border-bottom-width",
      "0px",
    );
    await expect(page.locator(".setup-header > button")).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await page.getByRole("combobox", { name: "Home country" }).click();
    await expect(page.getByRole("option")).toHaveCount(3);
    await expect(page.getByRole("option").first()).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await expect(page.locator(".setup-country-menu")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `/tmp/movewise-countries-${width}.png` });
    await page.getByRole("option", { name: "China", exact: true }).click();
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United Kingdom", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "A little about your studies." }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "University · optional" }).click();
    await page
      .getByRole("textbox", { name: "Search universities" })
      .fill("manchester");
    await page
      .getByRole("option", { name: "University of Manchester" })
      .click();
    await page.getByRole("button", { name: "Start date: Choose date" }).click();
    await expect(page.locator(".ui-calendar")).toBeVisible();
    await expect(page.locator(".ui-popover")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `/tmp/movewise-setup-calendar-${width}.png`,
    });
    await page
      .locator(".ui-calendar button[data-day]")
      .filter({ hasText: /^15$/ })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: /^Start date:/ }),
    ).not.toContainText("Choose date");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("combobox", { name: "Home country" }),
    ).toContainText("China");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("combobox", { name: "University · optional" }),
    ).toContainText("University of Manchester");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Confirmed funding (GBP)").fill("12000");
    await page.getByLabel("Sponsor support").selectOption("Yes");
    await expect(
      page.getByRole("heading", { name: "Start with what you have." }),
    ).toBeVisible();
    await expect(page.locator(".setup-card > div").last()).toHaveCSS(
      "opacity",
      "1",
    );
    await page.screenshot({ path: `/tmp/movewise-setup-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Finish setup" }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toContainText(
      "Are you sure this is the amount?",
    );
    await expect(confirmation).toContainText("£12,000.00");
    await expect(confirmation).toContainText("GBP");
    expect(
      await page.evaluate(() => (window as any).savedSetup),
    ).toBeUndefined();
    await confirmation.getByRole("button", { name: "Edit amount" }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(page.getByLabel("Confirmed funding (GBP)")).toHaveAttribute(
      "aria-valuenow",
      "12000",
    );
    await page.getByRole("button", { name: "Finish setup" }).click();
    await page.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(
      page.getByRole("heading", { name: "You’re all set." }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).savedSetup)).toMatchObject(
      {
        countryFrom: "China",
        countryTo: "United Kingdom",
        university: "University of Manchester",
        fundingAmount: 12000,
        sponsorSupport: "Yes",
      },
    );
    await page.getByRole("button", { name: "Open workspace" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-finished", "true");
  });
}
test("sponsor setup and save failure", async ({ page }) => {
  await openSetup(page, "Sponsor", true);
  await page.getByRole("combobox", { name: "Home country" }).click();
  await page.getByRole("option", { name: "China", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready to support." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Couldn’t save. Please try again.",
  );
  await expect(
    page.getByRole("button", { name: "Finish setup" }),
  ).toBeEnabled();
});

test("country search, destination reset and rejection of unlisted universities", async ({
  page,
}) => {
  await openSetup(page);
  await page.getByRole("combobox", { name: "Home country" }).click();
  await page.getByRole("textbox", { name: "Search home country" }).fill("CNY");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("option", { name: "China", exact: true }).click();
  await page
    .getByRole("button", { name: "Destination countries", exact: true })
    .click();
  await page
    .getByRole("option", { name: "United States", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("Study currency: USD.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "University · optional" }).click();
  await page
    .getByRole("textbox", { name: "Search universities" })
    .fill("columbia");
  await page
    .getByRole("textbox", { name: "Search universities" })
    .press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", { name: "University · optional" }),
  ).toContainText("Columbia University");
  await page.getByRole("button", { name: "Back" }).click();
  await page
    .getByRole("button", { name: "Destination countries", exact: true })
    .click();
  await page.getByRole("option", { name: "China", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Make China primary", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("combobox", { name: "University · optional" }),
  ).toContainText("Search for your university");
  await page.getByRole("combobox", { name: "University · optional" }).click();
  await page
    .getByRole("textbox", { name: "Search universities" })
    .fill("My German University");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(
    page.getByText("No matching universities in the approved list."),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search universities" })
    .fill("tsinghua");
  await page
    .getByRole("option", { name: "Tsinghua University", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Yes, confirm amount" }).click();
  expect(await page.evaluate(() => (window as any).savedSetup)).toMatchObject({
    countryTo: "China",
    university: "Tsinghua University",
  });
});

for (const width of [1440, 390]) {
  test(`multiple destinations, keyboard search and primary removal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSetup(page);
    await page.getByRole("combobox", { name: "Home country" }).click();
    await page.getByRole("option", { name: "China", exact: true }).click();
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Search destination countries" })
      .fill("GBP");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Search destination countries" })
      .press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("option", { name: "United Kingdom", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("textbox", { name: "Search destination countries" })
      .fill("USD");
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      page
        .getByRole("list", { name: "Selected destinations" })
        .getByRole("listitem"),
    ).toHaveCount(2);
    await page
      .getByRole("button", { name: "Make United States primary", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove United States", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "United Kingdom is the primary destination",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Remove United Kingdom", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Choose your countries",
    );
    await page
      .getByRole("button", { name: "Destination countries", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United Kingdom", exact: true })
      .click();
    await page
      .getByRole("option", { name: "United States", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: `/tmp/multiple-destinations-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByText("Primary destination: United Kingdom.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Finish setup", exact: true })
      .click();
    await page.getByRole("button", { name: "Yes, confirm amount" }).click();
    await expect(
      page.getByRole("heading", { name: "You’re all set." }),
    ).toBeVisible();
    expect(await page.evaluate(() => (window as any).savedSetup)).toMatchObject(
      {
        countryTo: "United Kingdom",
        countriesTo: ["United Kingdom", "United States"],
      },
    );
  });
}
