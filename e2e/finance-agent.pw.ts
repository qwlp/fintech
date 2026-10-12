import { expect, test } from "@playwright/test";
test("authenticated student completes an approved tuition task", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_FINANCE_SMOKE !== "1",
    "Opt in: creates a fictional account on the configured development deployment.",
  );
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#register-student");
  await page.getByLabel("Full name").fill("Finance Sandbox Test");
  await page
    .getByLabel("Email address")
    .fill(`finance-sandbox-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("FinanceSandbox123!");
  await page.getByLabel("Confirm password").fill("FinanceSandbox123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".setup-page")).toBeVisible({ timeout: 20000 });
  await page.getByRole("combobox", { name: "Home country" }).click();
  await page.getByRole("option", { name: "Cambodia", exact: true }).click();
  await page
    .getByRole("button", { name: "Destination countries", exact: true })
    .click();
  await page
    .getByRole("option", { name: "United Kingdom", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("University · optional").fill("Example UK University");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20000 });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: "Load payment sandbox" }).click();
  await page
    .getByRole("button", { name: "Review payment", exact: true })
    .click();
  await page
    .getByRole("textbox", {
      name: "Confirm recipient account last four digits",
    })
    .fill("1842");
  await page.getByRole("button", { name: "Confirm sandbox recipient" }).click();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  if (process.env.RUN_AGENT_SMOKE === "1") {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "AI Agent", exact: true })
      .click();
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await page.getByRole("button", { name: "Enable AI processing" }).click();
    const chat = page.getByRole("textbox", {
      name: "Message your plan assistant",
    });
    await expect(chat).toBeEnabled();
    await chat.fill(
      "Compare my tuition payment routes using your comparison tool, then prepare my tuition payment using my selected route for my review. Do not approve or execute it.",
    );
    await chat.press("Enter");
    await expect(page.locator(".assistant-message.agent")).toBeVisible({
      timeout: 120000,
    });
    await expect(page.locator(".assistant-error")).toHaveCount(0);
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Payments", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "PREPARED" }),
    ).toContainText("US$2592.38");
    await page
      .getByRole("button", { name: "Payment demo", exact: true })
      .click();
  } else {
    await page
      .getByRole("button", { name: "Payment demo", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Recipient and total are correct" })
    .check();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Send £2,000", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "COMPLETED" }),
  ).toContainText("SBX-", { timeout: 20000 });
  await expect(page.getByText(/5000\.00 → 2407\.62/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download execution evidence" })
    .click();
  await (await download).saveAs("docs/evidence/development-session.json");
  await page.screenshot({
    path: "/tmp/movewise-authenticated-tuition.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
});
