import { test, expect } from "@playwright/test";
test("money formatting, whole-unit controls and validation", async ({
  page,
}) => {
  await page.route("**/money-input-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/money-input-preview.tsx";</script></body></html>`,
    }),
  );
  await page.goto("/money-input-preview");
  const input = page.getByLabel("Contribution", { exact: true });
  await expect(input).toHaveValue("1,000.50");
  await input.fill("12345.67");
  await expect(input).toHaveValue("12,345.67");
  await expect(page.locator("output")).toHaveText("12345.67");
  await page
    .getByRole("button", { name: "Increase Contribution by 1" })
    .click();
  await expect(input).toHaveValue("12,346.67");
  await input.press("ArrowDown");
  await expect(input).toHaveValue("12,345.67");
  await input.fill("$2,000.25");
  await expect(input).toHaveValue("2,000.25");
  await input.fill("0");
  expect(
    await input.evaluate((element: HTMLInputElement) =>
      element.checkValidity(),
    ),
  ).toBe(false);
  await input.fill("1000000");
  await expect(
    page.getByRole("button", { name: "Increase Contribution by 1" }),
  ).toBeDisabled();
  expect(
    await input.evaluate((element: HTMLInputElement) =>
      element.checkValidity(),
    ),
  ).toBe(true);
  const numeric = page.getByLabel("Numeric amount", { exact: true });
  await numeric.fill("10");
  await numeric.press("End");
  await numeric.pressSequentially(".50");
  await expect(numeric).toHaveValue("10.50");
});
