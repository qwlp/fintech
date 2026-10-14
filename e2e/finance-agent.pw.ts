import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
test.use({
  video: process.env.RECORD_DEMO === "1" ? "on" : "off",
  viewport: { width: 1440, height: 900 },
});
test("authenticated student completes an approved tuition task", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_FINANCE_SMOKE !== "1",
    "Opt in: creates a fictional account on the configured development deployment.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
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
  await page
    .getByRole("option", { name: "United States", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Destination countries", exact: true })
    .click();
  await page
    .getByRole("option", { name: "United Kingdom", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Universities · optional" }).click();
  await page
    .getByRole("checkbox", { name: "University of Manchester", exact: true })
    .check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Yes, confirm amount" }).click();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Skip tour", exact: true }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("button", { name: "Details for Fintech Provider", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select route and review payment" })
    .click();
  await page.getByRole("button", { name: "Confirm sandbox recipient" }).click();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  if (process.env.RUN_AGENT_SMOKE === "1") {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "AI Agent", exact: true })
      .click();
    await page.getByRole("button", { name: "Enable AI processing" }).click();
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    const chat = page.getByRole("textbox", {
      name: "Message your plan assistant",
    });
    await expect(chat).toBeEnabled();
    await chat.fill(
      "Prepare my tuition payment using my selected route for my review.",
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
      page.getByRole("button", { name: "Approve", exact: true }),
    ).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Recipient and total are correct" })
    .check();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("button", { name: "Send £2,000.00", exact: true })
    .click();
  await expect(page.locator(".pay-success")).toContainText("£2,000.00 sent", {
    timeout: 20000,
  });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Security", exact: true })
    .click();
  await page.getByText("Payment history", { exact: true }).click();
  await page.getByText("View latest payment", { exact: true }).click();
  await expect(
    page.locator(".payment-evidence").getByRole("status"),
  ).toContainText("SBX-");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download payment history" }).click();
  await (await download).saveAs("docs/evidence/development-session.json");
  const evidence = JSON.parse(
    readFileSync("docs/evidence/development-session.json", "utf8"),
  );
  expect(evidence.sandbox).toBe(true);
  expect(evidence.ledger).toHaveLength(1);
  const entry = evidence.ledger[0];
  expect(entry.beforeMinor - entry.afterMinor).toBe(entry.debitMinor);
  expect(entry.receivedMinor).toBe(200000);
  expect(entry.reference).toMatch(/^SBX-/);
  expect(evidence.proposals[0].status).toBe("completed");
  await page.screenshot({
    path: "/tmp/movewise-authenticated-tuition.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const video = page.video();
  await page.close();
  if (process.env.RECORD_DEMO === "1" && video)
    await video.saveAs("docs/evidence/sandbox-demo.webm");
});
