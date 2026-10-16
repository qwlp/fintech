import { expect, test } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`home and account entry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Plan your study finances.",
      }),
    ).toBeVisible();
    await page.getByLabel("Annual tuition", { exact: true }).fill("8000");
    await expect(page.locator(".home-budget-results")).toContainText("£20,000");
    await expect(page.locator(".home-budget-results")).toContainText("£8,000");
    await expect(page.locator(".home-intro")).toHaveCSS("opacity", "1");
    await expect(page.locator(".study-globe")).toHaveClass(/is-ready/);
    await page.screenshot({
      path: `/tmp/fintech-home-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Create sponsor account", exact: true })
      .click();
    await expect(page.getByRole("radio", { name: "Sponsor" })).toBeChecked();
    await page.getByLabel("Full name").fill("Test Sponsor");
    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("different123");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "Your passwords do not match.",
    );
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await page.screenshot({
      path: `/tmp/fintech-register-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Plan your study finances.",
      }),
    ).toBeVisible();
  });
}

test("home remains readable with a saved dark theme", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("financial-passport-theme", "dark"),
  );
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const action = page.locator(".home-intro .ui-button");
  await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.screenshot({ path: "/tmp/fintech-home-dark.png", fullPage: true });
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page.locator("#how-it-works")).toBeInViewport();
});

for (const width of [1440, 390]) {
  test(`interactive sample workspace at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const demo = page.locator(".home-showcase-section");
    await demo.scrollIntoViewIfNeeded();
    const screen = (name: string) =>
      width <= 800
        ? demo
            .locator(".demo-sidebar")
            .getByRole("button", { name, exact: true })
        : demo.getByRole("tab", { name, exact: true });
    await screen("Sponsors").click();
    await demo.getByRole("button", { name: "Add sample contribution" }).click();
    await expect(demo.locator(".demo-contribution")).toContainText("£14,000");
    await screen("Study budget").click();
    await expect(demo.locator(".demo-bottom")).toContainText("£4,000");
    await screen("Payments").click();
    await demo.getByRole("button", { name: "Prepare sample payment" }).click();
    await expect(
      demo.getByRole("button", { name: "Sample payment prepared" }),
    ).toBeDisabled();
    await screen("Study budget").click();
    await expect(demo.locator(".demo-bottom")).toContainText("£4,000");
    await page.screenshot({
      path: `/tmp/fintech-showcase-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("light is the default even when the system prefers dark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".home-intro h1")).toHaveCSS(
    "font-family",
    "Geist, sans-serif",
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("600 32px Manrope")),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await expect(page.locator(".auth-story")).toHaveCSS(
    "background-color",
    "rgb(232, 237, 242)",
  );
  await page.screenshot({
    path: "/tmp/fintech-login-light.png",
    fullPage: true,
  });
});

// Opt in because this exercises the configured backend and creates a test account.
test("registration opens the workspace, restores the session, and signs in again", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_AUTH_SMOKE !== "1",
    "Set RUN_AUTH_SMOKE=1 to test real account creation.",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `registration-smoke-${Date.now()}@example.com`;
  const password = "RegistrationSmoke123!";
  await page.goto("/#register-student");
  await page.getByLabel("Full name").fill("Registration Smoke Test");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".setup-page")).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox", { name: "Home country" }).click();
  await page.getByRole("option", { name: "China", exact: true }).click();
  await page
    .getByRole("button", { name: "Destination countries", exact: true })
    .click();
  await page
    .getByRole("option", { name: "United Kingdom", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("heading", { name: "A little about your studies." })
    .waitFor();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("body")).toContainText("Registration Smoke Test");
  await page.reload();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".public-home")).toBeVisible();
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".public-home")).toBeVisible();
});

for (const route of ["#home", "#login", "#register"]) {
  test(`preview autoplays without a toolbar on ${route}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${route}`);
    await page.bringToFront();
    await page.evaluate(() => document.fonts.ready);
    const demo = page.locator(".app-showcase");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toBeInViewport({ ratio: 0.2 });
    await expect(demo.locator(".showcase-controls")).toHaveCount(0);
    await expect(
      page.getByText("Your plan. In motion.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      demo.getByRole("tab", { name: "Sponsors", exact: true }),
    ).toHaveAttribute("aria-selected", "true", { timeout: 25000 });
    // A tab may be observed near the end of its slot; allow a full autoplay cycle.
    await expect(
      demo.getByRole("button", { name: "Contribution added" }),
    ).toBeDisabled({ timeout: 25000 });
    await expect(
      demo.getByRole("tab", { name: "Payments", exact: true }),
    ).toHaveAttribute("aria-selected", "true", { timeout: 25000 });
    await expect(
      demo.getByRole("button", { name: "Sample payment prepared" }),
    ).toBeDisabled({ timeout: 25000 });
    await demo.getByRole("tab", { name: "Study budget", exact: true }).click();
    const slider = demo.getByRole("slider", {
      name: "Sample monthly living costs",
    });
    await slider.focus();
    await slider.press("End");
    await expect(demo.locator(".demo-metrics")).toContainText("£25,800");
    await expect(demo.locator(".demo-bottom")).toContainText("£11,800");
    await page.screenshot({
      path: `/tmp/fintech-preview-${route.slice(1)}.png`,
      fullPage: true,
    });
  });
}

test("country budget currencies and editable controls", async ({ page }) => {
  await page.goto("/");
  const budget = page.locator(".country-budget");
  await budget.scrollIntoViewIfNeeded();
  await expect(budget.locator(".country-budget-panel")).toHaveCSS(
    "display",
    "grid",
  );
  await expect(budget.locator(".country-flag").first()).toHaveCSS(
    "width",
    "28px",
  );
  await expect(budget.locator(".budget-number-actions").first()).toHaveCSS(
    "position",
    "absolute",
  );
  await budget
    .getByRole("button", { name: "Increase annual tuition", exact: true })
    .click();
  await expect(
    budget.getByLabel("Annual tuition", { exact: true }),
  ).toHaveValue("6,500");
  await expect(budget.locator(".home-budget-results")).toContainText("£18,500");
  await budget.getByRole("tab", { name: "United States", exact: true }).click();
  await expect(budget.locator(".home-budget-results")).toContainText(
    "US$36,000",
  );
  await budget.getByRole("tab", { name: "China", exact: true }).click();
  await expect(budget.locator(".home-budget-results")).toContainText(
    "CN¥100,000",
  );
  await budget
    .getByRole("tab", { name: "United Kingdom", exact: true })
    .click();
  await expect(
    budget.getByLabel("Annual tuition", { exact: true }),
  ).toHaveValue("6,500");
  await budget.getByLabel("Confirmed funding", { exact: true }).fill("50000");
  await expect(budget.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(budget.locator(".home-budget-results")).toContainText("£0");
  await budget.screenshot({ path: "/tmp/country-budget-desktop.png" });
});
