import { expect, test } from "@playwright/test";

for (const succeeds of [true, false]) {
  test(`chat ${succeeds ? "finishes" : "reports failure"} after navigating away`, async ({
    page,
  }) => {
    await page.route("**/background-chat-preview", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import "/e2e/background-chat-preview.tsx";</script></body></html>`,
      }),
    );
    let finish!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let requests = 0;
    await page.route("**/background-chat-reply", async (route) => {
      requests++;
      await responseGate;
      await route.fulfill({ status: succeeds ? 200 : 500, body: "Done" });
    });
    await page.goto("/background-chat-preview");
    const input = page.getByRole("textbox", {
      name: "Message your plan assistant",
    });
    await input.fill("Update my tuition and rent");
    await input.press("Enter");
    await expect(page.locator(".assistant-thinking")).toBeVisible();
    await page
      .getByRole("button", { name: "Move Planner", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Move Planner" }),
    ).toBeVisible();
    await expect(
      page.getByText("AI working in background", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "AI Agent", exact: true }).click();
    await expect(page.locator(".assistant-thinking")).toBeVisible();
    await expect(input).toBeDisabled();
    await expect(page.locator(".assistant-message.user")).toContainText(
      "Update my tuition and rent",
    );
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    finish();
    await expect(page.getByRole("status")).toContainText(
      succeeds ? "AI reply ready" : "couldn’t be completed",
    );
    await page.getByRole("button", { name: "AI Agent", exact: true }).click();
    await expect(input).toBeEnabled();
    await expect(page.locator(".assistant-thinking")).toHaveCount(0);
    if (succeeds) {
      await expect(page.locator(".assistant-message.agent")).toContainText(
        "Saved your tuition and rent changes.",
      );
    } else {
      await expect(page.locator(".assistant-error")).toContainText(
        "couldn’t be completed",
      );
    }
    expect(requests).toBe(1);
  });
}
