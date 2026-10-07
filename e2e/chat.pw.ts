import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`chat composer and history at ${width}px`, async ({ page }) => {
    page.on("pageerror", error => console.error(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/chat-preview", (route) => route.fulfill({
      contentType: "text/html",
      body: `<html data-theme="light"><body><div id="root"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">
        import "/e2e/chat-preview.tsx";
      </script></body></html>`,
    }));
    await page.goto("/chat-preview");
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(page.locator(".assistant-toolbar").getByRole("button", { name: "How the agent works" })).toBeVisible();
    await expect.poll(() => page.locator(".assistant-composer-area").evaluate(el => el.getBoundingClientRect().bottom - innerHeight)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { name: "Let’s make a plan." })).toBeVisible();
    const input = page.getByRole("textbox", { name: "Message your plan assistant" });
    await page.getByRole("button", { name: "AI privacy settings", exact: true }).click();
    const privacy = page.getByRole("dialog", { name: "AI privacy", exact: true });
    await expect(privacy).toBeVisible();
    await expect(privacy).toContainText("OpenRouter and its model provider");
    await page.screenshot({ path: `/tmp/fintech-ai-privacy-${width}.png` });
    await privacy.getByRole("button", { name: "Disable AI processing", exact: true }).click();
    await expect(privacy).not.toBeVisible();
    await expect(input).toBeDisabled();
    await page.getByRole("button", { name: "AI privacy settings", exact: true }).click();
    await privacy.getByRole("button", { name: "Enable AI processing", exact: true }).click();
    await expect(input).toBeEnabled();
    await page.getByRole("button", { name: "AI privacy settings", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(privacy).not.toBeVisible();

    await input.fill("Explain my gap");
    await input.press("Shift+Enter");
    await input.type("Please");
    await expect(input).toHaveValue("Explain my gap\nPlease");
    await page.screenshot({ path: `/tmp/fintech-chat-${width}.png` });
    await input.press("Enter");
    await expect(page.getByRole("log")).toContainText("Your funding gap is £250.");
    await expect(page.locator(".assistant-markdown strong").first()).toHaveText("£250");
    await page.locator(".agent-calculation summary").click();
    await expect(page.locator(".agent-calculation")).toContainText("£3,483.00");
    await expect(page.locator(".agent-calculation")).toContainText("Hypothetical loss: £387.00");
    await expect(page.locator(".assistant-markdown li")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Review your plan" })).toHaveAttribute("rel", "noopener noreferrer");
    await page.getByRole("button", { name: "New chat", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Let’s make a plan." })).toBeVisible();
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chat history" })).toBeVisible();
    await page.screenshot({ path: `/tmp/fintech-chat-history-${width}.png` });
    await page.getByRole("textbox", { name: "Search conversations" }).fill("does not exist");
    await expect(page.getByRole("heading", { name: "No matching conversations" })).toBeVisible();
    await page.getByRole("textbox", { name: "Search conversations" }).fill("");
    await page.locator(".chat-history-list > button").click();
    await expect(page.getByRole("log")).toContainText("Explain my gap");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(input).toBeInViewport();
    const bottomGap = await page.locator(".assistant-note").evaluate(el => innerHeight - el.getBoundingClientRect().bottom);
    expect(bottomGap).toBeLessThanOrEqual(width <= 800 ? 76 : 12);
  });
}
