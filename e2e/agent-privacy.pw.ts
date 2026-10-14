import { expect, test } from "@playwright/test";
test("first-visit privacy and agent introduction open sequentially", async ({
  page,
}) => {
  await page.route("**/agent-privacy-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/e2e/agent-privacy-preview.tsx"></script></body></html>`,
    }),
  );
  await page.goto("/agent-privacy-preview");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText("AI privacy");
  await expect(
    page.getByRole("textbox", {
      name: "Message your plan assistant",
      includeHidden: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Enable AI processing", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText(
    "Meet your MoveWire agent",
  );
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", {
      name: "Message your plan assistant",
      includeHidden: true,
    }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "AI privacy settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Disable AI processing", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", {
      name: "Message your plan assistant",
      includeHidden: true,
    }),
  ).toBeDisabled();
});
