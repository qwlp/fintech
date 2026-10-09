import { expect, test } from "@playwright/test";
async function openPreview(page: import("@playwright/test").Page, mode = "") {
  await page.route("**/sponsor-preview?*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
  import RefreshRuntime from "/@react-refresh";
  RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/sponsor-preview.tsx";</script></body></html>`,
    }),
  );
  await page.goto(`/sponsor-preview?mode=${mode}`);
}
for (const width of [1440, 390]) {
  test(`sponsor navigation and actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await openPreview(page);
    const nav = page.getByRole("navigation", {
      name: width > 760 ? "Sponsor navigation" : "Mobile sponsor navigation",
      exact: true,
    });
    await expect(nav).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome back, Sokha." }),
    ).toBeVisible();
    await expect(page.locator(".sd-stats")).toContainText("US$11,627.91");
    // Sponsor accents use the same semantic color as the student workspace.
    expect(
      await page
        .locator(".sd-primary")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(
      await page.locator(".sponsor-shell").evaluate((el) => {
        const marker = document.createElement("span");
        marker.style.color = "var(--ui-primary)";
        el.append(marker);
        const color = getComputedStyle(marker).color;
        marker.remove();
        return color;
      }),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await page.screenshot({
      path: `/tmp/sponsor-overview-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Edit commitment", exact: true })
      .click();
    await page.getByLabel("Annual amount in USD").fill("12000");
    await page
      .getByRole("button", { name: "Save commitment", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Commitment saved");
    await expect(page.locator(".sd-commitment")).toContainText("US$12,000.00");
    await nav.getByRole("button", { name: /Requests/ }).click();
    await expect(page.locator(".sd-request-row")).toHaveCount(1);
    await page.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("US$1,291.99");
    const requestDownload = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download request" }).click();
    expect((await requestDownload).suggestedFilename()).toBe(
      "movewise-funding-request.txt",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Received", exact: true }).click();
    await expect(page.locator(".sd-request-row")).toContainText(
      "Study essentials",
    );
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByLabel("Search funding requests").fill("nothing matches");
    await expect(
      page.getByText("No matching requests", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Search funding requests").fill("Dara");
    await expect(page.locator(".sd-request-row")).toHaveCount(2);
    const exportDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await exportDownload).suggestedFilename()).toBe(
      "movewise-funding-requests.csv",
    );
    await nav.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.locator(".sd-stats")).toContainText("US$300.00");
    await nav.getByRole("button", { name: /Connect/ }).click();
    await expect(page.getByLabel("Invitation code or link")).toBeVisible();
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await page.screenshot({
      path: `/tmp/sponsor-connections-${width}.png`,
      fullPage: true,
    });
    const inviteBox = await page.locator(".sd-invite-card").boundingBox();
    const studentsBox = await page.locator(".sd-linked-students").boundingBox();
    if (width > 1000)
      expect(studentsBox!.x).toBeGreaterThan(inviteBox!.x + inviteBox!.width);
    else
      expect(studentsBox!.y).toBeGreaterThan(inviteBox!.y + inviteBox!.height);

    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await nav.getByRole("button", { name: "Overview", exact: true }).click();
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await page.screenshot({
      path: `/tmp/sponsor-dark-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 760) {
      await page
        .getByRole("button", { name: "Account menu", exact: true })
        .click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
    } else
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/#signed-out$/);
  });
}
test("empty and loading sponsor dashboards", async ({ page }) => {
  await openPreview(page, "empty");
  await expect(
    page.getByText("No students yet", { exact: true }),
  ).toBeVisible();
  await page.locator(".sd-empty-action").click();
  await expect(page.getByLabel("Invitation code or link")).toBeVisible();
  await openPreview(page, "loading");
  await expect(page.getByRole("status")).toContainText("Loading");
});
test("failed commitment save preserves the edit", async ({ page }) => {
  await openPreview(page, "failure");
  await page
    .getByRole("button", { name: "Edit commitment", exact: true })
    .click();
  await page.getByLabel("Annual amount in USD").fill("12000");
  await page
    .getByRole("button", { name: "Save commitment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Could not save");
  await expect(page.getByLabel("Annual amount in USD")).toHaveValue("12000");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".sd-commitment")).toContainText("US$11,627.91");
});

test("sponsor respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPreview(page);
  await expect(page.locator(".sd-page-view")).toHaveCSS("opacity", "1");
  await expect(page.locator(".sd-sidebar")).toHaveCSS("animation-name", "none");
  await page
    .getByRole("navigation", { name: "Sponsor navigation", exact: true })
    .getByRole("button", { name: "Students", exact: true })
    .click();
  await expect(page.locator(".sd-page-view")).toHaveCSS("opacity", "1");
});
