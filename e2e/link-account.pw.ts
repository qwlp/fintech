import { expect, test } from "@playwright/test";
for (const [width, theme] of [
  [1440, "light"],
  [390, "dark"],
] as const) {
  test(`linking bank and card at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.route("**/link-account-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/link-account-preview.tsx";</script></body></html>`,
      }),
    );
    await page.goto("/link-account-preview");
    for (const kind of ["Bank account", "Credit card"]) {
      await page.getByRole("button", { name: "Link bank or card" }).click();
      await page.getByRole("button", { name: kind, exact: true }).click();
      if (kind === "Bank account") {
        await page.getByRole("combobox", { name: "Bank", exact: true }).click();
        await page
          .getByRole("option", { name: "Other bank", exact: true })
          .click();
      }
      const name = page.getByLabel(
        kind === "Bank account" ? "Bank name" : "Card name",
        { exact: true },
      );
      await name.fill("Fail account");
      await page.getByLabel("Last four digits").fill("1234");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText(
        "Live bank connection",
      );
      await page
        .getByRole("button", { name: "Add account", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText("Could not save");
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await name.fill("Study account");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page
        .getByRole("button", { name: "Add account", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Saved as a manual record" }),
      ).toBeVisible();
      await expect(page.locator("output")).toContainText(
        `${kind} · •••• 1234 · Manual`,
      );
      const bounds = await page.getByRole("dialog").boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Link bank or card" }),
      ).toBeFocused();
    }
  });
}
